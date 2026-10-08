import { ILLMGateway, LLMResponse } from './types';

/**
 * Trích xuất code block ```typescript ... ``` từ chuỗi văn bản
 */
export function extractCodeBlock(text: string): string {
  // 1. Tìm code block markdown có định danh ngôn ngữ bất kỳ (ví dụ: ```go, ```python, ```java, ```csharp, ```typescript)
  const typedMatch = text.match(/```(?:[a-zA-Z0-9_+#.-]+)?\s*\n([\s\S]*?)```/);
  if (typedMatch && typedMatch[1]) {
    const candidate = typedMatch[1].trim();
    if (candidate.length > 0 && !candidate.startsWith('// Complete, runnable') && !candidate.startsWith('PUT_ACTUAL')) {
      return candidate;
    }
  }

  // 2. Generic code block ``` ... ```
  const genericMatch = text.match(/```\s*([\s\S]*?)```/);
  if (genericMatch && genericMatch[1]) {
    const candidate = genericMatch[1].trim();
    if (candidate.length > 0 && !candidate.startsWith('// Complete, runnable') && !candidate.startsWith('PUT_ACTUAL')) {
      return candidate;
    }
  }

  // 3. Nếu không có markdown ticks, kiểm tra xem có phải trực tiếp mã nguồn không
  if (
    text.includes('package ') ||
    text.includes('func Test') ||
    text.includes('def test_') ||
    text.includes('@Test') ||
    text.includes('[Fact]') ||
    text.includes('describe(') ||
    text.includes('it(') ||
    text.includes('import ')
  ) {
    return text.trim();
  }

  return text.trim();
}

/**
 * Parser an toàn cho định dạng phản hồi JSON
 */
export function parseHybridJson(text: string): {
  testCode: string;
  testScenarios?: any[];
  reasoningSteps?: string[];
} {
  try {
    // Tìm cụm JSON đầu tiên trong response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let extractedCode = parsed.testCode ? extractCodeBlock(parsed.testCode) : '';

      // Fallback: nếu testCode là placeholder comment hoặc quá ngắn, tìm markdown code block trong text gốc
      const isPlaceholder = !extractedCode ||
        extractedCode.startsWith('// Complete, runnable') ||
        extractedCode.startsWith('PUT_ACTUAL') ||
        extractedCode.includes('// Complete, runnable test file') ||
        extractedCode.length < 50;

      if (isPlaceholder) {
        const fromMarkdown = extractCodeBlock(text);
        if (fromMarkdown && fromMarkdown.length > 50 && !fromMarkdown.includes('// Complete, runnable test file')) {
          extractedCode = fromMarkdown;
        }
      }

      return {
        testCode: extractedCode,
        testScenarios: parsed.testScenarios || [],
        reasoningSteps: parsed.reasoningSteps || [],
      };
    }
  } catch (err) {
    // Fallback: nếu LLM sinh JSON hỏng cú pháp, dùng regex trích xuất codeblock
  }

  return {
    testCode: extractCodeBlock(text),
  };
}

/**
 * Gateway hỗ trợ OpenAI format (Tương thích với: OpenAI, DeepSeek API, Ollama Local)
 */
export class OpenAICompatibleGateway implements ILLMGateway {
  constructor(
    public readonly providerName: string,
    public readonly modelName: string,
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://api.openai.com/v1',
    private readonly temperature: number = 0.2
  ) {}

  public async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 1;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        // Timeout 120 giây cho Ollama / Local LLM (trên CPU), 60 giây cho Cloud API
        const timeoutMs = this.providerName.toLowerCase().includes('ollama') ? 120000 : 60000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.modelName,
            temperature: this.temperature,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LLM API Error [${this.providerName} - ${response.status}]: ${errorText}`);
        }

        const data: any = await response.json();
        const durationMs = Date.now() - startTime;
        const rawText = data.choices?.[0]?.message?.content || '';

        const parsedJson = parseHybridJson(rawText);

        return {
          rawText,
          testCode: parsedJson.testCode || extractCodeBlock(rawText),
          testScenarios: parsedJson.testScenarios,
          reasoningSteps: parsedJson.reasoningSteps,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          } : undefined,
          durationMs,
        };
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          const isTimeout = err.name === 'AbortError' || err.message.includes('aborted');
          if (isTimeout) {
            const timeoutSec = this.providerName.toLowerCase().includes('ollama') ? 120 : 60;
            throw new Error(
              `Quá thời gian chờ (${this.providerName} không phản hồi sau ${timeoutSec}s). ` +
              `Nếu dùng Ollama, vui lòng kiểm tra Docker/Ollama có đang chạy không. ` +
              `Hoặc chuyển Model Provider sang "gemini" trong Cài đặt để sinh siêu nhanh (2s).`
            );
          }
          throw err;
        }
        console.log(`    ⚠️ [${this.providerName}] Kết nối bị gián đoạn (${err.message}). Đang thử lại lần ${attempts + 1}/${maxAttempts}...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw new Error(`Failed to generate response after ${maxAttempts} attempts.`);
  }
}

/**
 * Gateway kết nối Google Gemini API (Miễn phí qua Google AI Studio)
 */
export class GeminiGateway implements ILLMGateway {
  public readonly providerName = 'Google-Gemini';

  constructor(
    public readonly modelName: string = 'gemini-1.5-flash',
    private readonly apiKey: string,
    private readonly temperature: number = 0.2
  ) {}

  public async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelPath = this.modelName.startsWith('models/') ? this.modelName : `models/${this.modelName}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${this.apiKey}`;

    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      attempts++;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: this.temperature,
          },
        }),
      });

      if (response.status === 429 || response.status === 503) {
        const errorText = await response.text();
        // Kiểm tra xem có retryDelay trong phản hồi không
        let delaySec = 15 * attempts;
        const retryMatch = errorText.match(/retry in ([0-9.]+)s/i) || errorText.match(/"retryDelay":\s*"([0-9]+)s"/i);
        if (retryMatch && retryMatch[1]) {
          delaySec = Math.ceil(parseFloat(retryMatch[1])) + 2;
        }

        console.log(`    ⏳ [Rate Limit ${response.status}] Đang chờ ${delaySec}s trước khi thử lại lần ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error [${response.status}]: ${errorText}`);
      }

      const data: any = await response.json();
      const durationMs = Date.now() - startTime;
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const parsedJson = parseHybridJson(rawText);

      return {
        rawText,
        testCode: parsedJson.testCode || extractCodeBlock(rawText),
        testScenarios: parsedJson.testScenarios,
        reasoningSteps: parsedJson.reasoningSteps,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        } : undefined,
        durationMs,
      };
    }

    throw new Error(`Đã thử ${maxAttempts} lần nhưng vẫn gặp Rate Limit từ Gemini API.`);
  }
}

/**
 * Mock Gateway phục vụ kiểm thử pipeline & chạy CI/CD offline không tốn API token
 */
export class MockGateway implements ILLMGateway {
  public readonly providerName = 'Mock-LLM';
  public readonly modelName = 'mock-code-v1';

  constructor(private readonly simulatedDelayMs: number = 300) {}

  public async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));

    const mockTestCode = `// [Auto-Generated by MockGateway]
describe('MockSuite', () => {
  it('should pass simulated check', () => {
    expect(true).toBe(true);
  });
});`;

    const durationMs = Date.now() - startTime;

    return {
      rawText: mockTestCode,
      testCode: mockTestCode,
      testScenarios: [
        {
          id: 'MOCK-001',
          acceptanceCriteriaRef: 'AC-Simulated',
          category: 'HAPPY_PATH',
          description: 'Simulated unit test generation for offline pipeline verification',
          expectedBehavior: 'Pass',
        },
      ],
      reasoningSteps: [
        'Step 1: Mock parsed context successfully',
        'Step 2: Generated valid Jest test mock',
      ],
      usage: {
        promptTokens: 120,
        completionTokens: 85,
        totalTokens: 205,
      },
      durationMs,
    };
  }
}

