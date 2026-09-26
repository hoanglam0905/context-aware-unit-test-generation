import { LanguageDetector } from './language_detector';
import { UniversalCodeParser } from './universal_ast_parser';
import { HybridPromptStrategy } from '../prompts/hybrid';
import * as path from 'path';

describe('Polyglot Multi-Language Support', () => {
  const parser = new UniversalCodeParser();

  describe('LanguageDetector', () => {
    it('should detect language by file extension correctly', () => {
      expect(LanguageDetector.detectLanguage('service.ts').id).toBe('typescript');
      expect(LanguageDetector.detectLanguage('service.js').id).toBe('javascript');
      expect(LanguageDetector.detectLanguage('calculator.py').id).toBe('python');
      expect(LanguageDetector.detectLanguage('UserService.java').id).toBe('java');
      expect(LanguageDetector.detectLanguage('OrderService.cs').id).toBe('csharp');
      expect(LanguageDetector.detectLanguage('handler.go').id).toBe('go');
      expect(LanguageDetector.detectLanguage('unknown.xyz').id).toBe('typescript');
    });

    it('should determine appropriate test framework per language', () => {
      expect(LanguageDetector.getDefaultTestFramework('python')).toBe('pytest');
      expect(LanguageDetector.getDefaultTestFramework('java')).toBe('JUnit 5');
      expect(LanguageDetector.getDefaultTestFramework('csharp')).toBe('xUnit');
      expect(LanguageDetector.getDefaultTestFramework('go')).toBe('testing');
      expect(LanguageDetector.getDefaultTestFramework('typescript')).toBe('Jest');
    });

    it('should compute standard test file path per language conventions', () => {
      expect(LanguageDetector.computeTestFilePath('/src/services/discount_service.py')).toBe(
        path.normalize('/src/services/test_discount_service.py')
      );
      expect(LanguageDetector.computeTestFilePath('/src/services/UserService.java')).toBe(
        path.normalize('/src/services/UserServiceTest.java')
      );
      expect(LanguageDetector.computeTestFilePath('/src/services/order_service.go')).toBe(
        path.normalize('/src/services/order_service_test.go')
      );
      expect(LanguageDetector.computeTestFilePath('/src/services/calculator.ts')).toBe(
        path.normalize('/src/services/calculator.test.ts')
      );
    });
  });

  describe('UniversalCodeParser', () => {
    it('should parse Python classes and methods', () => {
      const pythonCode = `
class DiscountCalculator:
    """Calculates customer discounts based on VIP tier."""
    
    def calculate_discount(self, order_amount: float, is_vip: bool) -> float:
        """Apply 10% discount for VIP orders."""
        if is_vip and order_amount > 100:
            return order_amount * 0.1
        return 0.0

    def apply_coupon(self, code: str) -> bool:
        return code == "SAVE10"
`;
      const result = parser.parse(pythonCode, 'calculator.py');
      expect(result.classes.length).toBe(1);
      expect(result.classes[0].name).toBe('DiscountCalculator');
      expect(result.classes[0].docComment).toContain('Calculates customer discounts');
      expect(result.classes[0].methods.length).toBe(2);

      const calcMethod = result.classes[0].methods.find((m: any) => m.name === 'calculate_discount');
      expect(calcMethod).toBeDefined();
      expect(calcMethod?.returnType).toBe('float');
      expect(calcMethod?.parameters.length).toBe(2);
      expect(calcMethod?.parameters[0].name).toBe('order_amount');
      expect(calcMethod?.parameters[0].type).toBe('float');
      expect(calcMethod?.docComment).toContain('Apply 10% discount');
    });

    it('should parse Java classes and methods', () => {
      const javaCode = `
package com.example.service;

/**
 * Service for managing user authentication and permissions.
 */
public class UserService {
    
    /**
     * Authenticate a user by username and password.
     */
    public boolean login(String username, String password) {
        return username != null && !username.isEmpty();
    }

    public void logout(String userId) {
        // clear session
    }
}
`;
      const result = parser.parse(javaCode, 'UserService.java');
      expect(result.classes.length).toBe(1);
      expect(result.classes[0].name).toBe('UserService');
      expect(result.classes[0].docComment).toContain('Service for managing user');
      expect(result.classes[0].methods.length).toBe(2);

      const loginMethod = result.classes[0].methods.find((m: any) => m.name === 'login');
      expect(loginMethod).toBeDefined();
      expect(loginMethod?.returnType).toBe('boolean');
      expect(loginMethod?.parameters.length).toBe(2);
      expect(loginMethod?.parameters[0].name).toBe('username');
      expect(loginMethod?.parameters[0].type).toBe('String');
    });

    it('should parse Go functions and methods', () => {
      const goCode = `
package service

// CalculateTax computes the VAT based on amount.
func CalculateTax(amount float64, rate float64) float64 {
    return amount * rate
}

func (s *OrderService) ProcessOrder(orderID string) error {
    return nil
}
`;
      const result = parser.parse(goCode, 'service.go');
      expect(result.functions.length).toBe(2);

      const taxFunc = result.functions.find((m: any) => m.name === 'CalculateTax');
      expect(taxFunc).toBeDefined();
      expect(taxFunc?.returnType).toBe('float64');
      expect(taxFunc?.parameters.length).toBe(2);
      expect(taxFunc?.parameters[0].name).toBe('amount');
      expect(taxFunc?.parameters[0].type).toBe('float64');
    });

    it('should parse C# classes and methods', () => {
      const csharpCode = `
namespace MyCommerce.Services {
    /// <summary>
    /// Service for processing payments.
    /// </summary>
    public class PaymentProcessor {
        public async Task<bool> ProcessPayment(string cardToken, decimal amount) {
            return amount > 0;
        }
    }
}
`;
      const result = parser.parse(csharpCode, 'PaymentProcessor.cs');
      expect(result.classes.length).toBe(1);
      expect(result.classes[0].name).toBe('PaymentProcessor');
      expect(result.classes[0].methods.length).toBe(1);

      const procMethod = result.classes[0].methods[0];
      expect(procMethod.name).toBe('ProcessPayment');
      expect(procMethod.parameters.length).toBe(2);
      expect(procMethod.parameters[0].name).toBe('cardToken');
      expect(procMethod.parameters[0].type).toBe('string');
      expect(procMethod.parameters[1].type).toBe('decimal');
    });
  });

  describe('PromptBuilder Polyglot Customization', () => {
    it('should tailor prompt for Python and pytest', () => {
      const strategy = new HybridPromptStrategy();
      const payload = strategy.buildPrompt({
        serviceCode: 'class Calculator:\n    def add(self, a, b):\n        return a + b',
        sourceLanguage: 'Python',
        testFramework: 'pytest',
      });

      expect(payload.systemPrompt).toContain('Python');
      expect(payload.systemPrompt).toContain('pytest');
      expect(payload.userPrompt).toContain('python');
    });

    it('should tailor prompt for Java and JUnit 5', () => {
      const strategy = new HybridPromptStrategy();
      const payload = strategy.buildPrompt({
        serviceCode: 'public class Calculator { public int add(int a, int b) { return a + b; } }',
        sourceLanguage: 'Java',
        testFramework: 'JUnit 5',
      });

      expect(payload.systemPrompt).toContain('Java');
      expect(payload.systemPrompt).toContain('JUnit 5');
      expect(payload.userPrompt).toContain('java');
    });
  });
});
