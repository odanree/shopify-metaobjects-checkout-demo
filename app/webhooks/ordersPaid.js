require("dotenv").config();
const crypto = require("crypto");
const https = require("https");

const SHOPIFY_API_VERSION = "2024-01";
const POINTS_PER_DOLLAR = parseInt(process.env.LOYALTY_POINTS_PER_DOLLAR || "10", 10);

/**
 * Verifies Shopify webhook HMAC. Returns true if valid.
 */
function verifyHmac(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "base64"),
      Buffer.from(hmacHeader, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Shopify Admin GraphQL helper (no external deps — uses Node built-in https).
 */
function shopifyGql(query, variables = {}) {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const body = JSON.stringify({ query, variables });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: shop,
      path: `/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Shopify-Access-Token": token,
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.errors) reject(new Error(JSON.stringify(json.errors)));
          else resolve(json.data);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Reads the customer's current loyalty points balance from the
 * `loyalty.points_balance` metafield. Returns 0 if unset.
 */
async function getLoyaltyBalance(customerId) {
  const data = await shopifyGql(
    `query GetLoyaltyBalance($id: ID!) {
      customer(id: $id) {
        metafield(namespace: "loyalty", key: "points_balance") {
          id
          value
        }
      }
    }`,
    { id: `gid://shopify/Customer/${customerId}` }
  );
  const raw = data?.customer?.metafield?.value;
  return raw ? parseInt(raw, 10) : 0;
}

/**
 * Writes the new loyalty points balance back to the customer metafield.
 * Uses metafieldsSet which creates-or-updates.
 */
async function setLoyaltyBalance(customerId, newBalance) {
  const data = await shopifyGql(
    `mutation SetLoyaltyBalance($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key value }
        userErrors { field message }
      }
    }`,
    {
      metafields: [
        {
          ownerId: `gid://shopify/Customer/${customerId}`,
          namespace: "loyalty",
          key: "points_balance",
          value: String(newBalance),
          type: "number_integer",
        },
      ],
    }
  );
  const errors = data?.metafieldsSet?.userErrors ?? [];
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join(", "));
  }
  return data.metafieldsSet.metafields[0];
}

/**
 * Express-compatible handler for the orders/paid webhook.
 *
 * When an order is paid:
 *  1. Verify HMAC
 *  2. Calculate points earned (subtotal × POINTS_PER_DOLLAR)
 *  3. Read current balance from customer metafield
 *  4. Write updated balance back
 *
 * Guest orders (no customer) are skipped — no points to award.
 */
async function handleOrdersPaid(req, res) {
  const rawBody = req.rawBody;
  const hmacHeader = req.headers["x-shopify-hmac-sha256"];

  if (!verifyHmac(rawBody, hmacHeader)) {
    console.warn("[ordersPaid] HMAC verification failed");
    return res.status(401).json({ error: "HMAC verification failed" });
  }

  const order = req.body;

  // Guest checkout — no loyalty account to credit
  if (!order.customer?.id) {
    return res.status(200).json({ received: true, skipped: "guest_order" });
  }

  res.status(200).json({ received: true });

  // Process asynchronously
  _creditLoyaltyPoints(order).catch((err) => {
    console.error("[ordersPaid] Unhandled loyalty credit error", {
      orderId: order.id,
      error: err.message,
    });
  });
}

async function _creditLoyaltyPoints(order) {
  const customerId = order.customer.id;
  const subtotal = parseFloat(order.subtotal_price || "0");
  const pointsEarned = Math.floor(subtotal * POINTS_PER_DOLLAR);

  if (pointsEarned <= 0) {
    console.log("[ordersPaid] No points to award", { orderId: order.id, subtotal });
    return;
  }

  const currentBalance = await getLoyaltyBalance(customerId);
  const newBalance = currentBalance + pointsEarned;

  await setLoyaltyBalance(customerId, newBalance);

  console.log("[ordersPaid] Loyalty points credited", {
    orderId: order.id,
    customerId,
    subtotal,
    pointsEarned,
    previousBalance: currentBalance,
    newBalance,
  });
}

module.exports = { handleOrdersPaid };
