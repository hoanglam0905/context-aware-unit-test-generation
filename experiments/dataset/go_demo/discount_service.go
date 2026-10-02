package demo

// Order represents an e-commerce shopping cart order.
type Order struct {
	TotalAmount float64
	IsVIP       bool
	ItemCount   int
}

// DiscountCalculator handles pricing discount logic.
type DiscountCalculator struct {
}

// CalculateDiscount computes discount based on customer tier and order size.
// - VIP customers get 15% discount for orders >= 100.
// - Non-VIP customers get 5% discount for orders >= 200.
// - Orders with item count > 10 get an extra 2% bulk discount.
func (d *DiscountCalculator) CalculateDiscount(order Order) float64 {
	if order.TotalAmount <= 0 {
		return 0.0
	}

	var rate float64 = 0.0

	if order.IsVIP {
		if order.TotalAmount >= 100.0 {
			rate = 0.15
		}
	} else {
		if order.TotalAmount >= 200.0 {
			rate = 0.05
		}
	}

	if order.ItemCount > 10 {
		rate += 0.02
	}

	return order.TotalAmount * rate
}
