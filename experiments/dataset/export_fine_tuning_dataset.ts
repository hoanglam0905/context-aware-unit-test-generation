import * as fs from 'fs';
import * as path from 'path';
import { ContextExtractor } from '../../packages/core/src/extractor/context_extractor';
import { TestPostProcessor } from '../../packages/core/src/pipeline/post_processor';

interface ManifestService {
  id: string;
  tier: string;
  name: string;
  folder: string;
  serviceFile: string;
  requirementFile: string;
  testFile: string;
  split: 'train' | 'validation' | 'test';
  targetClass: string;
  domain: string;
  acceptanceCriteriaCount: number;
}

interface Manifest {
  version: string;
  splits: {
    train: string[];
    validation: string[];
    test: string[];
  };
  services: ManifestService[];
}

export function exportFineTuningDataset(): {
  trainCount: number;
  valCount: number;
  testCount: number;
  paths: Record<string, string>;
} {
  console.log('================================================================');
  console.log('📦 XUẤT DATASET FINE-TUNING ĐỊNH DẠNG CHAT/INSTRUCTION JSONL');
  console.log('================================================================\n');

  const datasetDir = path.resolve(__dirname);
  const manifestPath = path.join(datasetDir, 'dataset_manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Dataset manifest not found: ${manifestPath}`);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const extractor = new ContextExtractor();
  const postProcessor = new TestPostProcessor();

  const splitData: Record<'train' | 'validation' | 'test', string[]> = {
    train: [],
    validation: [],
    test: [],
  };

  const systemPrompt = `You are an elite QA Engineer and Automated Test Specialist.
Your task is to generate complete, high-mutation-score Jest unit test suites by strictly cross-referencing:
1. BUSINESS REQUIREMENTS: Acceptance Criteria and edge cases defined in BA specifications.
2. SOURCE CODE IMPLEMENTATION: Method signatures, branches, exceptions, and business logic.
3. AST STRUCTURE: Type contracts, parameters, visibility, and dependencies.

Output your response in valid JSON matching the following schema:
{
  "testScenarios": [
    {
      "id": "TC-001",
      "acceptanceCriteriaRef": "Acceptance Criterion or Rule reference",
      "category": "HAPPY_PATH | BOUNDARY | EXCEPTION",
      "description": "Clear explanation of what is tested",
      "expectedBehavior": "Expected outcome or assertion"
    }
  ],
  "testCode": "COMPLETE_RUNNABLE_TYPESCRIPT_JEST_CODE"
}`;

  for (const svc of manifest.services) {
    const svcFolder = path.join(datasetDir, svc.folder);
    const servicePath = path.join(svcFolder, svc.serviceFile);
    const reqPath = path.join(svcFolder, svc.requirementFile);
    const testPath = path.join(svcFolder, svc.testFile);

    const contextPayload = extractor.extract({
      serviceFilePath: servicePath,
      requirementFilePath: reqPath,
      targetClassName: svc.targetClass,
    });

    const groundTruthCode = fs.readFileSync(testPath, 'utf-8');
    const processedGT = postProcessor.process(groundTruthCode, 'CODE_BLOCK');

    const userPrompt = `### 1. BUSINESS REQUIREMENT SPECIFICATION:
${contextPayload.promptContext.requirementDoc || 'Rely on source code contracts.'}

---

### 2. SOURCE CODE (Target Service):
\`\`\`typescript
${contextPayload.promptContext.serviceCode}
\`\`\`

---

### 3. AST STRUCTURE ANALYSIS:
${contextPayload.promptContext.astSummary || 'No AST summary available.'}

---

### INSTRUCTIONS:
Generate a complete, production-ready Jest unit test file covering happy paths, boundaries, and exceptions. Output in structured JSON.`;

    const assistantResponse = JSON.stringify(
      {
        testScenarios: processedGT.testScenarios.map((s, idx) => ({
          id: s.id || `TC-${String(idx + 1).padStart(3, '0')}`,
          acceptanceCriteriaRef: s.acceptanceCriteriaRef || `Rule for ${svc.name}`,
          category: s.category || 'TEST_CASE',
          description: s.description,
          expectedBehavior: s.expectedBehavior || 'Asserted successfully in test code',
        })),
        testCode: groundTruthCode.trim(),
      },
      null,
      2
    );

    const jsonlRecord = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: assistantResponse },
      ],
      metadata: {
        serviceId: svc.id,
        name: svc.name,
        tier: svc.tier,
        split: svc.split,
        domain: svc.domain,
        targetClass: svc.targetClass,
      },
    };

    splitData[svc.split].push(JSON.stringify(jsonlRecord));
  }

  const outPaths: Record<string, string> = {
    train: path.join(datasetDir, 'fine_tuning_train.jsonl'),
    validation: path.join(datasetDir, 'fine_tuning_val.jsonl'),
    test: path.join(datasetDir, 'fine_tuning_test.jsonl'),
  };

  fs.writeFileSync(outPaths.train, splitData.train.join('\n') + '\n', 'utf-8');
  fs.writeFileSync(outPaths.validation, splitData.validation.join('\n') + '\n', 'utf-8');
  fs.writeFileSync(outPaths.test, splitData.test.join('\n') + '\n', 'utf-8');

  console.log(`✅ Xuất thành công tập TRAIN (${splitData.train.length} samples) tại: ${outPaths.train}`);
  console.log(`✅ Xuất thành công tập VALIDATION (${splitData.validation.length} samples) tại: ${outPaths.validation}`);
  console.log(`✅ Xuất thành công tập TEST HOLDOUT (${splitData.test.length} samples) tại: ${outPaths.test}\n`);

  return {
    trainCount: splitData.train.length,
    valCount: splitData.validation.length,
    testCount: splitData.test.length,
    paths: outPaths,
  };
}

if (require.main === module) {
  try {
    exportFineTuningDataset();
  } catch (err) {
    console.error('Lỗi khi xuất dataset:', err);
    process.exit(1);
  }
}
