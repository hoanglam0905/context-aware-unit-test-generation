/**
 * Các loại message gửi từ Webview sang Extension Host
 */
export type WebviewToHostMessage =
  | { type: 'GENERATE_TEST'; payload: { servicePath?: string; requirementPath?: string; strategy: string } }
  | { type: 'ACCEPT_TEST'; payload?: { testCode?: string; outputPath?: string; selectedScenarioIds?: string[] } }
  | { type: 'REJECT_TEST' }
  | { type: 'TOGGLE_SCENARIO'; payload: { scenarioId: string; selected: boolean } }
  | { type: 'FILTER_SELECTION'; payload?: { selectedScenarioIds?: string[] } }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'RUN_COVERAGE'; payload: { testFilePath: string } };

/**
 * Các loại message gửi từ Extension Host sang Webview
 */
export type HostToWebviewMessage =
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
  | { type: 'UPDATE_FILTERED_CODE'; payload: { testCode: string } }
  | {
      type: 'SET_PREVIEW_DATA';
      payload: {
        serviceName: string;
        strategy: string;
        isReadOnly?: boolean;
        scenarios: Array<{
          id: string;
          description: string;
          category?: string;
          acceptanceCriteriaRef?: string;
          expectedBehavior?: string;
          selected?: boolean;
        }>;
        testCode: string;
        coverage?: {
          lines: number;
          branches: number;
        };
        syntaxValid: boolean;
      };
    }
  | { type: 'SHOW_ERROR'; payload: { error: string } }
  | { type: 'UPDATE_CONFIG'; payload: Record<string, any> };

/**
 * Cấu hình của Extension
 */
export interface ExtensionConfiguration {
  modelProvider: 'gemini' | 'deepseek' | 'openai' | 'ollama';
  promptStrategy: 'zero-shot' | 'few-shot' | 'cot' | 'hybrid';
  autoRunCoverage: boolean;
  apiKey?: string;
  customEndpoint?: string;
  adapterPath?: string;
  fineTunedModel?: string;
}
