import * as fs from 'fs';
import * as path from 'path';
import { PromptContext } from '../prompts/types';
import { UniversalCodeParser } from './universal_ast_parser';
import { RequirementParser } from './requirement_parser';
import { LanguageDetector } from './language_detector';
import { CodeContext, ContextPayload, RequirementContext } from './types';

export interface ExtractOptions {
  serviceFilePath?: string;
  serviceCode?: string;
  requirementFilePath?: string;
  requirementDoc?: string;
  existingTestPatterns?: string;
  targetClassName?: string;
}

export class ContextExtractor {
  private universalParser: UniversalCodeParser;
  private reqParser: RequirementParser;

  constructor(universalParser?: UniversalCodeParser, reqParser?: RequirementParser) {
    this.universalParser = universalParser || new UniversalCodeParser();
    this.reqParser = reqParser || new RequirementParser();
  }

  /**
   * Trích xuất ngữ cảnh toàn diện từ code đa ngôn ngữ và tài liệu BA
   */
  public extract(options: ExtractOptions): ContextPayload {
    // 1. Đọc nội dung source code
    let rawCode = options.serviceCode || '';
    if (!rawCode && options.serviceFilePath && fs.existsSync(options.serviceFilePath)) {
      rawCode = fs.readFileSync(options.serviceFilePath, 'utf-8');
    }

    const fileName = options.serviceFilePath ? path.basename(options.serviceFilePath) : 'service.ts';
    const langInfo = LanguageDetector.detectLanguage(fileName);
    const codeContext: CodeContext = this.universalParser.parse(rawCode, fileName);

    // 2. Đọc nội dung tài liệu BA
    let rawRequirement = options.requirementDoc || '';
    if (!rawRequirement && options.requirementFilePath && fs.existsSync(options.requirementFilePath)) {
      rawRequirement = fs.readFileSync(options.requirementFilePath, 'utf-8');
    }

    let requirementContext: RequirementContext | undefined;
    if (rawRequirement.trim().length > 0) {
      requirementContext = this.reqParser.parse(rawRequirement);
    }

    // 3. Xác định target class & target methods
    const mainClass = options.targetClassName
      ? codeContext.classes.find((c) => c.name === options.targetClassName)
      : codeContext.classes[0];

    const targetClassName = mainClass ? mainClass.name : undefined;
    const targetMethodNames = mainClass
      ? mainClass.methods.map((m) => m.name)
      : codeContext.functions.map((f) => f.name);

    // 4. Tạo PromptContext chuẩn hóa tương thích với LLM Prompt Strategy
    const promptContext: PromptContext = {
      serviceCode: rawCode,
      requirementDoc: rawRequirement.trim().length > 0 ? rawRequirement : undefined,
      existingTestPatterns: options.existingTestPatterns,
      className: targetClassName,
      sourceLanguage: langInfo.name,
      testFramework: langInfo.defaultTestFramework,
    };

    return {
      code: codeContext,
      requirement: requirementContext,
      promptContext,
      metadata: {
        targetClassName,
        targetMethodNames,
        timestamp: new Date().toISOString(),
        sourceLanguage: langInfo.id,
      },
    };
  }

  /**
   * Tạo tóm tắt ngữ cảnh dạng chuỗi ngắn gọn phục vụ preview hoặc logging
   */
  public formatSummary(payload: ContextPayload): string {
    const lines: string[] = [];
    lines.push(`📦 [Context Summary] Target: ${payload.metadata.targetClassName || 'Global'} (${payload.metadata.sourceLanguage})`);
    lines.push(`🔹 Classes found: ${payload.code.classes.length}`);
    payload.code.classes.forEach((c) => {
      lines.push(`   - Class: ${c.name} (${c.methods.length} methods, ${c.properties.length} properties)`);
    });
    lines.push(`🔹 Functions found: ${payload.code.functions.length} standalone functions`);

    if (payload.requirement) {
      lines.push(`📄 Requirement: ${payload.requirement.title}`);
      lines.push(`   - Business Rules: ${payload.requirement.businessRules.length} rules`);
      lines.push(`   - Acceptance Scenarios: ${payload.requirement.scenarios.length} scenarios`);
    } else {
      lines.push(`📄 Requirement: Not provided (Baseline mode)`);
    }

    return lines.join('\n');
  }
}
