#!/usr/bin/env node
/**
 * Setup script: creates Metaobject type definitions and seeds sample entries
 * via the Shopify Admin GraphQL API.
 *
 * Usage:
 *   SHOPIFY_SHOP=your-store.myshopify.com \
 *   SHOPIFY_ACCESS_TOKEN=shpat_xxx \
 *   node scripts/create-metaobject-definitions.js
 */

require("dotenv").config();
const https = require("https");

const SHOP = process.env.SHOPIFY_SHOP || process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = "2024-01";

if (!SHOP || !TOKEN) {
  console.error("Error: SHOPIFY_SHOP and SHOPIFY_ACCESS_TOKEN env vars required.");
  process.exit(1);
}

async function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const options = {
      hostname: SHOP,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Shopify-Access-Token": TOKEN,
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
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

async function createDefinition(definition) {
  const data = await gql(
    `mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id type name }
        userErrors { field message }
      }
    }`,
    { definition }
  );
  const result = data.metaobjectDefinitionCreate;
  if (result.userErrors.length) {
    const alreadyExists = result.userErrors.some((e) =>
      e.message.toLowerCase().includes("already exists")
    );
    if (alreadyExists) {
      console.log(`  ⚠  Type "${definition.type}" already exists — skipping.`);
      return null;
    }
    throw new Error(result.userErrors.map((e) => e.message).join(", "));
  }
  return result.metaobjectDefinition;
}

async function upsertEntry(type, handle, fields) {
  const data = await gql(
    `mutation UpsertEntry($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    {
      handle: { type, handle },
      metaobject: { fields },
    }
  );
  const result = data.metaobjectUpsert;
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((e) => e.message).join(", "));
  }
  return result.metaobject;
}

async function main() {
  console.log(`\nConnecting to ${SHOP}…\n`);

  // ── 1. Create type definitions ──────────────────────────────────────────
  console.log("Creating metaobject type definitions…");

  const sizeGuideDef = await createDefinition({
    type: "size_guide",
    name: "Size Guide",
    displayNameKey: "category",
    access: { storefront: "PUBLIC_READ" },
    fieldDefinitions: [
      { key: "category", name: "Category", type: "single_line_text_field", required: true },
      { key: "size_chart", name: "Size Chart", type: "json", required: true },
      { key: "fit_notes", name: "Fit Notes", type: "multi_line_text_field" },
      { key: "model_info", name: "Model Info", type: "single_line_text_field" },
    ],
  });
  if (sizeGuideDef) console.log(`  ✓  size_guide created: ${sizeGuideDef.id}`);

  const lookbookDef = await createDefinition({
    type: "lookbook",
    name: "Lookbook",
    displayNameKey: "title",
    access: { storefront: "PUBLIC_READ" },
    fieldDefinitions: [
      { key: "title", name: "Title", type: "single_line_text_field", required: true },
      {
        key: "hero_image",
        name: "Hero Image",
        type: "file_reference",
        validations: [{ name: "file_type_options", value: '["Image"]' }],
      },
      { key: "description", name: "Description", type: "rich_text_field" },
      {
        key: "products",
        name: "Featured Products",
        type: "list.product_reference",
        validations: [{ name: "max", value: "6" }],
      },
      { key: "published_at", name: "Published Date", type: "date" },
    ],
  });
  if (lookbookDef) console.log(`  ✓  lookbook created: ${lookbookDef.id}`);

  // ── 2. Seed sample size guide entries ───────────────────────────────────
  console.log("\nSeeding size guide entries…");

  const sizeGuides = [
    {
      handle: "tops-size-guide",
      fields: [
        { key: "category", value: "Tops" },
        {
          key: "size_chart",
          value: JSON.stringify({
            headers: ["Size", "Chest (in)", "Waist (in)", "Shoulder (in)"],
            rows: [
              ["XS", "32–34", "26–28", "15"],
              ["S", "35–37", "29–31", "16"],
              ["M", "38–40", "32–34", "17"],
              ["L", "41–43", "35–37", "18"],
              ["XL", "44–46", "38–40", "19"],
              ["XXL", "47–49", "41–43", "20"],
            ],
          }),
        },
        { key: "fit_notes", value: "Relaxed chest, tapered waist. Size up for oversized fit." },
        { key: "model_info", value: "Model is 6'0\", 175 lbs, wearing size M" },
      ],
    },
    {
      handle: "bottoms-size-guide",
      fields: [
        { key: "category", value: "Bottoms" },
        {
          key: "size_chart",
          value: JSON.stringify({
            headers: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
            rows: [
              ["XS / 26", "26–27", "34–35", "30"],
              ["S / 28", "28–29", "36–37", "30"],
              ["M / 30", "30–31", "38–39", "31"],
              ["L / 32", "32–33", "40–41", "31"],
              ["XL / 34", "34–35", "42–43", "32"],
              ["XXL / 36", "36–37", "44–45", "32"],
            ],
          }),
        },
        { key: "fit_notes", value: "Slim through hip and thigh, tapered leg opening." },
        { key: "model_info", value: "Model is 6'0\", 175 lbs, wearing size 32 / M" },
      ],
    },
  ];

  for (const { handle, fields } of sizeGuides) {
    const entry = await upsertEntry("size_guide", handle, fields);
    console.log(`  ✓  size_guide/${handle}: ${entry.id}`);
  }

  console.log("\nDone. Metaobject types and seed data are ready.\n");
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message);
  process.exit(1);
});
