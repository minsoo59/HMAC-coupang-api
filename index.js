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

    // 1. 필수 값 검증
    if (!accessKey || !secretKey || !vendorId || !path) {
      return res.status(400).json({ error: 'Missing required credentials or path' });
    }

    // 2. 쿼리 파라미터 구성 (Make에서 query string에 전달된 값)
    const queryParams = req.query || {};
    const query = querystring.stringify(queryParams);
    const fullQuery = query ? `?${query}` : '';

    // 3. HMAC 서명 생성
    const now = new Date().toISOString();
    const method = 'GET';
    const message = `${now}${method}${path}${fullQuery}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('hex');

    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;

    // 4. 쿠팡 API 요청 구성
    const options = {
      hostname: 'api-gateway.coupang.com',
      path: `${path}${fullQuery}`,
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
          res.status(coupangRes.statusCode).json(parsed);
        } catch (err) {
          res.status(502).json({ error: 'JSON parse error', raw: data });
        }
      });
    });

    coupangReq.on('error', (e) => {
      res.status(500).json({ error: 'Coupang API request error', message: e.message });
    });

    coupangReq.end();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Coupang API Proxy Server running on port ${PORT}`)
);