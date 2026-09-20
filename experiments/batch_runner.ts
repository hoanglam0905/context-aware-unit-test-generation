import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { PromptStrategyFactory } from '../packages/core/src/prompts';
import {
  ILLMGateway,
  GeminiGateway,
  OpenAICompatibleGateway,
  MockGateway,
} from '../packages/core/src/llm';

interface BenchmarkConfig {
  models: Array<{
    name: string;
    gateway: ILLMGateway;
  }>;
  strategies: Array<'zero-shot' | 'few-shot' | 'cot' | 'hybrid'>;
  datasetDir: string;
  outputDir: string;
  throttlingDelayMs?: number; // Độ trễ giữa các request tránh chạm Rate Limit 429
  skipIfExists?: boolean;     // Tiếp tục chạy từ checkpoint nếu file đã sinh thành công
}

/**
 * Script tự động quét toàn bộ benchmark dataset và thực hiện sinh test case
 */
export class BatchExperimentRunner {
  private readonly delayMs: number;
  private readonly skipIfExists: boolean;

  constructor(private readonly config: BenchmarkConfig) {
    this.delayMs = config.throttlingDelayMs ?? 15000; // Mặc định nghỉ 15s giữa các lần gọi
    this.skipIfExists = config.skipIfExists ?? true;  // Mặc định bỏ qua các run đã sinh thành công
  }

  public async runAll(): Promise<void> {
    console.log('====================================================');
    console.log('🚀 BẮT ĐẦU CHẠY MA TRẬN THỰC NGHIỆM NCKH (THÀNH VIÊN A)');
    console.log(`Số model: ${this.config.models.length} | Chiến lược prompt: ${this.config.strategies.length}`);
    console.log(`Throttling: ${this.delayMs}ms | Checkpoint Resume: ${this.skipIfExists ? 'BẬT' : 'TẮT'}`);
    console.log('====================================================\n');

    // 1. Quét các sample services
    const services = this.findServices(this.config.datasetDir);
    console.log(`Tìm thấy ${services.length} bài toán service trong dataset:\n`);
    services.forEach(s => console.log(` - [${s.tier}] ${s.serviceId}`));

    const resultsSummary: any[] = [];
    let executedCount = 0;

    // 2. Chạy ma trận: Model x Strategy x Service
    for (const service of services) {
      console.log(`\n\n🔹 ĐANG XỬ LÝ: [${service.tier}] ${service.serviceId}`);
      const serviceCode = fs.readFileSync(service.servicePath, 'utf-8');
      const requirementDoc = fs.existsSync(service.reqPath)
        ? fs.readFileSync(service.reqPath, 'utf-8')
        : '';

      for (const modelConfig of this.config.models) {
        for (const strategyName of this.config.strategies) {
          const runId = `${service.serviceId}__${modelConfig.name}__${strategyName}`;
          // Windows không cho phép dấu hai chấm ':' trong tên thư mục
          const safeModelDir = modelConfig.name.replace(/[:\/\\?*|"<>]/g, '_');
          const targetDir = path.join(
            this.config.outputDir,
            service.tier,
            service.serviceId,
            safeModelDir,
            strategyName
          );
          const testFilePath = path.join(targetDir, 'generated.test.ts');
          const logMetaPath = path.join(targetDir, 'metadata.json');

          // Checkpoint Resume: nếu đã sinh thành công và có file kết quả, bỏ qua
          if (this.skipIfExists && fs.existsSync(testFilePath) && fs.existsSync(logMetaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(logMetaPath, 'utf-8'));
              console.log(`  ⏩ [Checkpoint] Bỏ qua ${runId} (Đã hoàn thành trước đó)`);
              resultsSummary.push({
                runId,
                service: service.serviceId,
                tier: service.tier,
                model: modelConfig.name,
                strategy: strategyName,
                durationMs: meta.durationMs || 0,
                totalTokens: meta.usage?.totalTokens || 0,
                status: 'SUCCESS (CACHED)',
              });
              continue;
            } catch (e) {
              // Nếu file meta hỏng thì chạy lại bình thường
            }
          }

          // Giãn cách thời gian nếu không phải request đầu tiên
          if (executedCount > 0 && this.delayMs > 0) {
            console.log(`  ⏳ [Throttling] Tạm nghỉ ${this.delayMs / 1000}s để bảo đảm hạn mức API quota...`);
            await new Promise(resolve => setTimeout(resolve, this.delayMs));
          }

          console.log(`  ➔ Chạy: Model [${modelConfig.name}] | Prompt [${strategyName}]...`);
          executedCount++;

          try {
            const strategy = PromptStrategyFactory.getStrategy(strategyName);
            const promptPayload = strategy.buildPrompt({
              serviceCode,
              requirementDoc,
              className: service.serviceId,
            });

            const result = await modelConfig.gateway.generate(
              promptPayload.systemPrompt,
              promptPayload.userPrompt
            );

            // Ghi file test sinh ra
            fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(testFilePath, result.testCode, 'utf-8');

            fs.writeFileSync(
              logMetaPath,
              JSON.stringify(
                {
                  runId,
                  durationMs: result.durationMs,
                  usage: result.usage,
                  scenariosCount: result.testScenarios?.length || 0,
                  generatedAt: new Date().toISOString(),
                },
                null,
                2
              ),
              'utf-8'
            );

            resultsSummary.push({
              runId,
              service: service.serviceId,
              tier: service.tier,
              model: modelConfig.name,
              strategy: strategyName,
              durationMs: result.durationMs,
              totalTokens: result.usage?.totalTokens || 0,
              status: 'SUCCESS',
            });

            console.log(`    ✅ Hoàn thành (${result.durationMs}ms, ${result.usage?.totalTokens || 0} tokens)`);
          } catch (error: any) {
            console.error(`    ❌ Lỗi: ${error.message}`);
            resultsSummary.push({
              runId,
              service: service.serviceId,
              tier: service.tier,
              model: modelConfig.name,
              strategy: strategyName,
              status: 'ERROR',
              error: error.message,
            });
          }
        }
      }
    }

    // 3. Xuất file kết quả tổng hợp CSV
    const csvHeader = 'RunId,Service,Tier,Model,Strategy,Status,DurationMs,TotalTokens,Error\n';
    const csvRows = resultsSummary
      .map(
        r =>
          `"${r.runId}","${r.service}","${r.tier}","${r.model}","${r.strategy}","${r.status}",${r.durationMs || 0},${r.totalTokens || 0},"${(r.error || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    fs.mkdirSync(this.config.outputDir, { recursive: true });
    fs.writeFileSync(path.join(this.config.outputDir, 'batch_summary.csv'), csvHeader + csvRows, 'utf-8');
    console.log(`\n🎉 ĐÃ HOÀN TẤT THỰC NGHIỆM! Báo cáo lưu tại: ${path.join(this.config.outputDir, 'batch_summary.csv')}`);
  }

  private findServices(dir: string): Array<{ serviceId: string; tier: string; servicePath: string; reqPath: string }> {
    const list: Array<{ serviceId: string; tier: string; servicePath: string; reqPath: string }> = [];
    const tiers = ['simple', 'medium', 'complex'];

    for (const tier of tiers) {
      const tierPath = path.join(dir, tier);
      if (!fs.existsSync(tierPath)) continue;

      const items = fs.readdirSync(tierPath);
      for (const item of items) {
        const itemPath = path.join(tierPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const servicePath = path.join(itemPath, 'service.ts');
          const reqPath = path.join(itemPath, 'requirement.md');
          if (fs.existsSync(servicePath)) {
            list.push({
              serviceId: item,
              tier,
              servicePath,
              reqPath,
            });
          }
        }
      }
    }

    return list;
  }
}

async function main() {
  const models: Array<{ name: string; gateway: ILLMGateway }> = [];

  // 1. Ollama Local (Chạy qua Docker container)
  if (process.env.USE_OLLAMA === 'true' && process.env.OLLAMA_BASE_URL) {
    models.push({
      name: `Ollama-${process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b'}`,
      gateway: new OpenAICompatibleGateway(
        'Ollama',
        process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b',
        'ollama',
        process.env.OLLAMA_BASE_URL
      ),
    });
  }

  // 2. Google Gemini (Chỉ kích hoạt nếu không chỉ định USE_OLLAMA)
  if (process.env.USE_OLLAMA !== 'true' && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    models.push({
      name: 'Gemini-1.5-Flash',
      gateway: new GeminiGateway(process.env.GEMINI_MODEL || 'gemini-1.5-flash', process.env.GEMINI_API_KEY),
    });
  }

  // 3. DeepSeek API
  if (process.env.USE_OLLAMA !== 'true' && process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here') {
    models.push({
      name: 'DeepSeek-Coder',
      gateway: new OpenAICompatibleGateway(
        'DeepSeek',
        process.env.DEEPSEEK_MODEL || 'deepseek-coder',
        process.env.DEEPSEEK_API_KEY,
        process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
      ),
    });
  }

  // 4. OpenAI
  if (process.env.USE_OLLAMA !== 'true' && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    models.push({
      name: 'OpenAI-GPT-4o-mini',
      gateway: new OpenAICompatibleGateway(
        'OpenAI',
        process.env.OPENAI_MODEL || 'gpt-4o-mini',
        process.env.OPENAI_API_KEY
      ),
    });
  }

  // 5. Mock Gateway (Kiểm thử offline pipeline hoàn toàn không tốn token)
  if (process.env.USE_MOCK_LLM === 'true' || models.length === 0 && !process.env.GEMINI_API_KEY) {
    models.push({
      name: 'Mock-LLM-Simulator',
      gateway: new MockGateway(150),
    });
  }

  if (models.length === 0) {
    console.warn('\n⚠️  CHƯA CÓ API KEY HỢP LỆ TRONG FILE .env!');
    console.log('👉 Hướng dẫn kích hoạt:');
    console.log('   1. Mở file .env');
    console.log('   2. Điền GEMINI_API_KEY (lấy miễn phí tại https://aistudio.google.com/app/apikey)');
    console.log('   3. Hoặc điền DEEPSEEK_API_KEY / OPENAI_API_KEY');
    console.log('   4. Hoặc đặt USE_MOCK_LLM=true để chạy thử nghiệm offline');
    console.log('   5. Sau đó chạy lại: npm run experiment:batch\n');
    return;
  }

  const delay = parseInt(process.env.THROTTLING_DELAY_MS || '15000', 10);

  const runner = new BatchExperimentRunner({
    models,
    strategies: ['zero-shot', 'few-shot', 'cot', 'hybrid'],
    datasetDir: path.join(__dirname, 'dataset'),
    outputDir: path.join(__dirname, 'results'),
    throttlingDelayMs: delay,
    skipIfExists: process.env.SKIP_EXISTING_RUNS !== 'false',
  });

  await runner.runAll();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error running experiment:', err);
    process.exit(1);
  });
}

