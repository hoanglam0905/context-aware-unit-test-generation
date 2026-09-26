import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { GeminiGateway, OpenAICompatibleGateway, ILLMGateway } from '../../../core/src/llm';
import { ExtensionConfiguration } from '../types';
import { vscode } from '../vscode_shim';

export class ConfigurationManager {
  private static instance: ConfigurationManager;

  private constructor() {
    this.loadEnvFallback();
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Tải biến môi trường từ .env của workspace nếu có
   */
  private loadEnvFallback(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const rootPath = workspaceFolders[0].uri.fsPath;
      const envPath = path.join(rootPath, '.env');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }
    }
    // Fallback load cwd .env
    const cwdEnv = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(cwdEnv)) {
      dotenv.config({ path: cwdEnv });
    }
  }

  /**
   * Lấy cấu hình đầy đủ từ VS Code Settings và Environment
   */
  public getConfiguration(): ExtensionConfiguration {
    this.loadEnvFallback();

    const config = vscode.workspace.getConfiguration('contextAwareTestGen');
    
    // Tự động ưu tiên Ollama nếu trong .env có USE_OLLAMA=true
    let defaultProvider: ExtensionConfiguration['modelProvider'] = 'gemini';
    if (process.env.USE_OLLAMA === 'true') {
      defaultProvider = 'ollama';
    }

    const modelProvider = config.get('modelProvider', defaultProvider) as ExtensionConfiguration['modelProvider'];
    const promptStrategy = config.get('promptStrategy', 'hybrid') as ExtensionConfiguration['promptStrategy'];
    const autoRunCoverage = config.get('autoRunCoverage', true) as boolean;

    const apiKey =
      config.get('apiKey') ||
      (modelProvider === 'gemini'
        ? process.env.GEMINI_API_KEY
        : modelProvider === 'deepseek'
        ? process.env.DEEPSEEK_API_KEY
        : process.env.OPENAI_API_KEY);

    const customEndpoint =
      config.get('customEndpoint') ||
      (modelProvider === 'ollama' ? process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1' : undefined);

    return {
      modelProvider,
      promptStrategy,
      autoRunCoverage,
      apiKey,
      customEndpoint,
    };
  }

  /**
   * Khởi tạo LLM Gateway tương ứng với cấu hình
   */
  public createLLMGateway(): ILLMGateway {
    const config = this.getConfiguration();

    switch (config.modelProvider) {
      case 'ollama': {
        const baseUrl = config.customEndpoint || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
        const modelName = process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b';
        return new OpenAICompatibleGateway('Ollama', modelName, 'ollama', baseUrl);
      }
      case 'gemini': {
        const apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
        return new GeminiGateway(apiKey, 'gemini-1.5-flash');
      }
      case 'deepseek': {
        const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
        return new OpenAICompatibleGateway('DeepSeek', 'deepseek-coder', apiKey, 'https://api.deepseek.com/v1');
      }
      case 'openai':
      default: {
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
        return new OpenAICompatibleGateway('OpenAI', 'gpt-4o', apiKey);
      }
    }
  }
}
