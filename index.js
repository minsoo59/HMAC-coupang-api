import express from 'express';
import https from 'https';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

app.post('/orders', async (req, res) => {
  try {
    const { accessKey, secretKey, vendorId, path } = req.body;

    // ✅ 쿼리 스트링 조립 (Make에서 쿼리를 QueryString으로 넘겼을 경우)
    const queryStr = `?${new URLSearchParams(req.query).toString()}`;

    const now = new Date().toISOString();
    const method = 'GET';
    const message = `${now}${method}${path}${queryStr}`;

    const signature = crypto.createHmac('sha256', secretKey)
      .update(message)
      .digest('hex');

    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;

    const options = {
      hostname: 'api-gateway.coupang.com',
      path: `${path}${queryStr}`,
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