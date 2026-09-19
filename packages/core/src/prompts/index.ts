export * from './types';
export * from './zero-shot';
export * from './few-shot';
export * from './chain-of-thought';
export * from './hybrid';

import { IPromptStrategy } from './types';
import { ZeroShotPromptStrategy } from './zero-shot';
import { FewShotPromptStrategy } from './few-shot';
import { ChainOfThoughtPromptStrategy } from './chain-of-thought';
import { HybridPromptStrategy } from './hybrid';

export class PromptStrategyFactory {
  private static readonly strategies: Record<string, IPromptStrategy> = {
    'zero-shot': new ZeroShotPromptStrategy(),
    'few-shot': new FewShotPromptStrategy(),
    'cot': new ChainOfThoughtPromptStrategy(),
    'hybrid': new HybridPromptStrategy(),
  };

  public static getStrategy(name: 'zero-shot' | 'few-shot' | 'cot' | 'hybrid'): IPromptStrategy {
    const strategy = this.strategies[name];
    if (!strategy) {
      throw new Error(`Unknown prompt strategy: ${name}`);
    }
    return strategy;
  }
}
