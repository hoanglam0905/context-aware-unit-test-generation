Feature: Go Discount Calculation Service
  As an e-commerce platform
  I want to calculate dynamic order discounts for customers
  So that VIP and bulk buyers receive accurate promotional rates

  Scenario: VIP customer with order over $100
    Given a VIP customer
    When an order is placed with total amount $150 and 3 items
    Then the discount should be $22.50 (15%)

  Scenario: Bulk order extra discount
    Given a regular customer
    When an order is placed with total amount $300 and 12 items
    Then the discount rate should be 7% (5% standard + 2% bulk)

  Scenario: Zero or negative order amount
    Given any customer
    When an order total is $0 or negative
    Then the discount returned should be 0.0
