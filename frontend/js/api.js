const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://ceylon-track.up.railway.app';

async function apiGet(endpoint) {
  const token = localStorage.getItem('ceylontrack_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const response = await fetch(API_BASE + endpoint, { headers });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function apiPost(endpoint, body) {
  const token = localStorage.getItem('ceylontrack_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const response = await fetch(API_BASE + endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
