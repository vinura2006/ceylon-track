# Deploying to Railway.app

## First time setup

1. Push code to GitHub:
   git add .
   git commit -m "feat: ready for production deployment"
   git push origin main

2. Go to railway.app → New Project → Deploy from GitHub repo

3. Add PostgreSQL database:
   Railway dashboard → New → Database → PostgreSQL
   This auto-sets DATABASE_URL in your project

4. Enable PostGIS on your Railway PostgreSQL:
   Railway dashboard → PostgreSQL service → Connect tab → Query tab
   Run: CREATE EXTENSION IF NOT EXISTS postgis;

5. Set environment variables in Railway dashboard:
   NODE_ENV=production
   JWT_SECRET=[generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-app.railway.app
   GPS_DEVICE_TOKEN=[generate with same command]
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your@email.com
   EMAIL_PASS=your_gmail_app_password

6. Run database setup — in Railway shell (or use railway run):
   psql $DATABASE_URL -f database/schema.sql
   psql $DATABASE_URL -f database/new_features_migration.sql
   psql $DATABASE_URL -f database/seed.sql
   psql $DATABASE_URL -f database/seed_timetable.sql

7. Deploy:
   Railway auto-deploys on every git push to main.
   Or manually: Railway dashboard → Deploy

8. Verify deployment:
   CHECK_URL=https://your-app.railway.app node scripts/health-check.js

## Re-deploying after changes
git add . && git commit -m "fix: description" && git push origin main
Railway auto-detects and redeploys in ~2 minutes.

## Checking logs
Railway dashboard → your service → Logs tab
Or: railway logs (with Railway CLI installed)
