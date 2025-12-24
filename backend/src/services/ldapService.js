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

        // Ensure we have binding credentials
        if (!this.config.bindDN || !this.config.bindPassword) {
            return { success: false, error: 'LDAP configuration missing (Bind DN/Password)' };
        }

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

            // First, bind with service account to search for the user
            client.bind(this.config.bindDN, this.config.bindPassword, (bindErr) => {
                if (bindErr) {
                    console.error('[LDAP] Service bind error:', bindErr.message);
                    cleanup();
                    resolve({ success: false, error: 'LDAP service authentication failed' });
                    return;
                }

                // Extract username from email if needed
                const username = email.includes('@') ? email.split('@')[0] : email;

                // Search for the user
                const userSearchBase = this.config.userSearchBase || this.config.baseDN;
                const searchOptions = {
                    scope: 'sub',
                    // Try multiple attributes to be flexible
                    filter: `(|(userPrincipalName=${email})(sAMAccountName=${username})(mail=${email}))`,
                    attributes: ['dn', 'cn', 'givenName', 'sn', 'mail', 'userPrincipalName', 'sAMAccountName']
                };

                client.search(userSearchBase, searchOptions, (searchErr, searchRes) => {
                    if (searchErr) {
                        console.error('[LDAP] Search error:', searchErr.message);
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
                            firstName: attrs.givenName || '',
                            lastName: attrs.sn || '',
                            email: attrs.mail || attrs.userPrincipalName || email,
                            username: attrs.sAMAccountName || username
                        };
                    });

                    searchRes.on('error', (err) => {
                        console.error('[LDAP] Search stream error:', err.message);
                        cleanup();
                        resolve({ success: false, error: 'LDAP search failed' });
                    });

                    searchRes.on('end', () => {
                        if (!userEntry) {
                            console.log('[LDAP] User not found:', email);
                            cleanup();
                            resolve({ success: false, error: 'User not found in Active Directory' });
                            return;
                        }

                        // Now try to bind as the user with their password
                        const userClient = this.createClient();

                        userClient.on('error', () => {
                            cleanup();
                            resolve({ success: false, error: 'LDAP authentication failed' });
                        });

                        userClient.bind(userEntry.dn, password, (userBindErr) => {
                            try {
                                userClient.unbind();
                            } catch (e) {
                                // Ignore
                            }
                            cleanup();

                            if (userBindErr) {
                                console.log('[LDAP] User bind failed for:', email);
                                resolve({ success: false, error: 'Invalid credentials' });
                                return;
                            }

                            console.log('[LDAP] Authentication successful for:', email);
                            resolve({
                                success: true,
                                user: userEntry
                            });
                        });
                    });
                });
            });

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
     * Reload configuration from DB
     */
    async reloadConfig() {
        await this.initialize();
        return this.config;
    }
}

// Export singleton instance
module.exports = new LdapService();
