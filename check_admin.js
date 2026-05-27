const pool = require('./backend/db/pool');
pool.query("SELECT id, email, first_name, role, status FROM users WHERE role = 'admin' OR role = 'ceylon-track-admin' LIMIT 10")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
