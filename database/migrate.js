const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function run() {
    console.log('Starting Database Migration & Seeding...');
    
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

        const schemaPath = path.join(__dirname, 'schema.sql');
        const seedPath = path.join(__dirname, 'seed.sql');

        console.log('Reading schema.sql...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Running schema.sql...');
        await client.query(schemaSql);
        console.log('Schema created successfully.');

        console.log('Reading seed.sql...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        console.log('Running seed.sql...');
        await client.query(seedSql);
        console.log('Database seeded successfully.');

    } catch (err) {
        console.error('Migration/Seeding failed:', err);
        process.exit(1);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

run();
