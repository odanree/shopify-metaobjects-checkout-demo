import {
  reactExtension,
  useApi,
  useCustomer,
  useCartLines,
  useSettings,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  SkeletonText,
} from "@shopify/ui-extensions-react/checkout";

const TARGET = "purchase.checkout.block.render";

export default reactExtension(TARGET, () => <LoyaltyPointsBlock />);

interface LoyaltyPointsSettings {
  points_per_dollar: number;
}

function LoyaltyPointsBlock() {
  const { query } = useApi(TARGET);
  const customer = useCustomer();
  const cartLines = useCartLines();
  const settings = useSettings<LoyaltyPointsSettings>();

  // Guest checkout — nothing to show
  if (!customer) return null;

  const pointsPerDollar = settings.points_per_dollar ?? 10;

  // Read loyalty points balance from customer metafield (loyalty.points_balance)
  const pointsMetafield = customer.metafields?.find(
    (m) => m.namespace === "loyalty" && m.key === "points_balance"
  );
  const currentBalance = pointsMetafield ? parseInt(pointsMetafield.value, 10) : null;

  // Calculate points to be earned from this order
  const cartSubtotalCents = cartLines.reduce((sum, line) => {
    const price = parseFloat(line.merchandise.price?.amount ?? "0");
    return sum + price * line.quantity;
  }, 0);
  const pointsToEarn = Math.floor(cartSubtotalCents * pointsPerDollar);

  // 100 pts = $1.00
  const pointsToDollars = (pts: number) => (pts / 100).toFixed(2);

  if (currentBalance === null) {
    return (
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">Loyalty Points</Text>
          <SkeletonText inlineSize="fill" />
        </BlockStack>
      </Banner>
    );
  }

  const newBalance = currentBalance + pointsToEarn;

  return (
    <Banner status="info">
      <BlockStack spacing="base">
        <Text emphasis="bold" size="medium">
          Your Loyalty Points
        </Text>
        <Divider />
        <InlineStack spacing="base" blockAlignment="center">
          <BlockStack spacing="none">
            <Text appearance="subdued" size="small">
              Current balance
            </Text>
            <Text emphasis="bold">
              {currentBalance.toLocaleString()} pts
            </Text>
            <Text appearance="subdued" size="small">
              (worth ${pointsToDollars(currentBalance)})
            </Text>
          </BlockStack>
          <BlockStack spacing="none">
            <Text appearance="subdued" size="small">
              Earned this order
            </Text>
            <Text emphasis="bold" appearance="success">
              +{pointsToEarn.toLocaleString()} pts
            </Text>
            <Text appearance="subdued" size="small">
              (+${pointsToDollars(pointsToEarn)})
            </Text>
          </BlockStack>
          <BlockStack spacing="none">
            <Text appearance="subdued" size="small">
              Balance after order
            </Text>
            <Text emphasis="bold">
              {newBalance.toLocaleString()} pts
            </Text>
            <Text appearance="subdued" size="small">
              (worth ${pointsToDollars(newBalance)})
            </Text>
          </BlockStack>
        </InlineStack>
        <Text appearance="subdued" size="small">
          Points are applied automatically on your next order at checkout.
          Every 100 points = $1.00 off.
        </Text>
      </BlockStack>
    </Banner>
  );
}
