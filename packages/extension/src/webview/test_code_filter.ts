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

/**
 * Lọc mã unit test theo các scenario được chọn sử dụng TypeScript AST Parser.
 * Giữ nguyên imports, beforeEach, mocks, và cấu trúc describe,
 * chỉ giữ lại các block it(...) hoặc test(...) khớp với scenario được chọn.
 */
export function filterTestCodeByScenarios(
  testCode: string,
  selectedScenarioIds: string[],
  allScenarios: ScenarioItem[]
): string {
  if (!testCode || testCode.trim().length === 0) return testCode;
  if (!allScenarios || allScenarios.length === 0) return testCode;

  // 1. Nếu chọn tất cả scenario, bảo toàn toàn bộ mã
  if (selectedScenarioIds.length === allScenarios.length) {
    return testCode;
  }

  const selectedSet = new Set(selectedScenarioIds);

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

    // A. Khớp chính xác theo ID (ví dụ: TC-001, TC_01)
    for (const sc of allScenarios) {
      if (tb.title.includes(sc.id)) {
        matchedScenario = sc;
        break;
      }
    }

    // B. Nếu chưa khớp ID, khớp theo description
    if (!matchedScenario) {
      for (const sc of allScenarios) {
        if (sc.description && tb.title.toLowerCase().includes(sc.description.toLowerCase().slice(0, 25))) {
          matchedScenario = sc;
          break;
        }
      }
    }

    // C. Nếu số lượng test block bằng số lượng scenarios, khớp theo vị trí thứ tự index
    if (!matchedScenario && testBlocks.length === allScenarios.length) {
      matchedScenario = allScenarios[index];
    }

    // Kiểm tra xem block này có nên giữ lại hay không
    let shouldKeep = false;
    if (matchedScenario) {
      shouldKeep = selectedSet.has(matchedScenario.id);
    } else {
      // Trường hợp không ánh xạ được: nếu đã bỏ chọn tất cả thì bỏ; nếu chọn một phần thì chỉ giữ nếu không có unselected match
      shouldKeep = selectedScenarioIds.length > 0 && selectedScenarioIds.length === allScenarios.length;
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
