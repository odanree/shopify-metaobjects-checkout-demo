# ADR 003 — Customer Metafield for Loyalty Points Balance

**Status:** Accepted  
**Date:** 2026-04-01

## Context

The checkout extension needs to read and display a customer's loyalty points balance. The options are: a custom metaobject (one entry per customer), a customer metafield, or an external loyalty API.

## Decision

Loyalty balance is stored in `customer.metafields` with namespace `loyalty` and key `points_balance` (integer type). The checkout extension reads it via Shopify's `useCustomer()` hook with `metafields: [{ namespace: "loyalty", key: "points_balance" }]` in the extension target configuration.

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Custom metaobject (one per customer) | No direct customer association; requires custom lookup; over-engineered for a single scalar value |
| External loyalty API call at checkout | Network latency at checkout is unacceptable; no fetch API in UI extensions without custom app proxy |
| Shopify Customer tags | Tags are strings, not integers; no arithmetic support for balance calculation |

## Consequences

- **Positive:** Customer metafields are readable in UI extensions without any additional API calls
- **Positive:** Integer type enforces non-negative whole number values at the Shopify API level
- **Negative:** Balance updates must go through the Shopify Admin API — no direct write from the extension; a separate backend or Shopify Flow action must handle point accrual on order completion
