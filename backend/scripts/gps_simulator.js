const axios = require('axios'); // Note: if axios is not installed, we can use built-in fetch or http. I'll use fetch since Node 18+ has it built-in. Wait, Node version? Let's use fetch.
require('dotenv').config({ path: __dirname + '/../.env' });

const API_URL = 'http://localhost:3000/api/gps/update';
const TOKEN = process.env.GPS_DEVICE_TOKEN;
const TRAIN_ID = 1; // Udarata Menike

// Colombo to Kandy waypoints
const waypoints = [
    { lat: 6.9338, lng: 79.8500, name: 'Colombo Fort' },
    { lat: 6.9412, lng: 79.8715, name: 'Maradana' },
    { lat: 6.9806, lng: 79.9272, name: 'Kelaniya' },
    { lat: 7.0202, lng: 79.9922, name: 'Ragama' },
    { lat: 7.0917, lng: 80.0006, name: 'Gampaha' },
    { lat: 7.1517, lng: 80.0558, name: 'Veyangoda' },
    { lat: 7.2301, lng: 80.1472, name: 'Mirigama' },
    { lat: 7.2586, lng: 80.2644, name: 'Polgahawela' },
    { lat: 7.2646, lng: 80.4633, name: 'Rambukkana' },
    { lat: 7.2654, lng: 80.5956, name: 'Kadugannawa' },
    { lat: 7.2906, lng: 80.6337, name: 'Kandy' }
];

// Interpolation configuration
const STEPS_PER_WAYPOINT = 5; 
let currentWaypointIdx = 0;
let currentStep = 0;

async function sendGpsUpdate(lat, lng, speed) {
    try {
        const payload = {
            train_id: TRAIN_ID,
            latitude: lat,
            longitude: lng,
            speed_kmh: speed,
            device_token: TOKEN
        };

        // If node fetch is not available we can fallback to http module, but let's assume node 18+
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`Failed to update GPS: ${response.status} - ${err}`);
        } else {
            console.log(`[${new Date().toISOString()}] 🚂 GPS Updated | Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} | Speed: ${speed} km/h`);
        }
    } catch (error) {
        console.error('Network error sending GPS update:', error.message);
    }
}

function simulate() {
    const start = waypoints[currentWaypointIdx];
    const end = waypoints[(currentWaypointIdx + 1) % waypoints.length];

    if (currentWaypointIdx === waypoints.length - 1) {
        console.log('🏁 Reached Kandy! Looping back to Colombo Fort...');
        currentWaypointIdx = 0;
        currentStep = 0;
        setTimeout(simulate, 10000);
        return;
    }

    if (currentStep === 0) {
        console.log(`\n🚉 Departing: ${start.name} -> ${end.name}`);
    }

    // Interpolate
    const fraction = currentStep / STEPS_PER_WAYPOINT;
    const currentLat = start.lat + (end.lat - start.lat) * fraction;
    const currentLng = start.lng + (end.lng - start.lng) * fraction;
    
    // Simulate speed variation
    const speed = Math.floor(Math.random() * (80 - 60 + 1) + 60);

    sendGpsUpdate(currentLat, currentLng, speed);

    currentStep++;
    if (currentStep >= STEPS_PER_WAYPOINT) {
        currentStep = 0;
        currentWaypointIdx++;
    }

    // Every 10 seconds
    setTimeout(simulate, 10000);
}

console.log('=============================================');
console.log('🚂 Ceylon Track - GPS Simulator Started');
console.log(`Route: Colombo Fort to Kandy (10 waypoints)`);
console.log(`Train ID: ${TRAIN_ID}`);
console.log('=============================================');

// Start simulation
simulate();
