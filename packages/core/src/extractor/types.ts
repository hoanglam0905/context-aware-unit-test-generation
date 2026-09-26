import { PromptContext } from '../prompts/types';

/**
 * Thông tin chi tiết về tham số của phương thức
 */
export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
}

/**
 * Thông tin chi tiết về phương thức trong Class / Interface
 */
export interface MethodInfo {
  name: string;
  returnType: string;
  parameters: ParameterInfo[];
  visibility: 'public' | 'private' | 'protected';
  isAsync: boolean;
  isStatic: boolean;
  docComment?: string;
  bodySnippet?: string;
}

/**
 * Thông tin các thư viện / module được import
 */
export interface ImportInfo {
  moduleSpecifier: string;
  namedImports: string[];
  defaultImport?: string;
  isNamespace?: boolean;
}

/**
 * Thông tin Class trong mã nguồn
 */
export interface ClassInfo {
  name: string;
  isExported: boolean;
  extendsClass?: string;
  implementsInterfaces: string[];
  methods: MethodInfo[];
  properties: {
    name: string;
    type: string;
    visibility: 'public' | 'private' | 'protected';
    isStatic: boolean;
    isReadonly: boolean;
  }[];
  docComment?: string;
}

/**
 * Thông tin Type / Interface / Enum bổ trợ
 */
export interface TypeDefinitionInfo {
  name: string;
  kind: 'interface' | 'type' | 'enum';
  rawDefinition: string;
}

/**
 * Cấu trúc ngữ cảnh mã nguồn bóc tách từ AST
 */
export interface CodeContext {
  filePath?: string;
  classes: ClassInfo[];
  imports: ImportInfo[];
  typeDefinitions: TypeDefinitionInfo[];
  functions: MethodInfo[];
  rawSourceCode: string;
}

/**
 * Kịch bản kiểm thử Acceptance Criteria (Gherkin format)
 */
export interface GherkinScenario {
  title: string;
  given?: string[];
  when?: string[];
  then?: string[];
  and?: string[];
  examples?: Record<string, string>[];
}

/**
 * Cấu trúc tài liệu nghiệp vụ BA
 */
export interface RequirementContext {
  title: string;
  userStory?: string;
  businessRules: string[];
  scenarios: GherkinScenario[];
  constraints: string[];
  rawText: string;
}

/**
 * Payload ngữ cảnh tổng thể làm cầu nối giữa Core Engine, Prompt Strategies và Extension
 */
export interface ContextPayload {
  code: CodeContext;
  requirement?: RequirementContext;
  promptContext: PromptContext;
  metadata: {
    targetClassName?: string;
    targetMethodNames: string[];
    timestamp: string;
    sourceLanguage: string;
  };
}
