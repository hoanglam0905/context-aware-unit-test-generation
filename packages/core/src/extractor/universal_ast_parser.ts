import { TypeScriptASTParser } from './ast_parser';
import { LanguageDetector } from './language_detector';
import { ClassInfo, CodeContext, MethodInfo, ParameterInfo } from './types';

export class UniversalCodeParser {
  private tsParser: TypeScriptASTParser;

  constructor() {
    this.tsParser = new TypeScriptASTParser();
  }

  /**
   * Phân tích mã nguồn đa ngôn ngữ (TypeScript, JavaScript, Python, Java, C#, Go, PHP, C++)
   */
  public parse(sourceCode: string, filePath = 'service.ts'): CodeContext {
    const langInfo = LanguageDetector.detectLanguage(filePath);

    if (langInfo.id === 'typescript' || langInfo.id === 'javascript') {
      return this.tsParser.parseSource(sourceCode, filePath);
    }

    if (langInfo.id === 'python') {
      return this.parsePython(sourceCode, filePath);
    }

    if (langInfo.id === 'java' || langInfo.id === 'csharp') {
      return this.parseJavaOrCSharp(sourceCode, filePath, langInfo.name);
    }

    if (langInfo.id === 'go') {
      return this.parseGo(sourceCode, filePath);
    }

    // Fallback parser cho các ngôn ngữ khác (PHP, C++)
    return this.parseGeneric(sourceCode, filePath, langInfo.name);
  }

  /**
   * Bóc tách mã nguồn Python (.py)
   */
  public parsePython(sourceCode: string, filePath: string): CodeContext {
    const lines = sourceCode.split(/\r?\n/);
    const classes: ClassInfo[] = [];
    const functions: MethodInfo[] = [];

    let currentClass: ClassInfo | null = null;
    let pendingDocTarget: 'class' | 'method' | null = null;
    let lastMethod: MethodInfo | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Nhận diện Class
      const classMatch = line.match(/^class\s+([A-Za-z0-9_]+)(?:\((.*?)\))?:/);
      if (classMatch) {
        if (currentClass) classes.push(currentClass);
        const className = classMatch[1];
        const extendsClass = classMatch[2] ? classMatch[2].trim() : undefined;

        currentClass = {
          name: className,
          isExported: true,
          extendsClass,
          implementsInterfaces: [],
          methods: [],
          properties: [],
        };
        pendingDocTarget = 'class';
        continue;
      }

      // 2. Nhận diện Function / Method
      const defMatch = line.match(/^(\s*)def\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*->\s*([^:]+))?:/);
      if (defMatch) {
        const indent = defMatch[1].length;
        const methodName = defMatch[2];
        const rawParams = defMatch[3];
        const returnType = defMatch[4] ? defMatch[4].trim() : 'Any';

        const isMethod = indent > 0 && currentClass !== null;
        const isPrivate = methodName.startsWith('_') && !methodName.startsWith('__');
        const visibility = isPrivate ? 'private' : 'public';

        const parameters = this.parsePythonParameters(rawParams);

        const methodInfo: MethodInfo = {
          name: methodName,
          returnType,
          parameters,
          visibility,
          isAsync: line.includes('async def'),
          isStatic: false,
        };

        if (isMethod && currentClass) {
          currentClass.methods.push(methodInfo);
        } else {
          functions.push(methodInfo);
        }

        lastMethod = methodInfo;
        pendingDocTarget = 'method';
        continue;
      }

      // 3. Xử lý Docstrings ngay sau class / def
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        const docContent = trimmed.replace(/^("""|''')|("""|''')$/g, '').trim();
        if (pendingDocTarget === 'class' && currentClass) {
          currentClass.docComment = docContent;
          pendingDocTarget = null;
        } else if (pendingDocTarget === 'method' && lastMethod) {
          lastMethod.docComment = docContent;
          pendingDocTarget = null;
        }
      } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        pendingDocTarget = null;
      }
    }

    if (currentClass) {
      classes.push(currentClass);
    }

    return {
      filePath,
      classes,
      imports: [],
      typeDefinitions: [],
      functions,
      rawSourceCode: sourceCode,
    };
  }

  /**
   * Bóc tách mã nguồn Java / C#
   */
  public parseJavaOrCSharp(sourceCode: string, filePath: string, langName: string): CodeContext {
    const lines = sourceCode.split(/\r?\n/);
    const classes: ClassInfo[] = [];
    let currentClass: ClassInfo | null = null;
    let javadocBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Bóc tách Javadoc / XML Comments
      if (trimmed.startsWith('/**') || trimmed.startsWith('///')) {
        javadocBuffer.push(trimmed.replace(/^\/\*\*|\*\/|\/\/\//g, '').trim());
        continue;
      } else if (trimmed.startsWith('*')) {
        javadocBuffer.push(trimmed.replace(/^\*\s?/, '').trim());
        continue;
      }

      // 1. Nhận diện Class
      const classMatch = line.match(/(?:public|internal|protected)?\s*(?:static\s+)?class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?(?:\s+implements\s+([A-Za-z0-9_,\s]+))?/);
      if (classMatch && !trimmed.startsWith('//')) {
        if (currentClass) classes.push(currentClass);
        const className = classMatch[1];
        const extendsClass = classMatch[2] ? classMatch[2].trim() : undefined;
        const implementsInterfaces = classMatch[3]
          ? classMatch[3].split(',').map((s) => s.trim())
          : [];

        currentClass = {
          name: className,
          isExported: true,
          extendsClass,
          implementsInterfaces,
          methods: [],
          properties: [],
          docComment: javadocBuffer.length > 0 ? javadocBuffer.join('\n') : undefined,
        };
        javadocBuffer = [];
        continue;
      }

      // 2. Nhận diện Method
      const methodMatch = line.match(/(?:(public|protected|private)\s+)?(?:(static|async)\s+)?([A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)\s*\((.*?)\)\s*(?:throws\s+[^{]+)?\s*\{?/);
      if (methodMatch && currentClass && !trimmed.startsWith('//') && !trimmed.startsWith('if') && !trimmed.startsWith('while')) {
        const visibility = (methodMatch[1] as any) || 'public';
        const modifier = methodMatch[2];
        const returnType = methodMatch[3];
        const methodName = methodMatch[4];
        const rawParams = methodMatch[5];

        if (methodName !== 'if' && methodName !== 'for' && methodName !== 'switch' && methodName !== currentClass.name) {
          const parameters = this.parseTypedParameters(rawParams);
          currentClass.methods.push({
            name: methodName,
            returnType,
            parameters,
            visibility,
            isAsync: modifier === 'async',
            isStatic: modifier === 'static',
            docComment: javadocBuffer.length > 0 ? javadocBuffer.join('\n') : undefined,
          });
        }
        javadocBuffer = [];
      }
    }

    if (currentClass) {
      classes.push(currentClass);
    }

    return {
      filePath,
      classes,
      imports: [],
      typeDefinitions: [],
      functions: [],
      rawSourceCode: sourceCode,
    };
  }

  /**
   * Bóc tách mã nguồn Go (.go)
   */
  public parseGo(sourceCode: string, filePath: string): CodeContext {
    const lines = sourceCode.split(/\r?\n/);
    const classes: ClassInfo[] = [];
    const functions: MethodInfo[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Nhận diện Struct
      const structMatch = line.match(/^type\s+([A-Za-z0-9_]+)\s+struct/);
      if (structMatch) {
        classes.push({
          name: structMatch[1],
          isExported: structMatch[1][0] === structMatch[1][0].toUpperCase(),
          implementsInterfaces: [],
          methods: [],
          properties: [],
        });
        continue;
      }

      // Nhận diện Method có receiver (func (s *Service) Method(...))
      const methodMatch = line.match(/^func\s*\(\s*[A-Za-z0-9_]+\s+\*?([A-Za-z0-9_]+)\s*\)\s*([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.+))?/);
      if (methodMatch) {
        const structName = methodMatch[1];
        const methodName = methodMatch[2];
        const rawParams = methodMatch[3];
        const rawReturnType = methodMatch[4] ? methodMatch[4].trim().replace(/\s*\{$/, '').trim() : 'void';

        const targetClass = classes.find((c) => c.name === structName);
        const methodInfo: MethodInfo = {
          name: methodName,
          returnType: rawReturnType,
          parameters: this.parseGoParameters(rawParams),
          visibility: methodName[0] === methodName[0].toUpperCase() ? 'public' : 'private',
          isAsync: false,
          isStatic: false,
        };

        if (targetClass) {
          targetClass.methods.push(methodInfo);
        } else {
          functions.push(methodInfo);
        }
        continue;
      }

      // Nhận diện Standalone Function (func Method(...))
      const funcMatch = line.match(/^func\s+([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*(.+))?/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const rawParams = funcMatch[2];
        const rawReturnType = funcMatch[3] ? funcMatch[3].trim().replace(/\s*\{$/, '').trim() : 'void';

        functions.push({
          name: funcName,
          returnType: rawReturnType,
          parameters: this.parseGoParameters(rawParams),
          visibility: funcName[0] === funcName[0].toUpperCase() ? 'public' : 'private',
          isAsync: false,
          isStatic: false,
        });
      }
    }

    return {
      filePath,
      classes,
      imports: [],
      typeDefinitions: [],
      functions,
      rawSourceCode: sourceCode,
    };
  }

  private parseGeneric(sourceCode: string, filePath: string, langName: string): CodeContext {
    return {
      filePath,
      classes: [],
      imports: [],
      typeDefinitions: [],
      functions: [],
      rawSourceCode: sourceCode,
    };
  }

  private parsePythonParameters(rawParams: string): ParameterInfo[] {
    if (!rawParams.trim()) return [];
    return rawParams
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p !== 'self' && p !== 'cls')
      .map((p) => {
        const [namePart, defaultPart] = p.split('=');
        const [name, type] = namePart.split(':');
        return {
          name: name.trim(),
          type: type ? type.trim() : 'Any',
          isOptional: !!defaultPart,
          defaultValue: defaultPart ? defaultPart.trim() : undefined,
        };
      });
  }

  private parseTypedParameters(rawParams: string): ParameterInfo[] {
    if (!rawParams.trim()) return [];
    return rawParams
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p)
      .map((p) => {
        const parts = p.split(/\s+/);
        const name = parts[parts.length - 1];
        const type = parts.slice(0, parts.length - 1).join(' ');
        return {
          name: name || 'param',
          type: type || 'Object',
          isOptional: false,
        };
      });
  }

  private parseGoParameters(rawParams: string): ParameterInfo[] {
    if (!rawParams.trim()) return [];
    return rawParams
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p)
      .map((p) => {
        const parts = p.split(/\s+/);
        return {
          name: parts[0] || 'param',
          type: parts.slice(1).join(' ') || 'interface{}',
          isOptional: false,
        };
      });
  }
}
