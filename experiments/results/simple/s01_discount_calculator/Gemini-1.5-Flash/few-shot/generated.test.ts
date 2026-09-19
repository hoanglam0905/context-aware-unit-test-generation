```typescript
import {
  DiscountCalculatorService,
  InvalidOrderAmountException,
  MembershipTier,
} from './service';

describe('DiscountCalculatorService', () => {
  let service: DiscountCalculatorService;

  beforeEach(() => {
    service = new DiscountCalculatorService();