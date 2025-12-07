module.exports = {
  apps: [
    {
      name: 'viducate-backend',
      script: 'backend/src/server.js',
      cwd: '/home/pi/viducate',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: '/home/pi/logs/viducate-backend-error.log',
      out_file: '/home/pi/logs/viducate-backend-out.log',
      log_file: '/home/pi/logs/viducate-backend.log',
      merge_logs: true,
      time: true
    }
  ]
};
