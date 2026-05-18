const bcrypt = require('bcryptjs');

async function generate() {
    const pHash = await bcrypt.hash('Pass123!', 10);
    const sHash = await bcrypt.hash('Staff123!', 10);
    const aHash = await bcrypt.hash('Admin123!', 10);

    console.log(`-- Generated Bcrypt Hashes (saltRounds=10):`);
    console.log(`-- Pass123!  -> ${pHash}`);
    console.log(`-- Staff123! -> ${sHash}`);
    console.log(`-- Admin123! -> ${aHash}`);
    console.log(`\nINSERT INTO users (email, password_hash, first_name, last_name, role) VALUES`);
    console.log(`  ('passenger@ceylon.lk', '${pHash}', 'Test', 'Passenger', 'passenger'),`);
    console.log(`  ('staff@ceylon.lk', '${sHash}', 'Station', 'Master', 'staff'),`);
    console.log(`  ('admin@ceylon.lk', '${aHash}', 'System', 'Admin', 'admin');`);
}

generate().catch(console.error);
