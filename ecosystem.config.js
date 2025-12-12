const path = require('path');
const fs = require('fs');

// Load .env file manually
function loadEnvFile() {
  const envPath = path.join(__dirname, 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return envVars;
  }
  return {};
}

const envVars = loadEnvFile();

module.exports = {
  apps: [
    {
      name: 'viducate-backend',
      script: 'backend/src/server.js',
      cwd: '/home/utku/viducate',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        ...envVars // Spread all env variables from .env file
      },
      error_file: '/home/utku/logs/viducate-backend-error.log',
      out_file: '/home/utku/logs/viducate-backend-out.log',
      log_file: '/home/utku/logs/viducate-backend.log',
      merge_logs: true,
      time: true
    }
  ]
};
