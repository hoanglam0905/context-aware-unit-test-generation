import * as path from 'path';
import * as fs from 'fs';
import { GeneratedTestEvaluator } from '../../../experiments/evaluate_generated_tests';

describe('GeneratedTestEvaluator', () => {
  describe('extractExecutableTestCode', () => {
    it('should strip markdown code fences', () => {
      const markdownCode = '```typescript\nimport { Foo } from "./service";\ndescribe("Foo", () => {});\n```';
      const extracted = GeneratedTestEvaluator.extractExecutableTestCode(markdownCode);
      expect(extracted).toContain('import { Foo } from "./service";');
      expect(extracted).not.toContain('```');
    });

    it('should extract testCode from JSON output of hybrid prompt', () => {
      const jsonOutput = JSON.stringify({
        testScenarios: [{ id: 'TC-1', description: 'desc' }],
        reasoningSteps: ['step 1'],
        testCode: 'import { Bar } from "./service";\ndescribe("Bar", () => {});',
      });

      const extracted = GeneratedTestEvaluator.extractExecutableTestCode(jsonOutput);
      expect(extracted).toContain('import { Bar } from "./service";');
      expect(extracted).not.toContain('testScenarios');
    });

    it('should normalize local relative imports to ./service', () => {
      const codeWithLocalImports = `
        import { UserService } from './UserService';
        import { UserModel } from './user.model';
        import { DiscountCalc } from '../service';
        import { ExternalLib } from 'external-lib';
      `;

      const extracted = GeneratedTestEvaluator.extractExecutableTestCode(codeWithLocalImports);
      expect(extracted).toContain("import { UserService } from './service';");
      expect(extracted).toContain("import { UserModel } from './service';");
      expect(extracted).toContain("import { DiscountCalc } from './service';");
      expect(extracted).toContain("import { ExternalLib } from 'external-lib';");
    });
  });

  describe('evaluateSingleTest', () => {
    const sandboxDir = path.resolve(process.cwd(), 'experiments/eval_test_sandbox');
    const evaluator = new GeneratedTestEvaluator({
      sandboxDir,
      silent: true,
    });

    const testFixtureDir = path.resolve(process.cwd(), 'experiments/eval_test_fixtures');
    const servicePath = path.join(testFixtureDir, 'service.ts');
    const validTestPath = path.join(testFixtureDir, 'valid.test.ts');
    const brokenTestPath = path.join(testFixtureDir, 'broken.test.ts');

    beforeAll(() => {
      fs.mkdirSync(testFixtureDir, { recursive: true });
      fs.writeFileSync(
        servicePath,
        `export class Calculator {
          public add(a: number, b: number): number {
            if (a < 0) return 0;
            return a + b;
          }
        }`,
        'utf-8'
      );

      fs.writeFileSync(
        validTestPath,
        `import { Calculator } from './service';
        describe('Calculator', () => {
          it('should add numbers', () => {
            const c = new Calculator();
            expect(c.add(2, 3)).toBe(5);
          });
          it('should return 0 for negative', () => {
            const c = new Calculator();
            expect(c.add(-1, 5)).toBe(0);
          });
        });`,
        'utf-8'
      );

      fs.writeFileSync(
        brokenTestPath,
        `describe('Broken', () => {
          it('unclosed string, syntax error here ... %%%
        });`,
        'utf-8'
      );
    });

    afterAll(() => {
      if (fs.existsSync(testFixtureDir)) {
        fs.rmSync(testFixtureDir, { recursive: true, force: true });
      }
      if (fs.existsSync(sandboxDir)) {
        fs.rmSync(sandboxDir, { recursive: true, force: true });
      }
    });

    it('should report compilable=false when test has severe syntax errors', async () => {
      const result = await evaluator.evaluateSingleTest({
        runId: 'test_broken',
        serviceId: 'calculator',
        tier: 'simple',
        model: 'mock',
        strategy: 'zero-shot',
        testFilePath: brokenTestPath,
        serviceFilePath: servicePath,
      });

      expect(result.compilable).toBe(false);
      expect(result.execution.executed).toBe(false);
      expect(result.coverage.linesPct).toBe(0);
      expect(result.compilationErrors?.length).toBeGreaterThan(0);
    });

    it('should report compilable=true, 100% pass rate, and valid coverage for valid tests', async () => {
      const result = await evaluator.evaluateSingleTest({
        runId: 'test_valid',
        serviceId: 'calculator',
        tier: 'simple',
        model: 'mock',
        strategy: 'hybrid',
        testFilePath: validTestPath,
        serviceFilePath: servicePath,
      });

      expect(result.compilable).toBe(true);
      expect(result.execution.executed).toBe(true);
      expect(result.execution.totalTests).toBe(2);
      expect(result.execution.passedTests).toBe(2);
      expect(result.execution.failedTests).toBe(0);
      expect(result.execution.passRate).toBe(100);
      expect(result.execution.suitePassed).toBe(true);
      expect(result.coverage.linesPct).toBeGreaterThan(0);
    });
  });
});
