const { SystemConfig } = require('../models');
const { encrypt } = require('../utils/encryption');
const ldapService = require('../services/ldapService');

const getLdapConfig = async (req, res) => {
    // Security Check
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@viducate.local';
    if (req.user.email !== superAdminEmail) {
        return res.status(403).json({ error: 'Access denied.' });
    }

    try {
        const configs = await SystemConfig.findAll({
            where: {
                key: ['ldap_enabled', 'ldap_url']
            }
        });

        const configMap = {};
        configs.forEach(c => configMap[c.key] = c.value);

        res.json({
            ldapEnabled: configMap['ldap_enabled'] === 'true' || (process.env.LDAP_ENABLED === 'true'),
            ldapUrl: configMap['ldap_url'] || process.env.LDAP_URL
        });
    } catch (error) {
        console.error('Error fetching LDAP config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
};

const updateLdapConfig = async (req, res) => {
    // Security Check
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@viducate.local';
    if (req.user.email !== superAdminEmail) {
        return res.status(403).json({ error: 'Access denied.' });
    }

    try {
        const { ldapEnabled, ldapUrl } = req.body;

        if (typeof ldapEnabled !== 'undefined') {
            await upsertConfig('ldap_enabled', String(ldapEnabled), false, 'LDAP Enabled Status');
        }

        if (ldapUrl) {
            await upsertConfig('ldap_url', ldapUrl, false, 'LDAP Server URL');
        }

        // Reload LDAP service config
        await ldapService.reloadConfig();

        res.json({ message: 'Configuration updated successfully (Direct Bind Mode)' });
    } catch (error) {
        console.error('Error updating LDAP config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
};

async function upsertConfig(key, value, isEncrypted, description) {
    const config = await SystemConfig.findOne({ where: { key } });
    if (config) {
        await config.update({ value, isEncrypted, description });
    } else {
        await SystemConfig.create({ key, value, isEncrypted, description });
    }
}

module.exports = {
    getLdapConfig,
    updateLdapConfig
};
