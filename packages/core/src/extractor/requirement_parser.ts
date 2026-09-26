import { GherkinScenario, RequirementContext } from './types';

export class RequirementParser {
  /**
   * Phân tích tài liệu BA (Markdown, JSON hoặc Plain Text) thành RequirementContext
   */
  public parse(content: string, defaultTitle = 'Requirement'): RequirementContext {
    const trimmed = content.trim();

    // 1. Thử parse nếu là JSON format
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        return this.parseJsonRequirement(parsedJson, defaultTitle, trimmed);
      } catch {
        // Fallback sang text/markdown nếu không phải JSON hợp lệ
      }
    }

    // 2. Parse theo định dạng Markdown / Text
    return this.parseMarkdownRequirement(trimmed, defaultTitle);
  }

  private parseJsonRequirement(
    json: any,
    defaultTitle: string,
    rawText: string
  ): RequirementContext {
    const title = json.title || defaultTitle;
    const userStory = json.userStory || json.description;
    const businessRules = Array.isArray(json.businessRules)
      ? json.businessRules.map((r: any) => (typeof r === 'string' ? r : JSON.stringify(r)))
      : [];
    const constraints = Array.isArray(json.constraints)
      ? json.constraints.map((c: any) => (typeof c === 'string' ? c : JSON.stringify(c)))
      : [];

    const scenarios: GherkinScenario[] = [];
    if (Array.isArray(json.scenarios)) {
      for (const s of json.scenarios) {
        scenarios.push({
          title: s.title || s.name || 'Scenario',
          given: Array.isArray(s.given) ? s.given : s.given ? [s.given] : undefined,
          when: Array.isArray(s.when) ? s.when : s.when ? [s.when] : undefined,
          then: Array.isArray(s.then) ? s.then : s.then ? [s.then] : undefined,
          and: Array.isArray(s.and) ? s.and : undefined,
          examples: Array.isArray(s.examples) ? s.examples : undefined,
        });
      }
    }

    return {
      title,
      userStory,
      businessRules,
      scenarios,
      constraints,
      rawText,
    };
  }

  private parseMarkdownRequirement(content: string, defaultTitle: string): RequirementContext {
    const lines = content.split(/\r?\n/);
    let title = defaultTitle;
    let userStory: string | undefined;
    const businessRules: string[] = [];
    const constraints: string[] = [];
    const scenarios: GherkinScenario[] = [];

    let currentSection: 'NONE' | 'USER_STORY' | 'BUSINESS_RULES' | 'AC' | 'CONSTRAINTS' = 'NONE';
    const userStoryLines: string[] = [];

    // Tìm tiêu đề H1 đầu tiên
    for (const line of lines) {
      const matchH1 = line.match(/^#\s+(?:Requirement:\s*)?(.*)$/i);
      if (matchH1 && matchH1[1]) {
        title = matchH1[1].trim();
        break;
      }
    }

    // Duyệt qua từng dòng
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Nhận diện Section headers
      if (/^##\s+(?:\d+\.\s*)?User\s+Story/i.test(trimmed)) {
        currentSection = 'USER_STORY';
        continue;
      } else if (/^##\s+(?:\d+\.\s*)?(?:Business\s+Rules|Quy\s+tắc\s+nghiệp\s+vụ)/i.test(trimmed)) {
        currentSection = 'BUSINESS_RULES';
        continue;
      } else if (
        /^##\s+(?:\d+\.\s*)?(?:Acceptance\s+Criteria|Tiêu\s+chí\s+chấp\s+nhận|Kịch\s+bản|Gherkin)/i.test(
          trimmed
        )
      ) {
        currentSection = 'AC';
        continue;
      } else if (
        /^##\s+(?:\d+\.\s*)?(?:Constraints|Ràng\s+buộc|Ràng\s+buộc\s+hệ\s+thống|Non-functional)/i.test(
          trimmed
        )
      ) {
        currentSection = 'CONSTRAINTS';
        continue;
      } else if (/^##\s+/.test(trimmed)) {
        currentSection = 'NONE';
      }

      // Xử lý nội dung theo từng Section
      if (currentSection === 'USER_STORY') {
        if (trimmed && !trimmed.startsWith('```')) {
          userStoryLines.push(trimmed);
        }
      } else if (currentSection === 'BUSINESS_RULES') {
        if (/^(\d+\.|\-|\*)\s+/.test(trimmed)) {
          businessRules.push(trimmed.replace(/^(\d+\.|\-|\*)\s+/, '').trim());
        } else if (trimmed && businessRules.length > 0 && trimmed.startsWith('-')) {
          businessRules.push(trimmed.replace(/^-\s+/, '').trim());
        }
      } else if (currentSection === 'CONSTRAINTS') {
        if (/^(\d+\.|\-|\*)\s+/.test(trimmed)) {
          constraints.push(trimmed.replace(/^(\d+\.|\-|\*)\s+/, '').trim());
        }
      }
    }

    if (userStoryLines.length > 0) {
      userStory = userStoryLines.join('\n');
    }

    // Parse Gherkin Scenarios trong toàn bộ tài liệu
    const parsedScenarios = this.extractGherkinScenarios(content);
    scenarios.push(...parsedScenarios);

    return {
      title,
      userStory,
      businessRules,
      scenarios,
      constraints,
      rawText: content,
    };
  }

  private extractGherkinScenarios(content: string): GherkinScenario[] {
    const scenarios: GherkinScenario[] = [];
    const lines = content.split(/\r?\n/);

    let currentScenario: GherkinScenario | null = null;
    let inExamplesTable = false;
    let tableHeaders: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Nhận diện Scenario hoặc Scenario Outline
      const scenarioMatch = line.match(/^Scenario(?:\s+Outline)?:\s*(.+)$/i);
      if (scenarioMatch) {
        if (currentScenario) {
          scenarios.push(currentScenario);
        }
        currentScenario = {
          title: scenarioMatch[1].trim(),
          given: [],
          when: [],
          then: [],
          and: [],
        };
        inExamplesTable = false;
        continue;
      }

      if (!currentScenario) continue;

      // Nhận diện Examples table
      if (/^Examples:\s*$/i.test(line)) {
        inExamplesTable = true;
        tableHeaders = [];
        currentScenario.examples = [];
        continue;
      }

      if (inExamplesTable && line.startsWith('|')) {
        const columns = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        if (tableHeaders.length === 0) {
          tableHeaders = columns;
        } else {
          const rowObj: Record<string, string> = {};
          columns.forEach((val, idx) => {
            if (tableHeaders[idx]) {
              rowObj[tableHeaders[idx]] = val;
            }
          });
          currentScenario.examples?.push(rowObj);
        }
        continue;
      }

      if (inExamplesTable && !line.startsWith('|') && line.length > 0) {
        inExamplesTable = false;
      }

      // Nhận diện Given / When / Then / And
      if (/^Given\s+/i.test(line)) {
        currentScenario.given = currentScenario.given || [];
        currentScenario.given.push(line.replace(/^Given\s+/i, '').trim());
      } else if (/^When\s+/i.test(line)) {
        currentScenario.when = currentScenario.when || [];
        currentScenario.when.push(line.replace(/^When\s+/i, '').trim());
      } else if (/^Then\s+/i.test(line)) {
        currentScenario.then = currentScenario.then || [];
        currentScenario.then.push(line.replace(/^Then\s+/i, '').trim());
      } else if (/^And\s+/i.test(line)) {
        currentScenario.and = currentScenario.and || [];
        currentScenario.and.push(line.replace(/^And\s+/i, '').trim());
      }
    }

    if (currentScenario) {
      scenarios.push(currentScenario);
    }

    return scenarios;
  }
}
