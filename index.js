import express from 'express';
import https from 'https';
import crypto from 'crypto';
import querystring from 'querystring';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

app.post('/orders', async (req, res) => {
  try {
    const { accessKey, secretKey, vendorId, path } = req.body;
    const queryObj = req.query; // 쿼리 파라미터를 그대로 받음

    const query = `?${querystring.stringify(queryObj)}`;
    const now = new Date().toISOString();
    const method = 'GET';
    const message = `${now}${method}${path}${query}`;

    const signature = crypto.createHmac('sha256', secretKey)
      .update(message)
      .digest('hex');

    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;

    const options = {
      hostname: 'api-gateway.coupang.com',
      path: `${path}${query}`,
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
    };

    const coupangReq = https.request(options, (coupangRes) => {
      let data = '';
      coupangRes.on('data', (chunk) => (data += chunk));
      coupangRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json(parsed);
        } catch (err) {
          res.status(500).json({ error: 'JSON parse error', raw: data });
        }
      });
    });

    coupangReq.on('error', (e) => {
      res.status(500).json({ error: e.message });
    });

    coupangReq.end();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Coupang API Server running on port ${PORT}`));