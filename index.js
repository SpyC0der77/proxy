const express = require('express');
const axios = require('axios');
const https = require('https');
const cookieParser = require('cookie-parser');

const app = express();
const port = 1234;

const agent = new https.Agent({
  rejectUnauthorized: false,
});

app.use(express.json());

app.use(cookieParser());

app.get('/setup', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Setup</title>
      </head>
      <body>
        <h1>Setup</h1>
        <form action="/api/setBaseUrl" method="get">
          <label for="baseUrl">Base URL:</label>
          <input type="text" id="baseUrl" name="url" placeholder="https://example.com" required>
          <button type="submit">Set Base URL</button>
        </form>
      </body>
    </html>
  `);
});

app.get('/api/setBaseUrl', (req, res) => {
  const baseUrl = req.query.url;
  if (baseUrl) {
    res.cookie('baseUrl', baseUrl, { maxAge: 900000 }); // Set cookie with baseUrl
    res.redirect('/');
  } else {
    res.status(400).send('Missing baseUrl query parameter');
  }
});

app.use(async (req, res) => {
  try {
    // Check if baseUrl is set in cookies
    const baseUrl = req.cookies.baseUrl;
    if (!baseUrl) {
      return res.redirect('/setup');
    }

    // Construct the full URL to forward the request to
    const url = `${baseUrl}${req.originalUrl}`;

    // Forward the request to the target URL
    const response = await axios({
      method: req.method,
      url,
      headers: {
        // Forward the Accept header to the target URL
        'Accept': req.headers['accept'] || '*/*',
        // Forward other headers if needed
      },
      responseType: 'stream', // Handle stream responses
      httpsAgent: agent,
    });

    // Set the correct content type
    res.setHeader('Content-Type', response.headers['content-type']);
    
    // Pipe the response stream
    response.data.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
