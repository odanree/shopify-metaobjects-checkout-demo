# ADR 002 — JSON Field for Size Chart Structure

**Status:** Accepted  
**Date:** 2026-04-01

## Context

Size charts have variable column structures: a Tops guide has Chest/Waist/Shoulder columns; a Bottoms guide has Waist/Hip/Inseam. Encoding this as separate typed fields in the metaobject schema would require a fixed column count or separate metaobject types per garment category.

## Decision

The `size_chart` field in the `size_guide` metaobject type is a Shopify `json` field with the structure:

```json
{
  "headers": ["Size", "Chest", "Waist", "Shoulder"],
  "rows": [["S", "36–38", "28–30", "17"], ...]
}
```

The Liquid template parses this with `parse_json` and renders it as a semantic HTML table with accessible `<th scope>` attributes.

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Separate metaobject type per category | Combinatorial explosion; every new garment type needs a new type definition |
| Fixed columns (always 5) | Forced empty cells for categories with fewer measurements — confusing UX |
| Multiline text (pipe-delimited) | No schema validation; parsing is fragile; loses structured access |

## Consequences

- **Positive:** Arbitrary column counts work without schema changes
- **Positive:** Single metaobject type covers all garment categories
- **Negative:** JSON field has no per-cell type validation in Shopify's admin — malformed inputs will surface as render errors, not form errors
- **Negative:** Liquid's `parse_json` filter adds a small template processing step; negligible at scale
