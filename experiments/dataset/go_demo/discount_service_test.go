json
{
  "testScenarios": [
    {
      "id": "TC-001",
      "acceptanceCriteriaRef": "CalculateDiscount should return 0.0 for a negative total amount",
      "category": "BOUNDARY",
      "description": "Ensure the function handles negative total amounts correctly.",
      "expectedBehavior": "CalculateDiscount should return 0.0"
    },
    {
      "id": "TC-002",
      "acceptanceCriteriaRef": "CalculateDiscount should return 15% discount for a VIP customer with a total amount of 100",
      "category": "HAPPY_PATH",
      "description": "Verify the function correctly applies a 15% discount to VIP customers.",
      "expectedBehavior": "CalculateDiscount should return 15.0"
    },
    {
      "id": "TC-003",
      "acceptanceCriteriaRef": "CalculateDiscount should return 5% discount for a non-VIP customer with a total amount of 200",
      "category": "HAPPY_PATH",
      "description": "Confirm the function correctly applies a 5% discount to non-VIP customers.",
      "expectedBehavior": "CalculateDiscount should return 10.0"
    },
    {
      "id": "TC-004",
      "acceptanceCriteriaRef": "CalculateDiscount should return 2% bulk discount for an order with more than 10 items",
      "category": "HAPPY_PATH",
      "description": "Ensure the function correctly applies an extra 2% bulk discount to orders with more than 10 items.",
      "expectedBehavior": "CalculateDiscount should return 1.2"
    },
    {
      "id": "TC-005",
      "acceptanceCriteriaRef": "CalculateDiscount should return the total amount for an order with no discounts",
      "category": "HAPPY_PATH",
      "description": "Validate the function does not apply any discounts to an order with no discounts.",
      "expectedBehavior": "CalculateDiscount should return 0.0"
    }
  ],
  "reasoningSteps": [
    "Step 1: Analyzed BA business rules...",
    "Step 2: Mapped to source code branches...",
    "Step 3: Identified edge cases and boundary values...",
    "Step 4: Formulated test scenarios covering these cases..."
  ],
  "testCode": "// Complete, runnable test file in Go using testing\npackage demo\n\nimport (\n\t"testing\n\t\"fmt\"\n\t\"math\"\n)\n\n// Order represents an e-commerce shopping cart order.\ntype Order struct {\n\tTotalAmount float64\n\tIsVIP       bool\n\tItemCount   int\n}\n\n// DiscountCalculator handles pricing discount logic.\ntype DiscountCalculator struct {\n}\n\n// CalculateDiscount computes discount based on customer tier and order size.\n// - VIP customers get 15% discount for orders >= 100.\n// - Non-VIP customers get 5% discount for orders >= 200.\n// - Orders with item count > 10 get an extra 2% bulk discount.\nfunc (d *DiscountCalculator) CalculateDiscount(order Order) float64 {\n\tif order.TotalAmount <= 0 {\n\t\treturn 0.0\n\t}\n\n	var rate float64 = 0.0\n\n	if order.IsVIP {\n\t	if order.TotalAmount >= 100.0 {\n\t\t	rate = 0.15\n\t\t}\n\t} else {\n\t	if order.TotalAmount >= 200.0 {\n\t\t	rate = 0.05\n\t\t}\n\t}\n\n	if order.ItemCount > 10 {\n\t	rate += 0.02\n\t}\n\n	return order.TotalAmount * rate\n}\n\nfunc TestCalculateDiscount(t *testing.T) {\n\ttc := []struct {\n\t\torder Order\n\t\texpected float64\n\t}{\n\t\t{Order{TotalAmount: 0.0, IsVIP: false, ItemCount: 0}, 0.0},\n\t\t{Order{TotalAmount: -10.0, IsVIP: false, ItemCount: 0}, 0.0},\n\t\t{Order{TotalAmount: 100.0, IsVIP: true, ItemCount: 0}, 15.0},\n\t\t{Order{TotalAmount: 200.0, IsVIP: false, ItemCount: 0}, 10.0},\n\t\t{Order{TotalAmount: 100.0, IsVIP: false, ItemCount: 11}, 11.2},\n\t}\n\n\tfor _, tt := range tc {\n\t\tgot := d.CalculateDiscount(tt.order)\n\t\tif got != tt.expected {\n\t\t\tt.Errorf(\"CalculateDiscount(%v) = %v; want %v\", tt.order, got, tt.expected)\n\t\t}\n\t}\n}\n"
}