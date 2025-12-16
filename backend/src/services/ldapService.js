/**
 * LDAP/Active Directory Authentication Service
 * Handles authentication against corporate Active Directory
 */

const ldap = require('ldapjs');

class LdapService {
    constructor() {
        this.enabled = process.env.LDAP_ENABLED === 'true';
        this.url = process.env.LDAP_URL;
        this.baseDN = process.env.LDAP_BASE_DN;
        this.bindDN = process.env.LDAP_BIND_DN;
        this.bindPassword = process.env.LDAP_BIND_PASSWORD;
        this.userSearchBase = process.env.LDAP_USER_SEARCH_BASE || this.baseDN;
        this.tlsRejectUnauthorized = process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false';
    }

    /**
     * Check if LDAP is enabled
     */
    isEnabled() {
        return this.enabled && this.url && this.bindDN;
    }

    /**
     * Create LDAP client with proper TLS settings
     */
    createClient() {
        const tlsOptions = {
            rejectUnauthorized: this.tlsRejectUnauthorized
        };

        return ldap.createClient({
            url: this.url,
            tlsOptions,
            connectTimeout: 10000,
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
        if (!this.isEnabled()) {
            return { success: false, error: 'LDAP is not enabled' };
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
            client.bind(this.bindDN, this.bindPassword, (bindErr) => {
                if (bindErr) {
                    console.error('[LDAP] Service bind error:', bindErr.message);
                    cleanup();
                    resolve({ success: false, error: 'LDAP service authentication failed' });
                    return;
                }

                // Extract username from email if needed
                const username = email.includes('@') ? email.split('@')[0] : email;

                // Search for the user
                const searchOptions = {
                    scope: 'sub',
                    filter: `(|(userPrincipalName=${email})(sAMAccountName=${username})(mail=${email}))`,
                    attributes: ['dn', 'cn', 'givenName', 'sn', 'mail', 'userPrincipalName', 'sAMAccountName']
                };

                client.search(this.userSearchBase, searchOptions, (searchErr, searchRes) => {
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
            }, 15000);
        });
    }

    /**
     * Test LDAP connection with service account
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async testConnection() {
        if (!this.isEnabled()) {
            return { success: false, error: 'LDAP is not enabled' };
        }

        return new Promise((resolve) => {
            const client = this.createClient();

            client.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            client.bind(this.bindDN, this.bindPassword, (err) => {
                if (err) {
                    resolve({ success: false, error: err.message });
                } else {
                    client.unbind();
                    resolve({ success: true });
                }
            });

            setTimeout(() => {
                resolve({ success: false, error: 'Connection timeout' });
            }, 10000);
        });
    }
}

// Export singleton instance
module.exports = new LdapService();
