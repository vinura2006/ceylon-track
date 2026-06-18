# AWS Free Tier Deployment Guide — Ceylon Track 🚂

Deploy Ceylon Track to AWS in ~15 minutes using a single CloudFormation stack.
**Cost: $0** for the first 12 months (free tier).

---

## Free Tier Resources Used

| Resource | Free Tier Allowance | Ceylon Track Usage |
|---|---|---|
| EC2 `t2.micro` | 750 hrs/month | 1 instance (24/7 = 744 hrs) ✅ |
| RDS `db.t3.micro` | 750 hrs/month + 20 GB | 1 instance ✅ |
| Elastic IP | Free when attached | 1 EIP ✅ |
| Data Transfer | 15 GB/month outbound | Low-traffic app ✅ |
| S3 | 5 GB | Not used ✅ |

> **After 12 months:** EC2 t2.micro ~$8.50/month + RDS db.t3.micro ~$12.60/month ≈ **$21/month** total.

---

## Architecture

```
Internet
    │
    ▼  (port 80/443)
EC2 t2.micro  ─── Ubuntu 22.04
  ├── Nginx (reverse proxy)
  └── Node.js 18 + PM2 (port 3000)
         │
         │ (private — SG only)
    ▼  (port 5432)
RDS db.t3.micro ── PostgreSQL 16 + PostGIS
```

All resources live in a custom VPC (`10.0.0.0/16`) with two public subnets across two Availability Zones.

---

## Prerequisites

Before deploying, you need:

1. **AWS Account** — [Sign up free](https://aws.amazon.com/free)
2. **AWS CLI** installed and configured — [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
   ```bash
   aws configure   # enter Access Key, Secret, region (e.g. us-east-1), output format (json)
   ```
3. **EC2 Key Pair** — Create one in AWS Console → EC2 → Key Pairs → Create key pair → download `.pem`
4. **psql** CLI (for running migrations from your laptop, or use the EC2 setup script)

---

## Option A — Deploy with AWS CLI (Recommended)

### Step 1: Clone the repo

```bash
git clone https://github.com/vinura2006/ceylon-track.git
cd ceylon-track
```

### Step 2: Deploy the CloudFormation stack

```bash
aws cloudformation create-stack \
  --stack-name ceylon-track \
  --template-body file://deploy/cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=YOUR_KEY_PAIR_NAME \
    ParameterKey=DBPassword,ParameterValue=YOUR_STRONG_DB_PASSWORD \
    ParameterKey=JWTSecret,ParameterValue=YOUR_JWT_SECRET_MIN_32_CHARS \
    ParameterKey=RefreshTokenSecret,ParameterValue=YOUR_REFRESH_SECRET_MIN_32_CHARS \
    ParameterKey=GPSDeviceToken,ParameterValue=YOUR_GPS_TOKEN_MIN_16_CHARS \
    ParameterKey=StaffAccessCode,ParameterValue=YOUR_STAFF_CODE
```

Replace all `YOUR_*` values before running. Use strong random strings for secrets:
```bash
# Generate secrets (run once per secret):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Wait for stack to complete

```bash
# Watch progress (takes 10-15 minutes — RDS takes longest)
aws cloudformation wait stack-create-complete --stack-name ceylon-track

# Get outputs (public IP, SSH command, etc.)
aws cloudformation describe-stacks --stack-name ceylon-track \
  --query 'Stacks[0].Outputs' --output table
```

### Step 4: Run database migrations

```bash
# Get your EC2 public IP from the outputs above, then:
ssh -i YOUR_KEY_PAIR_NAME.pem ubuntu@YOUR_ELASTIC_IP \
  'bash /home/ubuntu/ceylon-track/deploy/setup.sh'
```

This script will:
- Enable PostGIS extension on RDS
- Apply core schema (`schema.sql`)
- Apply app migrations (refresh tokens, reliability cache, indexes)
- Seed demo data (stations, schedules, sample users)
- Run a health check

### Step 5: Open the app

```
http://YOUR_ELASTIC_IP
```

Check the health endpoint:
```bash
curl http://YOUR_ELASTIC_IP/health
# Expected: {"status":"ok","db":"connected","uptime":...}
```

---

## Option B — Deploy via AWS Console (Manual)

### Step 1: Upload the template

1. AWS Console → CloudFormation → **Create stack** → **With new resources**
2. Select **Upload a template file** → Choose `deploy/cloudformation.yaml`
3. Click **Next**

### Step 2: Fill in parameters

| Parameter | Value |
|---|---|
| Stack name | `ceylon-track` |
| KeyPairName | Your key pair name |
| DBPassword | Strong password (12+ chars, no `/`, `@`, or spaces) |
| JWTSecret | Random string 32+ chars |
| RefreshTokenSecret | Random string 32+ chars |
| GPSDeviceToken | Random string 16+ chars |
| StaffAccessCode | e.g. `SLR-STAFF-2026` |

### Step 3: Acknowledge IAM capabilities

On the review page, check **"I acknowledge that AWS CloudFormation might create IAM resources with custom names"**

### Step 4: Create stack and wait

Monitor the **Events** tab. The stack takes ~10–15 minutes (RDS provisioning is the slow step).

### Step 5: Run migrations

From the **Outputs** tab, copy the `MigrationCommand` value and run it in your terminal.

---

## Default Login Credentials

| Email | Password | Role |
|---|---|---|
| `passenger@ceylon.lk` | `Pass123!` | Passenger |
| `staff@ceylon.lk` | `Staff123!` | Staff |
| `admin@ceylon.lk` | `Admin123!` | Admin |

> ⚠️ **Change these immediately after first login in production.**

---

## Free HTTPS with Let's Encrypt

If you have a domain name pointed to your Elastic IP:

```bash
ssh -i YOUR_KEY.pem ubuntu@YOUR_IP
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
# Follow prompts — auto-renews every 90 days
sudo systemctl status certbot.timer
```

Then update your `.env` CORS_ORIGIN:
```bash
cd ~/ceylon-track
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://yourdomain.com|" .env
pm2 restart ceylon-track
```

---

## PM2 Management Commands

```bash
# SSH into EC2
ssh -i YOUR_KEY.pem ubuntu@YOUR_IP

# App status
pm2 status

# Live logs
pm2 logs ceylon-track

# Restart app
pm2 restart ceylon-track

# Pull latest code and restart
cd ~/ceylon-track
git pull
npm install --omit=dev
cd backend && npm install --omit=dev && cd ..
pm2 restart ceylon-track
```

---

## Updating the App

```bash
ssh -i YOUR_KEY.pem ubuntu@YOUR_IP
cd ~/ceylon-track
git pull origin main
npm install --omit=dev
cd backend && npm install --omit=dev && cd ..
pm2 restart ceylon-track
```

---

## Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `PORT` | Node.js server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | Access token secret (32+ chars) | _(random hex)_ |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_SECRET` | Refresh token secret (32+ chars) | _(random hex)_ |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `GPS_DEVICE_TOKEN` | GPS hardware auth token | _(random hex)_ |
| `STAFF_ACCESS_CODE` | Staff registration code | `SLR-STAFF-2026` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://YOUR_IP` |
| `EMAIL_HOST` | SMTP host (optional) | `smtp.gmail.com` |
| `EMAIL_USER` | SMTP user (optional) | `you@gmail.com` |
| `EMAIL_PASS` | SMTP app password (optional) | _(Gmail app password)_ |

---

## Monitoring & Logs

```bash
# Bootstrap log (UserData output)
sudo tail -f /var/log/ceylon-userdata.log

# PM2 app logs
pm2 logs ceylon-track

# Nginx access/error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL (from EC2 via psql)
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"
```

---

## Troubleshooting

### App not starting
```bash
pm2 logs ceylon-track --lines 100
# Check .env is correct
cat ~/ceylon-track/.env
```

### Can't connect to RDS
```bash
# Test from EC2
psql "$DATABASE_URL" -c "SELECT version();"
# If it fails, check the RDS security group allows port 5432 from EC2's SG
```

### Bootstrap didn't finish
```bash
sudo cat /var/log/ceylon-userdata.log
# If still running, wait a few minutes then check pm2 status
```

### Stack creation failed
```bash
aws cloudformation describe-stack-events \
  --stack-name ceylon-track \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
  --output table
```

---

## Teardown (Delete Everything)

```bash
# This will DELETE all resources (EC2, RDS, VPC, etc.)
# RDS will create a final snapshot before deletion.
aws cloudformation delete-stack --stack-name ceylon-track

# Watch deletion
aws cloudformation wait stack-delete-complete --stack-name ceylon-track
```

---

*© 2026 Ceylon Track — AWS Free Tier Deployment Guide*
