import express from 'express';
import crypto from 'crypto';
import https from 'https';

const app = express();
app.use(express.json());

app.post('/orders', async (req, res) => {
  try {
    const { accessKey, secretKey, vendorId, path, query } = req.body;

    const now = new Date().toISOString();
    const method = 'GET';
    const message = now + method + path + query;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;

    const options = {
      hostname: 'api-gateway.coupang.com',
      path: `${path}${query}`,
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      }
    };

    const coupangReq = https.request(options, (coupangRes) => {
      let data = '';
      coupangRes.on('data', chunk => data += chunk);
      coupangRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json(parsed);
        } catch (error) {
          res.status(500).json({ error: 'JSON parse error', raw: data });
        }
      });
    });

    coupangReq.on('error', (e) => {
      res.status(500).json({ error: e.message });
    });

    coupangReq.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));