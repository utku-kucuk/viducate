```
const { SystemConfig } = require('../models');
const { encrypt } = require('../utils/encryption');
const ldapService = require('../services/ldapService');

const getLdapConfig = async (req, res) => {
  // Security Check: Only Super Admin can view specific config
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@viducate.local';
  if (req.user.email !== superAdminEmail) {
    return res.status(403).json({ error: 'Access denied. Only Super Admin can view this configuration.' });
  }

  try {
        const configs = await SystemConfig.findAll({
            where: {
                key: ['ldap_bind_dn', 'ldap_enabled']
            }
        });

        // Convert to object
        const configMap = {};
        configs.forEach(c => configMap[c.key] = c.value);

        // Don't return the password!
        res.json({
            ldapBindDn: configMap['ldap_bind_dn'] || process.env.LDAP_BIND_DN,
            ldapEnabled: configMap['ldap_enabled'] === 'true' || (process.env.LDAP_ENABLED === 'true')
        });
    } catch (error) {
        console.error('Error fetching LDAP config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
};

const updateLdapConfig = async (req, res) => {
  // Security Check: Only Super Admin can modify config
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@viducate.local';
  if (req.user.email !== superAdminEmail) {
    return res.status(403).json({ error: 'Access denied. Only Super Admin can modify this configuration.' });
  }

  try {
        const { ldapBindDn, ldapBindPassword, ldapEnabled } = req.body;

        // Update Bind DN
        if (ldapBindDn) {
            await upsertConfig('ldap_bind_dn', ldapBindDn, false, 'LDAP Service Account DN');
        }

        // Update Enabled Status
        if (typeof ldapEnabled !== 'undefined') {
            await upsertConfig('ldap_enabled', String(ldapEnabled), false, 'LDAP Enabled Status');
        }

        // Update Password (Encrypted)
        if (ldapBindPassword) {
            const encryptedPass = encrypt(ldapBindPassword);
            await upsertConfig('ldap_bind_password', encryptedPass, true, 'LDAP Service Account Password');
        }

        // Reload LDAP service config
        await ldapService.reloadConfig();

        // Test connection with new config
        const testResult = await ldapService.testConnection();

        if (testResult.success) {
            res.json({ message: 'Configuration updated and connection verified successfully' });
        } else {
            res.status(200).json({
                message: 'Configuration updated but connection test failed',
                warning: testResult.error
            });
        }

    } catch (error) {
        console.error('Error updating LDAP config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
};

// Helper function to upsert config
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
```
