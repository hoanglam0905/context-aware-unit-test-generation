import * as ts from 'typescript';

export interface ScenarioItem {
  id: string;
  description: string;
  category?: string;
  acceptanceCriteriaRef?: string;
  expectedBehavior?: string;
  selected?: boolean;
}

interface TestNodeRange {
  start: number;
  end: number;
  title: string;
  matchedScenarioId?: string;
}

export interface FilterOptions {
  preserveUnmapped?: boolean;
  strict?: boolean;
}

export interface ScenarioMappingAnalysis {
  totalTestBlocks: number;
  mappedBlocksCount: number;
  unmappedBlocks: string[];
  mappings: Array<{
    title: string;
    scenarioId?: string;
    isMapped: boolean;
  }>;
}

/**
 * Lọc mã unit test theo các scenario được chọn sử dụng TypeScript AST Parser.
 * Giữ nguyên imports, beforeEach, mocks, và cấu trúc describe,
 * chỉ giữ lại các block it(...) hoặc test(...) khớp với scenario được chọn.
 */
export function filterTestCodeByScenarios(
  testCode: string,
  selectedScenarioIds: string[],
  allScenarios: ScenarioItem[],
  options?: FilterOptions
): string {
  if (!testCode || testCode.trim().length === 0) return testCode;
  if (!allScenarios || allScenarios.length === 0) return testCode;

  const allScenarioIds = new Set(allScenarios.map((s) => s.id));
  const selectedSet = new Set(selectedScenarioIds);

  // 1. Kiểm tra chính xác xem toàn bộ các scenario hợp lệ có được chọn hay không (Set Equality)
  const isAllSelected =
    allScenarios.length > 0 &&
    selectedSet.size === allScenarioIds.size &&
    [...allScenarioIds].every((id) => selectedSet.has(id));

  if (isAllSelected) {
    return testCode;
  }

  // 2. Parse source code thành AST
  const sourceFile = ts.createSourceFile(
    'temp_test.ts',
    testCode,
    ts.ScriptTarget.Latest,
    true
  );

  const testBlocks: TestNodeRange[] = [];

  function isTestCall(expr: ts.CallExpression): boolean {
    const callee = expr.expression;
    if (ts.isIdentifier(callee)) {
      return callee.text === 'it' || callee.text === 'test';
    }
    if (ts.isPropertyAccessExpression(callee)) {
      const obj = callee.expression;
      const prop = callee.name.text;
      if (ts.isIdentifier(obj) && (obj.text === 'it' || obj.text === 'test')) {
        return prop === 'only' || prop === 'skip' || prop === 'todo' || prop === 'concurrent';
      }
    }
    // Hỗ trợ it.each([...])(...) hoặc test.each([...])(...) hoặc it.concurrent.each([...])(...)
    if (ts.isCallExpression(callee)) {
      const innerCallee = callee.expression;
      if (ts.isPropertyAccessExpression(innerCallee)) {
        const prop = innerCallee.name.text;
        if (prop === 'each') {
          const base = innerCallee.expression;
          if (ts.isIdentifier(base) && (base.text === 'it' || base.text === 'test')) {
            return true;
          }
          if (ts.isPropertyAccessExpression(base)) {
            const baseObj = base.expression;
            const baseProp = base.name.text;
            if (ts.isIdentifier(baseObj) && (baseObj.text === 'it' || baseObj.text === 'test')) {
              return baseProp === 'concurrent' || baseProp === 'only' || baseProp === 'skip';
            }
          }
        }
      }
    }
    // Hỗ trợ it.each`table`('title', ...) hoặc test.each`table`('title', ...)
    if (ts.isTaggedTemplateExpression(callee)) {
      const tag = callee.tag;
      if (ts.isPropertyAccessExpression(tag)) {
        if (tag.name.text === 'each') {
          const base = tag.expression;
          if (ts.isIdentifier(base) && (base.text === 'it' || base.text === 'test')) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function extractTitle(expr: ts.CallExpression): string {
    if (expr.arguments.length === 0) return '';
    const firstArg = expr.arguments[0];
    if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      return firstArg.text;
    }
    return firstArg.getText(sourceFile).replace(/^['"`]|['"`]$/g, '');
  }

  function visit(node: ts.Node, parentStatement?: ts.Statement) {
    if (ts.isExpressionStatement(node)) {
      if (ts.isCallExpression(node.expression) && isTestCall(node.expression)) {
        const title = extractTitle(node.expression);
        testBlocks.push({
          start: node.getFullStart(),
          end: node.getEnd(),
          title,
        });
        return; // Không duyệt sâu vào body của test block này
      }
    }

    ts.forEachChild(node, (child) => visit(child, ts.isStatement(node) ? node : parentStatement));
  }

  visit(sourceFile);

  // 3. Nếu không tìm thấy test block nào qua AST, trả về mã gốc
  if (testBlocks.length === 0) {
    return testCode;
  }

  // 4. Ánh xạ từng test block với scenario tương ứng
  const unselectedRanges: Array<{ start: number; end: number }> = [];

  testBlocks.forEach((tb, index) => {
    let matchedScenario: ScenarioItem | undefined;

    // A. Khớp chính xác theo ID (với ranh giới token boundary để tránh khớp nhầm tiền tố như TC-001 vs TC-0010)
    const sortedByIdLength = [...allScenarios].sort((a, b) => b.id.length - a.id.length);
    for (const sc of sortedByIdLength) {
      const escaped = sc.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(`(^|[^A-Za-z0-9_-])${escaped}([^A-Za-z0-9_-]|$)`);
      if (tokenRegex.test(tb.title)) {
        matchedScenario = sc;
        break;
      }
    }

    // B. Nếu chưa khớp ID, khớp theo description (độ dài tối thiểu 5 ký tự)
    if (!matchedScenario) {
      for (const sc of allScenarios) {
        if (sc.description && sc.description.trim().length >= 5) {
          const cleanDesc = sc.description.trim().toLowerCase();
          const cleanTitle = tb.title.toLowerCase();
          if (cleanTitle.includes(cleanDesc) || cleanDesc.includes(cleanTitle)) {
            matchedScenario = sc;
            break;
          }
          if (cleanTitle.includes(cleanDesc.slice(0, 30))) {
            matchedScenario = sc;
            break;
          }
          const descTokens = cleanDesc.split(/[^a-z0-9_]+/).filter((t) => t.length >= 3);
          if (descTokens.length > 0) {
            const matchedTokens = descTokens.filter((t) => cleanTitle.includes(t));
            if (matchedTokens.length >= Math.ceil(descTokens.length * 0.7)) {
              matchedScenario = sc;
              break;
            }
          }
        }
      }
    }

    // Kiểm tra xem block này có nên giữ lại hay không
    let shouldKeep = false;
    if (matchedScenario) {
      shouldKeep = selectedSet.has(matchedScenario.id);
    } else {
      // Trường hợp không ánh xạ được:
      const isStrict = options?.strict === true || options?.preserveUnmapped === false;
      if (isStrict) {
        console.warn(`[test_code_filter] Strict mode: Loại bỏ test block không thể ánh xạ "${tb.title}".`);
        shouldKeep = false;
      } else {
        console.warn(`[test_code_filter] Cảnh báo: Không thể ánh xạ test block "${tb.title}" với kịch bản nào. Bảo toàn test block để tránh mất mã.`);
        shouldKeep = selectedSet.size > 0;
      }
    }

    if (!shouldKeep) {
      unselectedRanges.push({ start: tb.start, end: tb.end });
    }
  });

  // 5. Cắt bỏ các khối unselected test từ cuối lên đầu để không làm lệch offset
  unselectedRanges.sort((a, b) => b.start - a.start);

  let filtered = testCode;
  for (const range of unselectedRanges) {
    filtered = filtered.slice(0, range.start) + filtered.slice(range.end);
  }

  return filtered;
}

/**
 * Phân tích ánh xạ giữa các AST test block và danh sách kịch bản
 */
export function analyzeScenarioMapping(
  testCode: string,
  allScenarios: ScenarioItem[]
): ScenarioMappingAnalysis {
  if (!testCode || testCode.trim().length === 0 || !allScenarios || allScenarios.length === 0) {
    return {
      totalTestBlocks: 0,
      mappedBlocksCount: 0,
      unmappedBlocks: [],
      mappings: [],
    };
  }

  const sourceFile = ts.createSourceFile('temp_analysis.ts', testCode, ts.ScriptTarget.Latest, true);
  const testBlocks: Array<{ title: string }> = [];

  function isTestCall(expr: ts.CallExpression): boolean {
    const callee = expr.expression;
    if (ts.isIdentifier(callee)) return callee.text === 'it' || callee.text === 'test';
    if (ts.isPropertyAccessExpression(callee)) {
      const obj = callee.expression;
      const prop = callee.name.text;
      if (ts.isIdentifier(obj) && (obj.text === 'it' || obj.text === 'test')) {
        return prop === 'only' || prop === 'skip' || prop === 'todo' || prop === 'concurrent';
      }
    }
    if (ts.isCallExpression(callee)) {
      const innerCallee = callee.expression;
      if (ts.isPropertyAccessExpression(innerCallee) && innerCallee.name.text === 'each') return true;
    }
    if (ts.isTaggedTemplateExpression(callee)) {
      const tag = callee.tag;
      if (ts.isPropertyAccessExpression(tag) && tag.name.text === 'each') return true;
    }
    return false;
  }

  function extractTitle(expr: ts.CallExpression): string {
    if (expr.arguments.length === 0) return '';
    const firstArg = expr.arguments[0];
    if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) return firstArg.text;
    return firstArg.getText(sourceFile).replace(/^['"`]|['"`]$/g, '');
  }

  function visit(node: ts.Node) {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && isTestCall(node.expression)) {
      testBlocks.push({ title: extractTitle(node.expression) });
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const mappings: ScenarioMappingAnalysis['mappings'] = [];
  const unmappedBlocks: string[] = [];
  let mappedCount = 0;

  for (const tb of testBlocks) {
    let matchedId: string | undefined;

    // 1. Token match ID
    const sorted = [...allScenarios].sort((a, b) => b.id.length - a.id.length);
    for (const sc of sorted) {
      const escaped = sc.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(`(^|[^A-Za-z0-9_-])${escaped}([^A-Za-z0-9_-]|$)`);
      if (tokenRegex.test(tb.title)) {
        matchedId = sc.id;
        break;
      }
    }

    // 2. Match description
    if (!matchedId) {
      for (const sc of allScenarios) {
        if (sc.description && sc.description.trim().length >= 5) {
          const cleanDesc = sc.description.trim().toLowerCase();
          const cleanTitle = tb.title.toLowerCase();
          if (cleanTitle.includes(cleanDesc) || cleanDesc.includes(cleanTitle) || cleanTitle.includes(cleanDesc.slice(0, 30))) {
            matchedId = sc.id;
            break;
          }
        }
      }
    }

    if (matchedId) {
      mappedCount++;
      mappings.push({ title: tb.title, scenarioId: matchedId, isMapped: true });
    } else {
      unmappedBlocks.push(tb.title);
      mappings.push({ title: tb.title, isMapped: false });
    }
  }

  return {
    totalTestBlocks: testBlocks.length,
    mappedBlocksCount: mappedCount,
    unmappedBlocks,
    mappings,
  };
}
