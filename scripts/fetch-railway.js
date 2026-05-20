const fs = require('fs');
const path = require('path');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Overpass query for all railways in Sri Lanka
const query = `
[out:json][timeout:60];
(
  way["railway"="rail"](5.9,79.5,9.9,82.0);
  way["railway"="narrow_gauge"](5.9,79.5,9.9,82.0);
);
out body;
>;
out skel qt;
`;

async function fetchRailwayData() {
    console.log('Fetching railway lines from OpenStreetMap Overpass API...');
    try {
        const response = await fetch(OVERPASS_URL, {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'CeylonTrack/1.0 (vinura2006@ceylontrack.lk; pair-programming-agent)'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Received data from OSM. Elements count: ${data.elements.length}`);

        // Process elements into GeoJSON
        const nodes = {};
        const ways = [];

        data.elements.forEach(el => {
            if (el.type === 'node') {
                nodes[el.id] = [el.lon, el.lat]; // GeoJSON uses [longitude, latitude]
            } else if (el.type === 'way') {
                ways.push(el);
            }
        });

        console.log(`Found ${Object.keys(nodes).length} nodes and ${ways.length} ways.`);

        const geojson = {
            type: 'FeatureCollection',
            features: []
        };

        ways.forEach(way => {
            const coords = way.nodes
                .map(nodeId => nodes[nodeId])
                .filter(coord => coord !== undefined);

            if (coords.length < 2) return;

            geojson.features.push({
                type: 'Feature',
                properties: {
                    id: way.id,
                    railway: way.tags?.railway || 'rail',
                    name: way.tags?.name || '',
                    gauge: way.tags?.gauge || ''
                },
                geometry: {
                    type: 'LineString',
                    coordinates: coords
                }
            });
        });

        const outputPath = path.join(__dirname, '..', 'frontend', 'js', 'srilanka_railway.geojson');
        // Ensure directories exist
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), 'utf8');
        console.log(`Successfully wrote GeoJSON to ${outputPath}`);
        console.log(`Saved ${geojson.features.length} railway line features.`);
    } catch (error) {
        console.error('Error fetching railway data:', error);
        process.exit(1);
    }
}

fetchRailwayData();
