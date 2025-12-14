# Viducate Deployment Guide

This guide explains how to deploy Viducate to any Linux server (Raspberry Pi, VPS, Home Server).

## Prerequisites

- A Linux server (Ubuntu/Debian recommended)
- Root/Sudo access
- A valid domain name pointed to your server's IP

## Installation

1.  **Clone the Repository** (if not already done):
    ```bash
    git clone https://github.com/mutkukucuk/viducate.git
    cd viducate
    ```

2.  **Run the Setup Script**:
    The setup script handles dependencies, configuration, and starting the services.
    ```bash
    chmod +x deployment/setup.sh
    ./deployment/setup.sh
    ```

3.  **Follow the Prompts**:
    - The script will ask for your **Domain Name** (e.g., `viducate.example.com`).
    - Review the detected configuration.

4.  **Post-Install Configuration**:
    - Edit `backend/.env` file and change `JWT_SECRET` and other secrets.
    - Restart backend if you change env files:
      ```bash
      pm2 restart viducate-backend
      ```

## Maintenance

- **Update Code**:
  ```bash
  git pull origin main
  ./deployment/setup.sh  # re-run to rebuild and restart
  ```

- **View Logs**:
  ```bash
  pm2 logs viducate-backend
  ```

- **Restart Services**:
  ```bash
  pm2 restart all
  sudo systemctl restart nginx
  ```
