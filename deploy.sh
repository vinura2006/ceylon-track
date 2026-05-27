#!/bin/bash

# Ceylon Track - Automated AWS Deployment Script (Ubuntu)
# Run this script on your fresh AWS EC2 or Lightsail Ubuntu instance

echo "==========================================="
echo " Starting Ceylon Track Deployment..."
echo "==========================================="

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PostgreSQL & Nginx & Git
sudo apt install -y postgresql postgresql-contrib nginx git

# 4. Configure PostgreSQL (Create user and DB)
sudo -u postgres psql -c "CREATE DATABASE ceylontrack;"
sudo -u postgres psql -c "CREATE USER postgres WITH ENCRYPTED PASSWORD '1234';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ceylontrack TO postgres;"
sudo -u postgres psql -c "ALTER USER postgres WITH SUPERUSER;"

# 5. Clone the repository
cd ~
if [ ! -d "ceylon-track" ]; then
    git clone https://github.com/vinura2006/ceylon-track.git
fi
cd ceylon-track

# 6. Install dependencies
npm install
cd backend && npm install && cd ..

# 7. Create production .env file
cat <<EOT > backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ceylontrack
DB_USER=postgres
DB_PASSWORD=1234
JWT_SECRET=super_secret_production_key_2026
GPS_DEVICE_TOKEN=prod_token_123
CORS_ORIGIN=*
NODE_ENV=production
EOT

# 8. Run Database Migrations and Seed Data
node backend/migrate.js
node database/seed_mock.js || echo "Seed mock might not exist or failed, skipping..."

# 9. Setup PM2 to run Node.js in background
sudo npm install -g pm2
pm2 start backend/index.js --name ceylon-track
pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

# 10. Configure Nginx Reverse Proxy
sudo rm /etc/nginx/sites-enabled/default
cat <<EOT | sudo tee /etc/nginx/sites-available/ceylon-track
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOT
sudo ln -s /etc/nginx/sites-available/ceylon-track /etc/nginx/sites-enabled/
sudo systemctl restart nginx

echo "==========================================="
echo " Deployment Complete! "
echo " Your app is now running on port 80."
echo " Access it via your server's Public IP address."
echo "==========================================="
