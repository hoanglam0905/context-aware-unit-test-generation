import * as ts from 'typescript';
import {
  ClassInfo,
  CodeContext,
  ImportInfo,
  MethodInfo,
  ParameterInfo,
  TypeDefinitionInfo,
} from './types';

export class TypeScriptASTParser {
  /**
   * Phân tích mã nguồn TypeScript và trích xuất ngữ cảnh AST
   */
  public parseSource(sourceCode: string, fileName = 'service.ts'): CodeContext {
    const sourceFile = ts.createSourceFile(
      fileName,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const imports: ImportInfo[] = [];
    const classes: ClassInfo[] = [];
    const typeDefinitions: TypeDefinitionInfo[] = [];
    const functions: MethodInfo[] = [];

    const visitNode = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImport(node, sourceFile);
        if (importInfo) imports.push(importInfo);
      } else if (ts.isClassDeclaration(node)) {
        const classInfo = this.extractClass(node, sourceFile);
        if (classInfo) classes.push(classInfo);
      } else if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        const typeInfo = this.extractTypeDefinition(node, sourceFile);
        if (typeInfo) typeDefinitions.push(typeInfo);
      } else if (ts.isFunctionDeclaration(node)) {
        const funcInfo = this.extractFunction(node, sourceFile);
        if (funcInfo) functions.push(funcInfo);
      }

      ts.forEachChild(node, visitNode);
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
  }

  private extractImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo | null {
    const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
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
      if (ts.isNamedImports(importClause.namedBindings)) {
        importClause.namedBindings.elements.forEach((elem) => {
          namedImports.push(elem.name.text);
        });
      } else if (ts.isNamespaceImport(importClause.namedBindings)) {
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

  private extractClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ClassInfo | null {
    const name = node.name ? node.name.text : 'AnonymousClass';
    const isExported = this.hasModifier(node, ts.SyntaxKind.ExportKeyword);
    const docComment = this.extractJSDoc(node, sourceFile);

    let extendsClass: string | undefined;
    const implementsInterfaces: string[] = [];

    if (node.heritageClauses) {
      node.heritageClauses.forEach((clause) => {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsClass = clause.types.map((t) => t.expression.getText(sourceFile)).join(', ');
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          clause.types.forEach((t) => {
            implementsInterfaces.push(t.expression.getText(sourceFile));
          });
        }
      });
    }

    const methods: MethodInfo[] = [];
    const properties: ClassInfo['properties'] = [];

    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member)) {
        const methodInfo = this.extractMethod(member, sourceFile);
        if (methodInfo) methods.push(methodInfo);
      } else if (ts.isPropertyDeclaration(member)) {
        const propName = member.name.getText(sourceFile);
        const propType = member.type ? member.type.getText(sourceFile) : 'any';
        const visibility = this.extractVisibility(member);
        const isStatic = this.hasModifier(member, ts.SyntaxKind.StaticKeyword);
        const isReadonly = this.hasModifier(member, ts.SyntaxKind.ReadonlyKeyword);

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

  private extractMethod(
    member: ts.MethodDeclaration,
    sourceFile: ts.SourceFile
  ): MethodInfo | null {
    const name = member.name.getText(sourceFile);
    const visibility = this.extractVisibility(member);
    const isStatic = this.hasModifier(member, ts.SyntaxKind.StaticKeyword);
    const isAsync = this.hasModifier(member, ts.SyntaxKind.AsyncKeyword);
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

  private extractFunction(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): MethodInfo | null {
    const name = node.name ? node.name.text : 'anonymousFunction';
    const isAsync = this.hasModifier(node, ts.SyntaxKind.AsyncKeyword);
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

  private extractParameters(
    paramNodes: ts.NodeArray<ts.ParameterDeclaration>,
    sourceFile: ts.SourceFile
  ): ParameterInfo[] {
    return paramNodes.map((param) => {
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

  private extractTypeDefinition(
    node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration,
    sourceFile: ts.SourceFile
  ): TypeDefinitionInfo | null {
    let kind: 'interface' | 'type' | 'enum' = 'type';
    if (ts.isInterfaceDeclaration(node)) kind = 'interface';
    if (ts.isEnumDeclaration(node)) kind = 'enum';

    const name = node.name.text;
    const rawDefinition = node.getText(sourceFile);

    return {
      name,
      kind,
      rawDefinition,
    };
  }

  private extractVisibility(node: ts.Node): 'public' | 'private' | 'protected' {
    if (this.hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return 'private';
    if (this.hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private hasModifier(node: ts.Node, modifierKind: ts.SyntaxKind): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return !!modifiers && modifiers.some((m) => m.kind === modifierKind);
  }

  private extractJSDoc(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
    const fullText = sourceFile.getFullText();
    const comments = ts.getLeadingCommentRanges(fullText, node.getFullStart());
    if (comments && comments.length > 0) {
      return comments
        .map((c) => fullText.substring(c.pos, c.end).trim())
        .join('\n');
    }
    return undefined;
  }
}
