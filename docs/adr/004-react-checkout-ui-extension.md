# ADR 004 — React for Checkout UI Extension

**Status:** Accepted  
**Date:** 2026-04-01

## Context

Shopify's checkout is protected — third-party scripts are blocked and direct DOM manipulation is not allowed. Customizations require the Checkout UI Extensions SDK, which mandates React as the rendering model.

## Decision

The loyalty points display is implemented as a Shopify Checkout UI Extension using React with the `@shopify/ui-extensions-react` library. It targets the `purchase.checkout.block.render` extension point and uses the SDK's typed hooks:

- `useCustomer()` — reads the authenticated customer and their metafields
- `useCartLines()` — reads line items to calculate points earned on this order
- `useMoney()` — formats currency values consistently with the storefront locale

## Consequences

- **Positive:** The only supported approach — Shopify's sandbox requires the SDK
- **Positive:** SDK hooks abstract complex checkout state; no manual subscription management
- **Positive:** UI components from `@shopify/ui-extensions-react` match Shopify's design system out of the box
- **Negative:** Extension must be deployed to Shopify's CDN via `shopify app deploy` — no local preview without the CLI tunnel
- **Negative:** React version and SDK version are controlled by Shopify's extension runtime, not the developer
