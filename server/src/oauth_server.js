const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const axios = require('axios');
const cheerio = require('cheerio');
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.get('/token', async (req, res) => {
  try {
    const response = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_description || 'Token fetch failed' });
    }

    res.json({ token: data.access_token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/iss-sighting', async (req, res) => {
  try {
    const url = 'https://spotthestation.nasa.gov/sightings/view.cfm?country=India&region=None&city=Chennai';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const sightings = [];
    $('table tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      const date = $(tds[0]).text().trim();
      const time = $(tds[1]).text().trim();
      const maxHeightText = $(tds[4]).text().trim(); // "Max Height"
      const maxDeg = parseInt(maxHeightText.split('°')[0]);

      if (maxDeg > 40) {
        sightings.push({ date, time, maxHeight: maxDeg });
      }
    });

    if (sightings.length === 0) return res.json({ next: null });
    return res.json({ next: sightings[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ISS sightings" });
  }
});

app.listen(port, () => {
  console.log(`OAuth server running on port ${port}`);
});
