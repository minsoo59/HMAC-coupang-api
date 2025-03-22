import express from "express";
import https from "https";
import crypto from "crypto";

const app = express();
app.use(express.json());

app.post("/orders", async (req, res) => {
  const { accessKey, secretKey, vendorId, path, query } = req.body;

  if (!accessKey || !secretKey || !vendorId || !path || !query) {
    return res.status(400).json({ error: "필수 파라미터 누락" });
  }

  const now = new Date().toISOString();
  const method = "GET";

  const message = `${now}${method}${path}${query}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;

  const options = {
    hostname: "api-gateway.coupang.com",
    path: `${path}${query}`,
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
  };

  const coupangReq = https.request(options, (coupangRes) => {
    let data = "";

    coupangRes.on("data", (chunk) => {
      data += chunk;
    });

    coupangRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        res.json(parsed);
      } catch (err) {
        res.status(500).json({ error: "JSON 파싱 에러", raw: data });
      }
    });
  });

  coupangReq.on("error", (e) => {
    res.status(500).json({ error: e.message });
  });

  coupangReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Coupang API Server running on port ${PORT}`);
});