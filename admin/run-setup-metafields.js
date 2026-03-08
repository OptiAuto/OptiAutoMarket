/* One-off: login + call /api/setup-metafields. Run from admin/ with: node run-setup-metafields.js */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = require('node-fetch');

const BASE = 'http://127.0.0.1:3000';
const PASSWORD = process.env.ADMIN_PASSWORD || 'optiauto2026';

async function run() {
  const loginRes = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const loginJson = await loginRes.json();
  if (!loginJson.token) {
    console.error('Login failed:', loginJson);
    process.exit(1);
  }
  const setupRes = await fetch(`${BASE}/api/setup-metafields`, {
    headers: { Authorization: 'Bearer ' + loginJson.token },
  });
  const setupJson = await setupRes.json();
  console.log(JSON.stringify(setupJson, null, 2));
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
