# ADR 001 — Metaobjects Over Product Metafields for Editorial Content

**Status:** Accepted  
**Date:** 2026-04-01

## Context

Lookbooks and size guides need to be managed as standalone editorial entities. The alternatives are product metafields (attached to a specific product) or hardcoded theme settings (global, static). Neither fits content that spans multiple products and needs its own create/update/delete lifecycle.

## Decision

Lookbooks and size guides are defined as Shopify metaobject types (`lookbook`, `size_guide`) with explicit field schemas. Each entry is an independent object with storefront access control, not a property of any particular product.

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Product metafields | Lookbooks feature multiple products — attaching to one product is arbitrary and breaks discoverability |
| Theme settings (JSON) | Static; requires a code deploy to change content; no structured schema |
| Page content + metafields | Pages are untyped — size guides need a validated table structure, not free-form HTML |

## Consequences

- **Positive:** Editorial team can manage lookbooks/size guides independently of products
- **Positive:** Schema validation at the Shopify API level prevents malformed entries
- **Positive:** Storefront access is explicitly grantable per metaobject type
- **Negative:** Requires setup script to create type definitions before first use — new store onboarding has a prerequisite step
