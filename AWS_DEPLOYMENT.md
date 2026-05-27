# AWS Free Tier Deployment Guide — Ceylon Track

## Free Tier Limits
- EC2 t2.micro: 750 hours/month (24/7)
- RDS db.t3.micro PostgreSQL: 750 hours/month + 20GB storage
- Both free for 12 months

---

## Step 1 — Launch EC2 Instance

1. AWS Console → EC2 → Launch Instance
2. AMI: Ubuntu 22.04 LTS (64-bit x86)
3. Instance type: t2.micro
4. Create new key pair (.pem) — download and store securely
5. Network settings:
   - VPC: default
   - Security Group — inbound rules:
     - SSH (22): Your IP only
     - HTTP (80): 0.0.0.0/0
     - HTTPS (443): 0.0.0.0/0
     - Custom TCP (3000): 0.0.0.0/0 (for testing)
6. Storage: 8GB gp2
7. Launch

## Step 2 — Launch RDS PostgreSQL

1. RDS → Create Database → Standard Create → PostgreSQL
2. Template: Free tier
3. DB identifier: `ceylon-track-db`
4. Master username: `postgres`
5. Set a strong master password (save it)
6. Instance: db.t3.micro, 20GB gp2
7. VPC: same as EC2
8. Public access: Yes (for initial setup)
9. Security group: allow port 5432 from EC2's security group
10. Note the **endpoint hostname**

## Step 3 — Set Up EC2 Server

```bash
# SSH into EC2
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx postgresql-client

# Install PM2
sudo npm install -g pm2

# Clone repo
git clone https://github.com/vinura2006/ceylon-track.git
cd ceylon-track
npm install
cd backend && npm install && cd ..

# Create .env
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
DATABASE_URL=postgres://postgres:YOUR_RDS_PASSWORD@YOUR_RDS_ENDPOINT:5432/ceylon_track?sslmode=require
JWT_SECRET=generate_a_random_32_character_secret_here
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Ceylon Track <your_gmail@gmail.com>
CORS_ORIGIN=http://YOUR_EC2_PUBLIC_IP
EOF
```

## Step 4 — Database Setup on RDS

```bash
# Create database and enable PostGIS
psql "postgres://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres" << SQL
CREATE DATABASE ceylon_track;
\c ceylon_track
CREATE EXTENSION IF NOT EXISTS postgis;
SQL

# Run schema
psql "postgres://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/ceylon_track" < database/schema.sql

# Run migrations in order
psql "..." < backend/db/migrations/001_add_sub_role.sql
psql "..." < backend/db/migrations/002_gps_columns.sql
psql "..." < backend/db/migrations/003_camelcase_tables.sql
psql "..." < backend/db/migrations/004_audit_and_indexes.sql

# Run seeds
psql "..." < backend/db/seeds/stations.sql
psql "..." < backend/db/seeds/schedules.sql
psql "..." < backend/db/seeds/stop_times.sql
psql "..." < backend/db/seeds/trip_history.sql
```

## Step 5 — Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/ceylon-track
```

```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ceylon-track /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6 — Start App with PM2

```bash
cd ~/ceylon-track
pm2 start backend/index.js --name ceylon-track
pm2 startup    # run the printed command
pm2 save

# Verify
pm2 status
pm2 logs ceylon-track
```

## Step 7 — Verify Deployment

1. Open `http://YOUR_EC2_PUBLIC_IP` in browser
2. Register a passenger account
3. Login and search schedules
4. Check `/health` returns `{"status":"ok","db":"connected"}`

## Maintenance Tips

- Restart app: `pm2 restart ceylon-track`
- Update code: `git pull && npm install && pm2 restart ceylon-track`
- View logs: `pm2 logs ceylon-track`
- DB backup: use RDS automated backups (enabled by default)
