/**
 * Lightweight webhook server for the metaobjects checkout demo app.
 *
 * Handles the orders/paid webhook to credit loyalty points to the
 * ordering customer's metafield (loyalty.points_balance).
 *
 * Run: node app/server.js
 * For local webhook delivery: use `shopify app dev` or ngrok tunnel.
 */
require("dotenv").config();

const http = require("http");
const { handleOrdersPaid } = require("./webhooks/ordersPaid");

const PORT = parseInt(process.env.PORT || "3001", 10);

/**
 * Minimal request router — no Express dependency so the app stays
 * lightweight and zero-dependency beyond the Shopify CLI toolchain.
 */
const server = http.createServer((req, res) => {
  // Collect raw body for HMAC verification before parsing
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks);
    try {
      req.body = JSON.parse(req.rawBody.toString("utf8"));
    } catch {
      req.body = {};
    }

    route(req, res);
  });
});

function route(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(
      JSON.stringify({ status: "ok", service: "metaobjects-loyalty-webhook" })
    );
  }

  if (req.method === "POST" && req.url === "/api/webhooks/orders/paid") {
    return handleOrdersPaid(req, res);
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
}

server.listen(PORT, () => {
  console.log(
    `[loyalty-server] Listening on port ${PORT} (${process.env.NODE_ENV || "development"})`
  );
  console.log(`[loyalty-server] Points per dollar: ${process.env.LOYALTY_POINTS_PER_DOLLAR || 10}`);
});
