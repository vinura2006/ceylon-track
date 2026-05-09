const pool = require('./db/pool');

async function test() {
    console.log("Connecting...");
    try {
        const query = `
            SELECT 
                s.id as schedule_id,
                st_from.name as from_station,
                st_to.name as to_station,
                rs_from.distance_from_origin as rs_from_dist,
                rs_to.distance_from_origin as rs_to_dist
            FROM Schedule s
            JOIN Station st_from ON st_from.code = 'FOT'
            JOIN Station st_to ON st_to.code = 'GAL'
            JOIN RouteStation rs_from ON rs_from.route_id = s.route_id AND rs_from.station_id = st_from.id
            JOIN RouteStation rs_to ON rs_to.route_id = s.route_id AND rs_to.station_id = st_to.id
            JOIN ScheduleDays sd ON sd.schedule_id = s.id AND sd.day_of_week = 5
        `;
        const res = await pool.query(query);
        console.log("Rows:", res.rows.length);
        console.log(res.rows);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
test();
