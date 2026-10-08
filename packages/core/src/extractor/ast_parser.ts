import {
  ClassInfo,
  CodeContext,
  ImportInfo,
  MethodInfo,
  ParameterInfo,
  TypeDefinitionInfo,
} from './types';

let tsModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  tsModule = require('typescript');
} catch {
  tsModule = null;
}

export class TypeScriptASTParser {
  /**
   * Phân tích mã nguồn TypeScript và trích xuất ngữ cảnh AST
   */
  public parseSource(sourceCode: string, fileName = 'service.ts'): CodeContext {
    if (!tsModule) {
      return this.parseSourceFallback(sourceCode, fileName);
    }

    try {
      const sourceFile = tsModule.createSourceFile(
        fileName,
        sourceCode,
        tsModule.ScriptTarget.Latest,
        true,
        tsModule.ScriptKind.TS
      );

      const imports: ImportInfo[] = [];
      const classes: ClassInfo[] = [];
      const typeDefinitions: TypeDefinitionInfo[] = [];
      const functions: MethodInfo[] = [];

      const visitNode = (node: any) => {
        if (tsModule.isImportDeclaration(node)) {
          const importInfo = this.extractImport(node, sourceFile);
          if (importInfo) imports.push(importInfo);
        } else if (tsModule.isClassDeclaration(node)) {
          const classInfo = this.extractClass(node, sourceFile);
          if (classInfo) classes.push(classInfo);
        } else if (
          tsModule.isInterfaceDeclaration(node) ||
          tsModule.isTypeAliasDeclaration(node) ||
          tsModule.isEnumDeclaration(node)
        ) {
          const typeInfo = this.extractTypeDefinition(node, sourceFile);
          if (typeInfo) typeDefinitions.push(typeInfo);
        } else if (tsModule.isFunctionDeclaration(node)) {
          const funcInfo = this.extractFunction(node, sourceFile);
          if (funcInfo) functions.push(funcInfo);
        }

        tsModule.forEachChild(node, visitNode);
      };

      visitNode(sourceFile);

      return {
        filePath: fileName,
        classes,
        imports,
        typeDefinitions,
        functions,
        rawSourceCode: sourceCode,
      };
    } catch {
      return this.parseSourceFallback(sourceCode, fileName);
    }
  }

  /**
   * Parser nhẹ (Regex) khi chạy trong môi trường VS Code độc lập không kèm bộ thư viện TypeScript compiler
   */
  private parseSourceFallback(sourceCode: string, fileName: string): CodeContext {
    const lines = sourceCode.split(/\r?\n/);
    const classes: ClassInfo[] = [];
    const functions: MethodInfo[] = [];

    let currentClass: ClassInfo | null = null;
    let jsdocBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('/**') || line.startsWith('*')) {
        jsdocBuffer.push(line.replace(/^\/\*\*|\*\/|\*\s?/g, '').trim());
        continue;
      }

      // Nhận diện Class
      const classMatch = line.match(/(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?/);
      if (classMatch) {
        if (currentClass) classes.push(currentClass);
        currentClass = {
          name: classMatch[1],
          isExported: line.includes('export'),
          extendsClass: classMatch[2],
          implementsInterfaces: [],
          methods: [],
          properties: [],
          docComment: jsdocBuffer.length > 0 ? jsdocBuffer.join('\n') : undefined,
        };
        jsdocBuffer = [];
        continue;
      }

      // Nhận diện Method trong Class
      const methodMatch = line.match(/(?:(public|protected|private)\s+)?(?:(async|static)\s+)?([A-Za-z0-9_]+)\s*\((.*?)\)(?:\s*:\s*([^{]+))?\s*\{?/);
      if (methodMatch && currentClass && !line.startsWith('//') && !line.startsWith('if') && !line.startsWith('while')) {
        const visibility = (methodMatch[1] as any) || 'public';
        const modifier = methodMatch[2];
        const methodName = methodMatch[3];
        const rawParams = methodMatch[4];
        const returnType = methodMatch[5] ? methodMatch[5].trim() : 'any';

        if (methodName !== 'if' && methodName !== 'for' && methodName !== 'switch' && methodName !== 'constructor') {
          const parameters = this.parseSimpleParams(rawParams);
          currentClass.methods.push({
            name: methodName,
            returnType,
            parameters,
            visibility,
            isAsync: modifier === 'async',
            isStatic: modifier === 'static',
            docComment: jsdocBuffer.length > 0 ? jsdocBuffer.join('\n') : undefined,
          });
        }
        jsdocBuffer = [];
      }
    }

    if (currentClass) {
      classes.push(currentClass);
    }

    return {
      filePath: fileName,
      classes,
      imports: [],
      typeDefinitions: [],
      functions,
      rawSourceCode: sourceCode,
    };
  }

  private parseSimpleParams(rawParams: string): ParameterInfo[] {
    if (!rawParams.trim()) return [];
    return rawParams.split(',').map((p) => {
      const parts = p.trim().split(':');
      const name = parts[0]?.trim().replace('?', '') || 'param';
      const type = parts[1]?.trim() || 'any';
      return {
        name,
        type,
        isOptional: p.includes('?'),
      };
    });
  }

  private extractImport(node: any, sourceFile: any): ImportInfo | null {
    const moduleSpecifier = node.moduleSpecifier.text;
    const importClause = node.importClause;

    if (!importClause) {
      return { moduleSpecifier, namedImports: [] };
    }

    let defaultImport: string | undefined;
    const namedImports: string[] = [];
    let isNamespace = false;

    if (importClause.name) {
      defaultImport = importClause.name.text;
    }

    if (importClause.namedBindings) {
      if (tsModule.isNamedImports(importClause.namedBindings)) {
        importClause.namedBindings.elements.forEach((elem: any) => {
          namedImports.push(elem.name.text);
        });
      } else if (tsModule.isNamespaceImport(importClause.namedBindings)) {
        isNamespace = true;
        namedImports.push(importClause.namedBindings.name.text);
      }
    }

    return {
      moduleSpecifier,
      namedImports,
      defaultImport,
      isNamespace,
    };
  }

  private extractClass(node: any, sourceFile: any): ClassInfo | null {
    const name = node.name ? node.name.text : 'AnonymousClass';
    const isExported = this.hasModifier(node, tsModule.SyntaxKind.ExportKeyword);
    const docComment = this.extractJSDoc(node, sourceFile);

    let extendsClass: string | undefined;
    const implementsInterfaces: string[] = [];

    if (node.heritageClauses) {
      node.heritageClauses.forEach((clause: any) => {
        if (clause.token === tsModule.SyntaxKind.ExtendsKeyword) {
          extendsClass = clause.types.map((t: any) => t.expression.getText(sourceFile)).join(', ');
        } else if (clause.token === tsModule.SyntaxKind.ImplementsKeyword) {
          clause.types.forEach((t: any) => {
            implementsInterfaces.push(t.expression.getText(sourceFile));
          });
        }
      });
    }

    const methods: MethodInfo[] = [];
    const properties: ClassInfo['properties'] = [];

    node.members.forEach((member: any) => {
      if (tsModule.isMethodDeclaration(member)) {
        const methodInfo = this.extractMethod(member, sourceFile);
        if (methodInfo) methods.push(methodInfo);
      } else if (tsModule.isPropertyDeclaration(member)) {
        const propName = member.name.getText(sourceFile);
        const propType = member.type ? member.type.getText(sourceFile) : 'any';
        const visibility = this.extractVisibility(member);
        const isStatic = this.hasModifier(member, tsModule.SyntaxKind.StaticKeyword);
        const isReadonly = this.hasModifier(member, tsModule.SyntaxKind.ReadonlyKeyword);

        properties.push({
          name: propName,
          type: propType,
          visibility,
          isStatic,
          isReadonly,
        });
      }
    });

    return {
      name,
      isExported,
      extendsClass,
      implementsInterfaces,
      methods,
      properties,
      docComment,
    };
  }

  private extractMethod(member: any, sourceFile: any): MethodInfo | null {
    const name = member.name.getText(sourceFile);
    const visibility = this.extractVisibility(member);
    const isStatic = this.hasModifier(member, tsModule.SyntaxKind.StaticKeyword);
    const isAsync = this.hasModifier(member, tsModule.SyntaxKind.AsyncKeyword);
    const returnType = member.type ? member.type.getText(sourceFile) : 'any';
    const docComment = this.extractJSDoc(member, sourceFile);
    const parameters = this.extractParameters(member.parameters, sourceFile);
    const bodySnippet = member.body ? member.body.getText(sourceFile) : undefined;

    return {
      name,
      returnType,
      parameters,
      visibility,
      isAsync,
      isStatic,
      docComment,
      bodySnippet,
    };
  }

  private extractFunction(node: any, sourceFile: any): MethodInfo | null {
    const name = node.name ? node.name.text : 'anonymousFunction';
    const isAsync = this.hasModifier(node, tsModule.SyntaxKind.AsyncKeyword);
    const returnType = node.type ? node.type.getText(sourceFile) : 'any';
    const docComment = this.extractJSDoc(node, sourceFile);
    const parameters = this.extractParameters(node.parameters, sourceFile);
    const bodySnippet = node.body ? node.body.getText(sourceFile) : undefined;

    return {
      name,
      returnType,
      parameters,
      visibility: 'public',
      isAsync,
      isStatic: false,
      docComment,
      bodySnippet,
    };
  }

  private extractParameters(paramNodes: any[], sourceFile: any): ParameterInfo[] {
    return paramNodes.map((param: any) => {
      const name = param.name.getText(sourceFile);
      const isOptional = !!param.questionToken || !!param.initializer;
      const type = param.type ? param.type.getText(sourceFile) : 'any';
      const defaultValue = param.initializer ? param.initializer.getText(sourceFile) : undefined;

      return {
        name,
        type,
        isOptional,
        defaultValue,
      };
    });
  }

  private extractTypeDefinition(node: any, sourceFile: any): TypeDefinitionInfo | null {
    let kind: 'interface' | 'type' | 'enum' = 'type';
    if (tsModule.isInterfaceDeclaration(node)) kind = 'interface';
    if (tsModule.isEnumDeclaration(node)) kind = 'enum';

    const name = node.name.text;
    const rawDefinition = node.getText(sourceFile);

    return {
      name,
      kind,
      rawDefinition,
    };
  }

  private extractVisibility(node: any): 'public' | 'private' | 'protected' {
    if (this.hasModifier(node, tsModule.SyntaxKind.PrivateKeyword)) return 'private';
    if (this.hasModifier(node, tsModule.SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private hasModifier(node: any, modifierKind: any): boolean {
    const modifiers = tsModule.canHaveModifiers(node) ? tsModule.getModifiers(node) : undefined;
    return !!modifiers && modifiers.some((m: any) => m.kind === modifierKind);
  }

  private extractJSDoc(node: any, sourceFile: any): string | undefined {
    const fullText = sourceFile.getFullText();
    const comments = tsModule.getLeadingCommentRanges(fullText, node.getFullStart());
    if (comments && comments.length > 0) {
      return comments
        .map((c: any) => fullText.substring(c.pos, c.end).trim())
        .join('\n');
    }
    return undefined;
  }
}
