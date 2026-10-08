package demo

import (
	"testing"
)

// TestCalculateDiscount tests the CalculateDiscount function with various scenarios.
func TestCalculateDiscount(t *testing.T) {
	testCases := []struct {
		name     string
		order    Order
		expected float64
	}{
		{"VIP customer with total amount >= 100", Order{TotalAmount: 120.0, IsVIP: true, ItemCount: 100}, 108.0},
		{"Non-VIP customer with total amount >= 200", Order{TotalAmount: 240.0, IsVIP: false, ItemCount: 200}, 216.0},
		{"Bulk discount for orders with item count > 10", Order{TotalAmount: 300.0, IsVIP: false, ItemCount: 15}, 294.0},
		{"No discount for orders with total amount <= 0", Order{TotalAmount: 0.0, IsVIP: false, ItemCount: 10}, 0.0},
		{"No discount for orders with item count <= 10", Order{TotalAmount: 100.0, IsVIP: false, ItemCount: 10}, 100.0},
		{"No discount for orders with total amount < 100 and item count <= 10", Order{TotalAmount: 99.9, IsVIP: false, ItemCount: 10}, 99.9},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actual := tc.order.CalculateDiscount(tc.order)
			if actual != tc.expected {
				t.Errorf("CalculateDiscount(%v) = %v; want %v", tc.order, actual, tc.expected)
			}
		})
	}
}