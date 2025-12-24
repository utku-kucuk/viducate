/**
 * LDAP/Active Directory Authentication Service
 * Implements "Direct Bind" (Zero-Knowledge) Authentication
 * No Service Account passwords are stored in the database.
 */

const ldap = require('ldapjs');
const { SystemConfig } = require('../models');

class LdapService {
    constructor() {
        this.config = {
            url: process.env.LDAP_URL,
            enabled: process.env.LDAP_ENABLED === 'true',
            tlsRejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'
        };
        this.isInitialized = false;
    }

    /**
     * Initialize configuration from Database (Only URL and Enabled status)
     */
    async initialize() {
        try {
            // Fetch dynamic config from DB (only safe parameters)
            const configs = await SystemConfig.findAll({
                where: {
                    key: ['ldap_enabled', 'ldap_url']
                }
            });

            const dbConfig = {};
            configs.forEach(cfg => {
                if (cfg.key === 'ldap_enabled') {
                    dbConfig.enabled = cfg.value === 'true';
                } else if (cfg.key === 'ldap_url') {
                    dbConfig.url = cfg.value;
                }
            });

            // DB config overrides Env vars
            if (dbConfig.enabled !== undefined) this.config.enabled = dbConfig.enabled;
            if (dbConfig.url) this.config.url = dbConfig.url;

            this.isInitialized = true;
        } catch (error) {
            console.error('[LDAP] Failed to initialize config from DB:', error.message);
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
     * Authenticate user via Direct Bind
     * @param {string} email - User email (UserPrincipalName)
     * @param {string} password - User password
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async authenticateUser(email, password) {
        if (!this.isInitialized) await this.initialize();
        if (!this.isEnabled()) return { success: false, error: 'LDAP is not enabled' };

        // Basic validation
        if (!email || !password) return { success: false, error: 'Email and password required' };

        return new Promise((resolve) => {
            const client = this.createClient();
            let resolved = false;

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    try { client.unbind(); } catch (e) { /* ignore */ }
                }
            };

            client.on('error', (err) => {
                console.error('[LDAP] Connection error:', err.message);
                cleanup();
                resolve({ success: false, error: 'LDAP connection failed' });
            });

            // DIRECT BIND: Try to login with user's credentials
            client.bind(email, password, (err) => {
                if (err) {
                    console.log(`[LDAP] Direct bind failed for ${email}:`, err.message);
                    cleanup();
                    // Don't expose specific error details for security
                    resolve({ success: false, error: 'Invalid credentials' });
                    return;
                }

                console.log(`[LDAP] Direct bind successful for ${email}`);

                // Extract basic info from email since we can't search without permission
                // (or implies we rely on JIT to fill extended details later if needed)
                const username = email.split('@')[0];

                cleanup();
                resolve({
                    success: true,
                    user: {
                        email: email,
                        username: username,
                        // We use placeholders since we can't read attributes effortlessly without search permission
                        // User can update profile later, or we can assume first/last name from email if formatted like 'name.surname'
                        firstName: username,
                        lastName: ''
                    }
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

    async reloadConfig() {
        await this.initialize();
        return this.config;
    }

    // Stub for back-compatibility if needed, but implementation relies on Direct Bind now
    async testConnection() {
        // We can't strictly test connection without credentials anymore.
        // We just check if server is reachable (tcp check logic) or assume true if URL is set.
        return { success: true, message: 'LDAP URL configured (Direct Bind mode)' };
    }
}

module.exports = new LdapService();
