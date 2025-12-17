import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Switch,
    Alert,
    CircularProgress,
    Snackbar,
    Grid
} from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const LdapSettings = () => {
    const { t } = useTranslation();
    const [config, setConfig] = useState({
        ldapBindDn: '',
        ldapEnabled: false,
        ldapBindPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/config/ldap');
            setConfig(prev => ({
                ...prev,
                ...response.data,
                ldapBindPassword: '' // Don't show existing password
            }));
        } catch (error) {
            console.error('Error fetching LDAP config', error);
            setMessage({ type: 'error', text: 'Failed to load LDAP configuration' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const payload = {
                ldapBindDn: config.ldapBindDn,
                ldapEnabled: config.ldapEnabled
            };

            // Only send password if it's changed (not empty)
            if (config.ldapBindPassword) {
                payload.ldapBindPassword = config.ldapBindPassword;
            }

            const response = await axios.post('/api/admin/config/ldap', payload);

            const resMsg = response.data.message;
            const warning = response.data.warning;

            if (warning) {
                setMessage({ type: 'warning', text: `${resMsg}. Warning: ${warning}` });
            } else {
                setMessage({ type: 'success', text: resMsg });
                setConfig(prev => ({ ...prev, ldapBindPassword: '' })); // Clear password field
            }

        } catch (error) {
            console.error('Error saving LDAP config', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update configuration' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {t('admin.settings.ldapTitle', 'Active Directory (LDAP) Configuration')}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    {t('admin.settings.ldapDesc', 'Configure connection to the corporate Active Directory for user authentication.')}
                </Typography>

                {message.text && (
                    <Alert severity={message.type} sx={{ mb: 3 }}>
                        {message.text}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={config.ldapEnabled}
                                    onChange={(e) => setConfig({ ...config, ldapEnabled: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label={t('admin.settings.enableLdap', 'Enable LDAP Authentication')}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label={t('admin.settings.serviceAccountDn', 'Service Account Bind DN')}
                            value={config.ldapBindDn}
                            onChange={(e) => setConfig({ ...config, ldapBindDn: e.target.value })}
                            helperText="e.g. viducate\admin"
                            disabled={!config.ldapEnabled}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="password"
                            label={t('admin.settings.serviceAccountPass', 'Service Account Password')}
                            value={config.ldapBindPassword}
                            onChange={(e) => setConfig({ ...config, ldapBindPassword: e.target.value })}
                            placeholder={t('admin.settings.passPlaceholder', 'Enter new password to update')}
                            helperText={t('admin.settings.passHelper', 'Leave empty to keep current password')}
                            disabled={!config.ldapEnabled}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? t('common.saving', 'Saving...') : t('common.saveChanges', 'Save Configuration')}
                        </Button>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default LdapSettings;
