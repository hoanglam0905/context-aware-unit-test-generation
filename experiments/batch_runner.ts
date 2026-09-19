import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { PromptStrategyFactory } from '../packages/core/src/prompts';
import {
  ILLMGateway,
  GeminiGateway,
  OpenAICompatibleGateway,
} from '../packages/core/src/llm';

interface BenchmarkConfig {
  models: Array<{
    name: string;
    gateway: ILLMGateway;
  }>;
  strategies: Array<'zero-shot' | 'few-shot' | 'cot' | 'hybrid'>;
  datasetDir: string;
  outputDir: string;
}

/**
 * Script tự động quét toàn bộ benchmark dataset và thực hiện sinh test case
 */
export class BatchExperimentRunner {
  constructor(private readonly config: BenchmarkConfig) {}

  public async runAll(): Promise<void> {
    console.log('====================================================');
    console.log('🚀 BẮT ĐẦU CHẠY MA TRẬN THỰC NGHIỆM NCKH (THÀNH VIÊN A)');
    console.log(`Số model: ${this.config.models.length} | Chiến lược prompt: ${this.config.strategies.length}`);
    console.log('====================================================\n');

    // 1. Quét các sample services
    const services = this.findServices(this.config.datasetDir);
    console.log(`Tìm thấy ${services.length} bài toán service trong dataset:\n`);
    services.forEach(s => console.log(` - [${s.tier}] ${s.serviceId}`));

    const resultsSummary: any[] = [];

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
          console.log(`  ➔ Chạy: Model [${modelConfig.name}] | Prompt [${strategyName}]...`);

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
            const targetDir = path.join(
              this.config.outputDir,
              service.tier,
              service.serviceId,
              modelConfig.name,
              strategyName
            );
            fs.mkdirSync(targetDir, { recursive: true });

            const testFilePath = path.join(targetDir, 'generated.test.ts');
            fs.writeFileSync(testFilePath, result.testCode, 'utf-8');

            const logMetaPath = path.join(targetDir, 'metadata.json');
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
          `"${r.runId}","${r.service}","${r.tier}","${r.model}","${r.strategy}","${r.status}",${r.durationMs || 0},${r.totalTokens || 0},"${r.error || ''}"`
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

  // 1. Google Gemini
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    models.push({
      name: 'Gemini-1.5-Flash',
      gateway: new GeminiGateway(process.env.GEMINI_MODEL || 'gemini-1.5-flash', process.env.GEMINI_API_KEY),
    });
  }

  // 2. DeepSeek API
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here') {
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

  // 3. Ollama Local
  if (process.env.OLLAMA_BASE_URL && process.env.USE_OLLAMA === 'true') {
    models.push({
      name: 'Ollama-Local',
      gateway: new OpenAICompatibleGateway(
        'Ollama',
        process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b',
        'ollama',
        process.env.OLLAMA_BASE_URL
      ),
    });
  }

  // 4. OpenAI
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    models.push({
      name: 'OpenAI-GPT-4o-mini',
      gateway: new OpenAICompatibleGateway(
        'OpenAI',
        process.env.OPENAI_MODEL || 'gpt-4o-mini',
        process.env.OPENAI_API_KEY
      ),
    });
  }

  if (models.length === 0) {
    console.warn('\n⚠️  CHƯA CÓ API KEY HỢP LỆ TRONG FILE .env!');
    console.log('👉 Hướng dẫn kích hoạt:');
    console.log('   1. Mở file .env');
    console.log('   2. Điền GEMINI_API_KEY (lấy miễn phí tại https://aistudio.google.com/app/apikey)');
    console.log('   3. Hoặc điền DEEPSEEK_API_KEY / OPENAI_API_KEY');
    console.log('   4. Sau đó chạy lại: npm run experiment:batch\n');
    return;
  }

  const runner = new BatchExperimentRunner({
    models,
    strategies: ['zero-shot', 'few-shot', 'cot', 'hybrid'],
    datasetDir: path.join(__dirname, 'dataset'),
    outputDir: path.join(__dirname, 'results'),
  });

  await runner.runAll();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error running experiment:', err);
    process.exit(1);
  });
}

