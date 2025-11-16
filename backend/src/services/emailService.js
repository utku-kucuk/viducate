const { Resend } = require('resend');

// Initialize Resend only if API key is provided
let resend = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_api_key_here') {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend email service initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize Resend:', error.message);
  }
} else {
  console.warn('⚠️  RESEND_API_KEY not configured. Email sending will be disabled.');
}

// Generate a strong random password
// Requirements: length >= 8, includes upper, lower, digit, symbol
const generateStrongPassword = (length = 8) => {
  const crypto = require('crypto');
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{};:,.<>?';
  const all = lowers + uppers + digits + symbols;
  const pick = (charset) => charset[crypto.randomInt(0, charset.length)];
  
  const ensure = [
    pick(lowers),
    pick(uppers),
    pick(digits),
    pick(symbols)
  ];
  
  const remaining = [];
  for (let i = 0; i < Math.max(8, length) - ensure.length; i++) {
    remaining.push(pick(all));
  }
  const chars = ensure.concat(remaining);
  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

// HTML Email Template for credentials
const getCredentialsEmailTemplate = (email, password, loginUrl) => {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Viducate - Hesap Bilgileriniz</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            color: #333;
            margin-bottom: 20px;
        }
        .content {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .credentials {
            background-color: #ffffff;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        .label {
            font-weight: bold;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .value {
            font-size: 16px;
            color: #333;
            word-break: break-all;
            font-family: 'Courier New', monospace;
        }
        .button {
            display: inline-block;
            background-color: #1976d2;
            color: #ffffff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
            text-align: center;
        }
        .button:hover {
            background-color: #1565c0;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
        .security-note {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📚 Viducate</div>
            <h1 class="title">Hesap Bilgileriniz</h1>
        </div>

        <p>Merhaba,</p>
        <p>Viducate platformunda sizin için bir hesap oluşturuldu. Aşağıda giriş bilgileriniz bulunmaktadır:</p>

        <div class="content">
            <div class="credentials">
                <div class="label">E-posta Adresi</div>
                <div class="value">${email}</div>
            </div>
            <div class="credentials">
                <div class="label">Geçici Şifre</div>
                <div class="value">${password}</div>
            </div>
        </div>

        <div class="warning">
            <strong>⚠️ Önemli:</strong> İlk girişinizde şifrenizi değiştirmeniz gerekmektedir. Güvenliğiniz için lütfen bu şifreyi kimseyle paylaşmayın.
        </div>

        <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Giriş Yap</a>
        </div>

        <div class="security-note">
            <strong>🔒 Güvenlik Notu:</strong> Bu e-posta hassas bilgiler içermektedir. Lütfen bu bilgileri kimseyle paylaşmayın ve e-postayı güvenli bir yerde saklayın.
        </div>

        <div class="footer">
            <p>Viducate Eğitim Platformu</p>
            <p>Bu e-posta otomatik olarak oluşturulmuştur.</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Send credentials email
const sendCredentialsEmail = async (email, password, firstName = '') => {
  if (!resend) {
    console.warn('⚠️  Email service not configured. Skipping email send.');
    // Do not throw in test/staging; return a safe no-op response
    return { success: false, skipped: true };
  }

  try {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    const subject = 'Viducate - Hesap Bilgileriniz';
    const html = getCredentialsEmailTemplate(email, password, loginUrl);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Viducate <onboarding@resend.dev>',
      to: email,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('✅ Email sent successfully to:', email);
    return { success: true, data };
  } catch (error) {
    console.error('Error in sendCredentialsEmail:', error);
    
    // Provide more detailed error message
    if (error.statusCode === 403 && error.message?.includes('testing emails')) {
      const detailedError = new Error(
        'Resend test modu aktif: Sadece kayıtlı email adresinize (utkcursor@gmail.com) gönderebilirsiniz. ' +
        'Diğer email adreslerine göndermek için domain doğrulaması yapmanız gerekiyor. ' +
        'Detaylar için RESEND_DOMAIN_SETUP.md dosyasına bakın.'
      );
      detailedError.originalError = error;
      throw detailedError;
    }
    
    throw error;
  }
};

// Send bulk credentials email
const sendBulkCredentialsEmails = async (users) => {
  const results = [];
  for (const user of users) {
    try {
      if (!user.tempPassword || user.tempPassword === 'N/A') {
        results.push({ email: user.email, success: false, error: 'No password provided' });
        continue;
      }
      await sendCredentialsEmail(user.email, user.tempPassword, user.firstName || '');
      results.push({ email: user.email, success: true });
    } catch (error) {
      console.error(`Error sending email to ${user.email}:`, error);
      results.push({ email: user.email, success: false, error: error.message || 'Email send failed' });
    }
  }
  return results;
};

module.exports = {
  generateStrongPassword,
  sendCredentialsEmail,
  sendBulkCredentialsEmails,
};

