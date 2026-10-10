import * as path from 'path';
import * as fs from 'fs';
import { GeminiGateway, OpenAICompatibleGateway, ILLMGateway } from '../../../core/src/llm';
import { ExtensionConfiguration } from '../types';
import { vscode } from '../vscode_shim';

let dotenv: any = null;
try {
  dotenv = require('dotenv');
} catch {
  dotenv = null;
}

function parseSimpleEnv(content: string): void {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

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
        if (dotenv && dotenv.config) {
          dotenv.config({ path: envPath });
        } else {
          parseSimpleEnv(fs.readFileSync(envPath, 'utf-8'));
        }
      }
    }
    // Fallback load cwd .env
    const cwdEnv = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(cwdEnv)) {
      if (dotenv && dotenv.config) {
        dotenv.config({ path: cwdEnv });
      } else {
        parseSimpleEnv(fs.readFileSync(cwdEnv, 'utf-8'));
      }
    }
  }

  /**
   * Lấy cấu hình đầy đủ từ VS Code Settings và Environment
   */
  public getConfiguration(): ExtensionConfiguration {
    this.loadEnvFallback();

    const config = vscode.workspace.getConfiguration('contextAwareTestGen');
    let modelProvider = config.get('modelProvider', 'ollama') as ExtensionConfiguration['modelProvider'];
    if (process.env.USE_OLLAMA === 'true' || !modelProvider) {
      modelProvider = 'ollama';
    }
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

    const adapterPath = (config.get('adapterPath') as string) || process.env.ADAPTER_PATH;
    const fineTunedModel = (config.get('fineTunedModel') as string) || process.env.FINE_TUNED_MODEL;

    return {
      modelProvider,
      promptStrategy,
      autoRunCoverage,
      apiKey,
      customEndpoint,
      adapterPath,
      fineTunedModel,
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
        const modelName = config.fineTunedModel || process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b';
        return new OpenAICompatibleGateway('Ollama', modelName, 'ollama', baseUrl);
      }
      case 'gemini': {
        const apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
        const modelName = config.fineTunedModel || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        return new GeminiGateway({ apiKey, modelName });
      }
      case 'deepseek': {
        const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
        const modelName = config.fineTunedModel || 'deepseek-coder';
        return new OpenAICompatibleGateway('DeepSeek', modelName, apiKey, 'https://api.deepseek.com/v1');
      }
      case 'openai':
      default: {
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
        const modelName = config.fineTunedModel || 'gpt-4o';
        return new OpenAICompatibleGateway('OpenAI', modelName, apiKey);
      }
    }
  }
}
