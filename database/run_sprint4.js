const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function run() {
    console.log('Starting Sprint 4 Migration...');
    
    const client = new Client({
        host:     process.env.DB_HOST     || 'localhost',
        port:     process.env.DB_PORT     || 5432,
        database: process.env.DB_NAME     || 'ceylontrack',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '1234'
    });

    try {
        await client.connect();
        console.log('Connected to database successfully.');

        const schemaPath = path.join(__dirname, 'sprint4_migrations.sql');
        console.log('Reading sprint4_migrations.sql...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Running schema.sql...');
        await client.query(schemaSql);
        console.log('Sprint 4 Migrations created successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

run();
