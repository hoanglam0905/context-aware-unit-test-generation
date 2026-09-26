import * as path from 'path';
import * as fs from 'fs';
import { ContextAwareCodeLensProvider } from './codelens/test_codelens_provider';
import { RealtimeDocumentWatcher } from './services/realtime_watcher';

describe('Real-time Test Generation (CodeLens & Auto-Gen on Save)', () => {
  describe('1. ContextAwareCodeLensProvider', () => {
    let provider: ContextAwareCodeLensProvider;

    beforeEach(() => {
      provider = new ContextAwareCodeLensProvider();
    });

    it('tự động tạo CodeLens cho Class và các Public Method trong file', () => {
      const mockDoc = {
        fileName: 'service.ts',
        getText: () => `
          export class PaymentService {
            public calculateFee(amount: number): number {
              return amount * 0.02;
            }
            private helper(): void {}
          }
        `,
        uri: { fsPath: '/path/service.ts' },
      };

      const lenses = provider.provideCodeLenses(mockDoc, {} as any);

      expect(lenses.length).toBeGreaterThanOrEqual(2);
      expect(lenses[0].command.title).toContain('PaymentService');
      expect(lenses[1].command.title).toContain('calculateFee()');
    });
  });

  describe('2. RealtimeDocumentWatcher AST Diff Detection', () => {
    let watcher: RealtimeDocumentWatcher;

    beforeEach(() => {
      watcher = new RealtimeDocumentWatcher({} as any);
    });

    afterEach(() => {
      watcher.dispose();
    });

    it('giữ nguyên AST Signature khi chỉ thay đổi comment hoặc format (tránh spam API)', () => {
      const codeV1 = `
        export class DiscountCalculatorService {
          public calculateDiscount(orderAmount: number): number {
            return orderAmount * 0.1;
          }
        }
      `;

      const codeV2 = `
        // Thêm comment giải thích
        export class DiscountCalculatorService {
          /* Multiline comment */
          public calculateDiscount(orderAmount: number): number {
            return orderAmount * 0.1;
          }
        }
      `;

      const sig1 = watcher.computeASTSignature(codeV1, 'service.ts');
      const sig2 = watcher.computeASTSignature(codeV2, 'service.ts');

      expect(sig1).toBe(sig2);
    });

    it('phát hiện thay đổi signature khi thêm method mới hoặc đổi kiểu tham số', () => {
      const codeV1 = `
        export class DiscountCalculatorService {
          public calculateDiscount(orderAmount: number): number {
            return orderAmount * 0.1;
          }
        }
      `;

      const codeV3 = `
        export class DiscountCalculatorService {
          public calculateDiscount(orderAmount: number, tier?: string): number {
            return orderAmount * 0.15;
          }
          public applyVoucher(code: string): boolean {
            return true;
          }
        }
      `;

      const sig1 = watcher.computeASTSignature(codeV1, 'service.ts');
      const sig3 = watcher.computeASTSignature(codeV3, 'service.ts');

      expect(sig1).not.toBe(sig3);
      expect(sig3).toContain('applyVoucher');
    });
  });

  describe('3. Manifest Realtime Settings Verification', () => {
    it('khai báo đầy đủ các configuration settings cho Realtime & CodeLens', () => {
      const pkgPath = path.resolve(__dirname, '../package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      const props = pkg.contributes.configuration.properties;
      expect(props['contextAwareTestGen.enableCodeLens']).toBeDefined();
      expect(props['contextAwareTestGen.autoGenerateOnSave']).toBeDefined();
      expect(props['contextAwareTestGen.debounceDelayMs']).toBeDefined();
    });
  });
});
