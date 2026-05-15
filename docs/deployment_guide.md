# Ceylon Track Deployment Guide

## Backend — Railway.app
1. Create account at railway.app
2. Click New Project → Deploy from GitHub repo
3. Select the ceylon-track repository
4. Railway auto-detects Node.js and uses the Procfile
5. Click Add Plugin → PostgreSQL
6. Copy the DATABASE_URL from the PostgreSQL plugin settings
7. Go to Variables tab and add all variables from .env.example
8. Railway automatically deploys — note the generated URL

## Database Setup on Railway
1. Click the PostgreSQL plugin → Connect tab
2. Copy the connection command
3. Run: railway run psql < database/schema.sql
4. Run: railway run psql < database/seed.sql

## Frontend — Netlify
1. Create account at netlify.com
2. Drag and drop the frontend folder
3. Update API_BASE in frontend/js/api.js to your Railway URL
4. Redeploy by dragging the updated frontend folder
