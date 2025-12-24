/**
 * LDAP/Active Directory Authentication Service
 * Handles authentication against corporate Active Directory
 */

const ldap = require('ldapjs');
const { SystemConfig } = require('../models');
const { decrypt } = require('../utils/encryption');

class LdapService {
    constructor() {
        this.config = {
            url: process.env.LDAP_URL,
            baseDN: process.env.LDAP_BASE_DN,
            bindDN: process.env.LDAP_BIND_DN,
            bindPassword: process.env.LDAP_BIND_PASSWORD,
            userSearchBase: process.env.LDAP_USER_SEARCH_BASE,
            tlsRejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false',
            enabled: process.env.LDAP_ENABLED === 'true'
        };
        this.isInitialized = false;
    }

    /**
     * Initialize configuration from Database
     */
    async initialize() {
        try {
            // Fetch dynamic config from DB
            const configs = await SystemConfig.findAll({
                where: {
                    key: ['ldap_bind_password', 'ldap_bind_dn', 'ldap_enabled']
                }
            });

            const dbConfig = {};
            configs.forEach(cfg => {
                if (cfg.key === 'ldap_bind_password' && cfg.isEncrypted) {
                    dbConfig.bindPassword = decrypt(cfg.value);
                } else if (cfg.key === 'ldap_bind_dn') {
                    dbConfig.bindDN = cfg.value;
                } else if (cfg.key === 'ldap_enabled') {
                    dbConfig.enabled = cfg.value === 'true';
                }
            });

            // DB config overrides Env vars
            if (dbConfig.bindPassword) this.config.bindPassword = dbConfig.bindPassword;
            if (dbConfig.bindDN) this.config.bindDN = dbConfig.bindDN;
            if (dbConfig.enabled !== undefined) this.config.enabled = dbConfig.enabled;

            this.isInitialized = true;
            // console.log('[LDAP] Connection initialized with dynamic config');
        } catch (error) {
            console.error('[LDAP] Failed to initialize config from DB:', error.message);
            // Fallback to env vars is already set in constructor
        }
    }

    /**
     * Check if LDAP is enabled
     */
    isEnabled() {
        return this.config.enabled && this.config.url;
    }

    /**
     * Create LDAP client with proper TLS settings
     */
    createClient() {
        const tlsOptions = {
            rejectUnauthorized: this.config.tlsRejectUnauthorized
        };

        return ldap.createClient({
            url: this.config.url,
            tlsOptions,
            connectTimeout: 5000,
            timeout: 10000
        });
    }

    /**
     * Authenticate user against Active Directory
     * @param {string} email - User email or username
     * @param {string} password - User password
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async authenticateUser(email, password) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.isEnabled()) {
            return { success: false, error: 'LDAP is not enabled' };
        }

        // Note: We don't block here if bindDN is missing, because we support Direct Bind fallback.

        return new Promise((resolve) => {
            const client = this.createClient();
            let resolved = false;

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    try {
                        client.unbind();
                    } catch (e) {
                        // Ignore unbind errors
                    }
                }
            };

            client.on('error', (err) => {
                console.error('[LDAP] Connection error:', err.message);
                cleanup();
                resolve({ success: false, error: 'LDAP connection failed' });
            });

            client.on('connectError', (err) => {
                console.error('[LDAP] Connect error:', err.message);
                cleanup();
                resolve({ success: false, error: 'LDAP connection failed' });
            });

            // LOGIC: Check if we have a Service Account
            const hasServiceAccount = this.config.bindDN && this.config.bindPassword && this.config.bindPassword !== 'YOUR_PASSWORD_HERE';

            if (hasServiceAccount) {
                // --- STRATEGY 1: SERVICE ACCOUNT (Standard) ---
                // Bind with Admin Service Account -> Search for User -> Verify (Bind) User
                // console.log('[LDAP] Using Service Account for search...');

                client.bind(this.config.bindDN, this.config.bindPassword, (bindErr) => {
                    if (bindErr) {
                        console.error('[LDAP] Service bind error:', bindErr.message);
                        cleanup();
                        resolve({ success: false, error: 'LDAP service authentication failed' });
                        return;
                    }

                    this._searchAndBindUser(client, email, password, resolve, cleanup);
                });

            } else {
                // --- STRATEGY 2: ZERO-KNOWLEDGE (Direct Bind) ---
                // Bind directly with User's credentials -> (Optional) Search self for info
                console.log(`[LDAP] No Service Account configured. Attempting Direct Bind for ${email}...`);

                client.bind(email, password, (bindErr) => {
                    if (bindErr) {
                        console.warn(`[LDAP] Direct bind failed for ${email}: ${bindErr.message}`);
                        cleanup();
                        // Security: Don't reveal specific error details
                        resolve({ success: false, error: 'Invalid email or password.' });
                        return;
                    }

                    // Authentication Successful!
                    // Now try to fetch user details (Self-Search) using their own connection
                    // If AD permissions restrict this, we fallback to email parsing.
                    this._searchAndBindUser(client, email, password, resolve, cleanup, true);
                });
            }

            // Timeout fallback
            setTimeout(() => {
                if (!resolved) {
                    cleanup();
                    resolve({ success: false, error: 'LDAP authentication timeout' });
                }
            }, 10000);
        });
    }

    /**
     * Helper to Search and Verify User (Shared Logic)
     * @param {object} client - Authenticated LDAP client
     * @param {string} email - User email
     * @param {string} password - User password (only needed for double-check in Service Account mode)
     * @param {function} resolve - Promise resolver
     * @param {function} cleanup - Cleanup function
     * @param {boolean} isDirectBind - If true, skip the second password check (since we already bound)
     */
    _searchAndBindUser(client, email, password, resolve, cleanup, isDirectBind = false) {
        // Robust Username Parsing
        let cleanUsername = email;

        if (email.includes('\\')) {
            // Format: DOMAIN\User -> User
            cleanUsername = email.split('\\')[1];
        } else if (email.includes('@')) {
            // Format: User@domain.com -> User
            cleanUsername = email.split('@')[0];
        }

        const userSearchBase = this.config.userSearchBase || this.config.baseDN;

        const searchOptions = {
            scope: 'sub',
            // Search by sAMAccountName (stripping domain) OR userPrincipalName (full email/id)
            filter: `(|(sAMAccountName=${cleanUsername})(userPrincipalName=${email})(mail=${email}))`,
            attributes: ['dn', 'cn', 'givenName', 'sn', 'mail', 'userPrincipalName', 'sAMAccountName']
        };

        // console.log(`[LDAP] Searching user with sAMAccountName=${cleanUsername} or UPN=${email}`);

        client.search(userSearchBase, searchOptions, (searchErr, searchRes) => {
            if (searchErr) {
                console.error('[LDAP] Search error:', searchErr.message);
                // If Direct Bind mode, search failure is acceptable (permissions), just return basic user
                if (isDirectBind) {
                    console.warn('[LDAP] Could not fetch details. Returning basic profile.');
                    cleanup();
                    resolve({
                        success: true,
                        user: {
                            email: email,
                            username: cleanUsername,
                            firstName: cleanUsername,
                            lastName: ''
                        }
                    });
                    return;
                }

                cleanup();
                resolve({ success: false, error: 'LDAP user search failed' });
                return;
            }

            let userEntry = null;

            searchRes.on('searchEntry', (entry) => {
                const attrs = {};
                entry.attributes.forEach(attr => {
                    attrs[attr.type] = attr.values[0];
                });

                userEntry = {
                    dn: entry.dn.toString(),
                    firstName: attrs.givenName || cleanUsername, // Fallback to username
                    lastName: attrs.sn || '',
                    // Important: If we found a real email, use it! Otherwise fallback to input.
                    email: (attrs.mail || attrs.userPrincipalName || email).toLowerCase(),
                    username: attrs.sAMAccountName || cleanUsername
                };
            });

            searchRes.on('error', (err) => {
                console.error('[LDAP] Search stream error:', err.message);
                if (isDirectBind && !userEntry) {
                    cleanup();
                    // Fallback success for Direct Bind
                    resolve({ success: true, user: { email, username: cleanUsername, firstName: cleanUsername, lastName: '' } });
                } else {
                    cleanup();
                    resolve({ success: false, error: 'LDAP search failed' });
                }
            });

            searchRes.on('end', () => {
                if (!userEntry) {
                    if (isDirectBind) {
                        // User exists (bound successfully) but wasn't found in search scope or permission issue
                        // Still return success because authentication passed
                        cleanup();
                        resolve({ success: true, user: { email, username: cleanUsername, firstName: cleanUsername, lastName: '' } });
                    } else {
                        console.log('[LDAP] User not found during search:', email);
                        cleanup();
                        resolve({ success: false, error: 'User not found in Active Directory' });
                    }
                    return;
                }

                // If we are in Service Account mode, we must NOW verify the user's password
                // by attempting to bind AS THE USER.
                if (!isDirectBind) {
                    const userClient = this.createClient();

                    userClient.on('error', () => { }); // Suppress async errors

                    userClient.bind(userEntry.dn, password, (userBindErr) => {
                        try { userClient.unbind(); } catch (e) { }

                        cleanup();

                        if (userBindErr) {
                            console.log('[LDAP] User password verification failed for:', email);
                            resolve({ success: false, error: 'Invalid credentials' });
                        } else {
                            console.log('[LDAP] Auth successful (Service Mode) for:', email);
                            resolve({ success: true, user: userEntry });
                        }
                    });
                } else {
                    // Direct Bind mode: We already verified password in the first bind.
                    cleanup();
                    console.log('[LDAP] Auth successful (Direct Mode) for:', email);
                    resolve({ success: true, user: userEntry });
                }
            });
        });
    }

    /**
     * Reload configuration from DB
     */
    async reloadConfig() {
        await this.initialize();
        return this.config;
    }
}

// Export singleton instance
module.exports = new LdapService();
