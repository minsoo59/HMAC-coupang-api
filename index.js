import express from "express";
import https from "https";
import crypto from "crypto";

const app = express();
app.use(express.json());

app.post("/orders", async (req, res) => {
  const { accessKey, secretKey, vendorId, path, query } = req.body;

  if (!accessKey || !secretKey || !vendorId || !path) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const method = "GET";
  const fullPath = `${path}${query || ""}`;
  const message = `${now}${method}${fullPath}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;

  const options = {
    hostname: "api-gateway.coupang.com",
    path: fullPath,
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
  };

  const coupangReq = https.request(options, (coupangRes) => {
    let data = "";
    coupangRes.on("data", (chunk) => (data += chunk));
    coupangRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        res.json(parsed);
      } catch (err) {
        res.status(500).json({ error: "JSON parse error", raw: data });
      }
    });
  });

  coupangReq.on("error", (e) => {
    res.status(500).json({ error: e.message });
  });

  coupangReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Coupang API Server running on port ${PORT}`));