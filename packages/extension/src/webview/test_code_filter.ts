export interface ScenarioItem {
  id: string;
  description: string;
  category?: string;
  acceptanceCriteriaRef?: string;
  expectedBehavior?: string;
  selected?: boolean;
}

/**
 * Lọc mã unit test theo các scenario được chọn.
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

  // Nếu chọn tất cả scenario, giữ nguyên toàn bộ mã
  if (selectedScenarioIds.length === allScenarios.length) {
    return testCode;
  }

  // Nếu không chọn scenario nào, trả về cấu trúc khung
  if (selectedScenarioIds.length === 0) {
    const lines = testCode.split(/\r?\n/);
    const nonTestLines: string[] = [];
    let inTest = false;
    let depth = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      const isStart = /^(?:it|test)\s*\(/i.test(trimmed);
      if (!inTest && isStart) {
        inTest = true;
        depth = 0;
      }
      if (inTest) {
        for (const ch of line) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        if (depth <= 0 && (line.includes(');') || line.includes('});'))) {
          inTest = false;
        }
      } else {
        nonTestLines.push(line);
      }
    }
    return nonTestLines.join('\n');
  }

  const selectedSet = new Set(selectedScenarioIds);
  const selectedScenarios = allScenarios.filter((s) => selectedSet.has(s.id));
  const unselectedScenarios = allScenarios.filter((s) => !selectedSet.has(s.id));

  const lines = testCode.split(/\r?\n/);
  const outputLines: string[] = [];
  let inTestBlock = false;
  let keepCurrentTest = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const isTestStart =
      /^(?:it|test)\s*\(/i.test(trimmed) ||
      /^(?:it|test)\.only\s*\(/i.test(trimmed) ||
      /^(?:it|test)\.skip\s*\(/i.test(trimmed);

    if (!inTestBlock && isTestStart) {
      inTestBlock = true;
      braceDepth = 0;

      let matchesSelected = false;
      let matchesUnselected = false;

      for (const s of selectedScenarios) {
        if (
          line.includes(s.id) ||
          (s.description && line.toLowerCase().includes(s.description.toLowerCase().slice(0, 20)))
        ) {
          matchesSelected = true;
          break;
        }
      }

      for (const u of unselectedScenarios) {
        if (
          line.includes(u.id) ||
          (u.description && line.toLowerCase().includes(u.description.toLowerCase().slice(0, 20)))
        ) {
          matchesUnselected = true;
          break;
        }
      }

      keepCurrentTest = matchesSelected || (!matchesUnselected && selectedScenarioIds.length > 0);
    }

    if (inTestBlock) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
      }

      if (keepCurrentTest) {
        outputLines.push(line);
      }

      if (braceDepth <= 0 && (line.includes(');') || line.includes('});'))) {
        inTestBlock = false;
        keepCurrentTest = false;
      }
    } else {
      outputLines.push(line);
    }
  }

  return outputLines.join('\n');
}
