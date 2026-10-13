import * as fs from 'fs';
import * as path from 'path';
import { PromptContext, MethodSlice } from '../prompts/types';
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
  targetMethodName?: string;
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

    // 3. Trích xuất Method Slice nếu có targetMethodName
    let targetMethodSlice: MethodSlice | undefined;
    if (options.targetMethodName) {
      if (options.targetClassName) {
        // Chỉ định rõ Class mục tiêu: tìm kiếm chính xác trong class này
        const targetCls = codeContext.classes.find((c) => c.name === options.targetClassName);
        if (!targetCls) {
          throw new Error(`Target class "${options.targetClassName}" was not found in service code.`);
        }
        const found = targetCls.methods.find((m) => m.name === options.targetMethodName);
        if (!found) {
          throw new Error(`Target method "${options.targetMethodName}" was not found in class "${options.targetClassName}".`);
        }
        const paramsStr = found.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
        targetMethodSlice = {
          className: targetCls.name,
          methodName: found.name,
          visibility: found.visibility,
          parameters: found.parameters,
          returnType: found.returnType,
          signature: `${found.visibility ?? 'public'} ${found.name}(${paramsStr}): ${found.returnType}`,
          sourceSlice: found.sourceSlice || (found.bodySnippet ? `${found.name}(${paramsStr}) ${found.bodySnippet}` : undefined),
        };
      } else {
        // Không chỉ định Class: quét tất cả các class để phát hiện ambiguity nếu có nhiều hơn 1 class chứa method trùng tên
        const matchingClasses = codeContext.classes.filter((c) => c.methods.some((m) => m.name === options.targetMethodName));
        if (matchingClasses.length > 1) {
          const classNames = matchingClasses.map((c) => c.name).join(', ');
          throw new Error(
            `Ambiguous method "${options.targetMethodName}" found in multiple classes (${classNames}). Please specify targetClassName.`
          );
        }

        if (matchingClasses.length === 1) {
          const cls = matchingClasses[0];
          const found = cls.methods.find((m) => m.name === options.targetMethodName)!;
          const paramsStr = found.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
          targetMethodSlice = {
            className: cls.name,
            methodName: found.name,
            visibility: found.visibility,
            parameters: found.parameters,
            returnType: found.returnType,
            signature: `${found.visibility ?? 'public'} ${found.name}(${paramsStr}): ${found.returnType}`,
            sourceSlice: found.sourceSlice || (found.bodySnippet ? `${found.name}(${paramsStr}) ${found.bodySnippet}` : undefined),
          };
        } else {
          // Kiểm tra hàm độc lập ngoài class (standalone functions)
          const foundFunc = codeContext.functions.find((f) => f.name === options.targetMethodName);
          if (foundFunc) {
            const paramsStr = foundFunc.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
            targetMethodSlice = {
              methodName: foundFunc.name,
              parameters: foundFunc.parameters,
              returnType: foundFunc.returnType,
              signature: `function ${foundFunc.name}(${paramsStr}): ${foundFunc.returnType}`,
              sourceSlice: foundFunc.sourceSlice || (foundFunc.bodySnippet ? `function ${foundFunc.name}(${paramsStr}) ${foundFunc.bodySnippet}` : undefined),
            };
          }
        }
      }

      if (!targetMethodSlice) {
        throw new Error(`Target method "${options.targetMethodName}" was not found in service code.`);
      }
    }

    const mainClass = targetMethodSlice?.className
      ? codeContext.classes.find((c) => c.name === targetMethodSlice.className)
      : options.targetClassName
        ? codeContext.classes.find((c) => c.name === options.targetClassName)
        : codeContext.classes[0];

    const targetClassName = mainClass ? mainClass.name : undefined;
    const targetMethodNames = options.targetMethodName
      ? [options.targetMethodName]
      : mainClass
        ? mainClass.methods.map((m) => m.name)
        : codeContext.functions.map((f) => f.name);

    // 4. Tạo AST Summary
    const astSummary = this.buildAstSummary(codeContext, targetMethodSlice);

    // 5. Tạo PromptContext chuẩn hóa tương thích với LLM Prompt Strategy
    const promptContext: PromptContext = {
      serviceCode: rawCode,
      requirementDoc: rawRequirement.trim().length > 0 ? rawRequirement : undefined,
      existingTestPatterns: options.existingTestPatterns,
      className: targetClassName,
      targetMethodName: options.targetMethodName,
      targetMethodSlice,
      sourceLanguage: langInfo.name,
      testFramework: langInfo.defaultTestFramework,
      astSummary,
      ablationMode: 'full',
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
   * Tạo tóm tắt cấu trúc AST (Classes, methods, properties, signatures) cho Prompt
   */
  public buildAstSummary(codeContext: CodeContext, targetMethodSlice?: MethodSlice): string {
    const lines: string[] = [];
    if (targetMethodSlice) {
      lines.push('=== TARGET METHOD UNDER TEST (METHOD-LEVEL SCOPE) ===');
      lines.push(`Focus Class: ${targetMethodSlice.className ?? 'Global'}`);
      lines.push(`Focus Signature: ${targetMethodSlice.signature}`);
      if (targetMethodSlice.sourceSlice) {
        lines.push('Target Method Implementation Source:');
        lines.push(targetMethodSlice.sourceSlice);
      }
      lines.push('=====================================================\n');
    }
    if (codeContext.classes && codeContext.classes.length > 0) {
      lines.push(targetMethodSlice ? '=== SURROUNDING CONTEXT & DEPENDENCIES (NOT DIRECTLY UNDER TEST) ===\nClasses:' : 'Classes:');
      for (const cls of codeContext.classes) {
        lines.push(`- Class ${cls.name}:`);
        if (cls.properties && cls.properties.length > 0) {
          lines.push('  Properties:');
          for (const prop of cls.properties) {
            lines.push(`    - ${prop.visibility} ${prop.name}: ${prop.type}`);
          }
        }
        if (cls.methods && cls.methods.length > 0) {
          lines.push('  Methods:');
          for (const m of cls.methods) {
            const params = (m.parameters || [])
              .map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
              .join(', ');
            lines.push(`    - ${m.visibility} ${m.name}(${params}): ${m.returnType}${m.isAsync ? ' (async)' : ''}`);
          }
        }
      }
    }
    if (codeContext.functions && codeContext.functions.length > 0) {
      lines.push('Standalone Functions:');
      for (const fn of codeContext.functions) {
        const params = (fn.parameters || [])
          .map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`)
          .join(', ');
        lines.push(`- ${fn.name}(${params}): ${fn.returnType}${fn.isAsync ? ' (async)' : ''}`);
      }
    }
    return lines.join('\n');
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
