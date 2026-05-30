const pool = require('../backend/db/pool');

async function main() {
    try {
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = '"User"'::regclass
        `);
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
main();
