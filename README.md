# shopify-metaobjects-checkout-demo

Shopify theme demo showing metaobjects powering editorial content (lookbooks, size guides) and a checkout UI extension displaying live loyalty points. Built to showcase Shopify's structured content APIs as an alternative to hardcoded theme settings.

---

## What's included

| Feature | Description |
|---------|-------------|
| **Lookbook section** | Renders 1–4 lookbook metaobjects as a curated image grid with featured products |
| **Size guide section** | Renders a size_guide metaobject as an accessible HTML table (variable columns via JSON field) |
| **Loyalty checkout extension** | React extension at checkout: shows current balance, points earned on this order, and projected balance |

---

## Metaobject types

### `lookbook`
| Field | Type | Notes |
|-------|------|-------|
| `title` | single_line_text | |
| `hero_image` | file_reference | Shopify Files CDN |
| `description` | multi_line_text | |
| `products` | list.product_reference | max 6 |
| `published_at` | date | |

### `size_guide`
| Field | Type | Notes |
|-------|------|-------|
| `category` | single_line_text | e.g. "Tops" |
| `size_chart` | json | `{headers: [], rows: [[]]}` |
| `fit_notes` | multi_line_text | |
| `model_info` | single_line_text | e.g. "Model is 6'1", wearing M" |

---

## Setup

```bash
# Install Shopify CLI
npm install

# Create metaobject type definitions in your store
SHOPIFY_SHOP=your-store.myshopify.com \
SHOPIFY_ACCESS_TOKEN=shpat_xxx \
npm run setup-metaobjects

# Start local development
npm run dev
```

---

## Checkout extension

The loyalty points extension lives at `extensions/loyalty-points-checkout/`. It reads from the `loyalty.points_balance` customer metafield and calculates points earned from cart line totals.

Configurable via extension settings:
- `points_per_dollar` — conversion rate (default: 10)
- `redemption_rate` — points-to-dollar value (default: 0.01)

---

## Design decisions

See [`docs/adr/`](docs/adr/) for full decision records. Key choices:

- **Metaobjects over product metafields**: Lookbooks and size guides span multiple products; they're standalone editorial entities that need their own CRUD lifecycle
- **JSON field for size charts**: Column structures vary by category (Tops vs Bottoms); JSON avoids hardcoded column counts in schema
- **Customer metafield for loyalty balance**: Loyalty is per-customer transactional state, not content — customer metafields are the right primitive
- **React for checkout extension**: Shopify's UI extension SDK only supports React; it provides typed hooks (`useCustomer`, `useCartLines`) that abstract checkout state
