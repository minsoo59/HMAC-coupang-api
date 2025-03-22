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

    // 1. 쿼리 스트링 받아오기
    const { createdAtFrom, createdAtTo, status, searchType, maxPerPage, nextToken } = req.query;

    // 2. 필수 쿼리값 확인
    if (!createdAtFrom || !createdAtTo || !status) {
      return res.status(400).json({ error: 'createdAtFrom, createdAtTo, status are required.' });
    }

    // 3. 쿼리 문자열 생성
    const queryObj = req.query;
    const query = '?' + querystring.stringify(queryObj); // 쿼리 문자열 생성

    // 4. HMAC Signature 생성
    const now = new Date().toISOString();
    const method = 'GET';
    const message = `${now}${method}${path}${query}`;
    const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');

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