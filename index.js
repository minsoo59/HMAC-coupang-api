import express from 'express';
import https from 'https';
import crypto from 'crypto';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

app.post('/orders', async (req, res) => {
  try {
    // 1. 요청에서 인증 관련 정보 추출
    const { accessKey, secretKey, vendorId, path } = req.body;

    // 2. 쿼리 스트링에서 createdAtFrom, createdAtTo, status 추출
    const { createdAtFrom, createdAtTo, status } = req.query;

    if (!createdAtFrom || !createdAtTo || !status) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    // 3. 날짜 등 쿼리 조합
    const query = `?createdAtFrom=${createdAtFrom}&createdAtTo=${createdAtTo}&status=${status}`;

    // 4. HMAC Signature 생성
    const now = new Date().toISOString();
    const method = 'GET';
    const message = `${now}${method}${path}${query}`;
    const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');

    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;

    // 5. Coupang API로 요청
    const options = {
      hostname: 'api-gateway.coupang.com',
      path: `${path}${query}`,
      method: method,
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