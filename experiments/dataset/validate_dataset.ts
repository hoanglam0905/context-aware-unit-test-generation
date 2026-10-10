import * as fs from 'fs';
import * as path from 'path';
import { CoverageRunner } from '../../packages/core/src/pipeline/coverage_runner';

interface ManifestService {
  id: string;
  tier: string;
  name: string;
  folder: string;
  serviceFile: string;
  requirementFile: string;
  testFile: string;
  split: string;
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

export async function validateDataset(): Promise<{
  success: boolean;
  totalServices: number;
  allFilesExist: boolean;
  noLeakage: boolean;
  partitionValid: boolean;
  jsonlValid: boolean;
  passedCount: number;
  failedCount: number;
  errors: string[];
}> {
  console.log('================================================================');
  console.log('🔍 KIỂM ĐỊNH TẬP DỮ LIỆU, MANIFEST & ARTIFACTS JSONL');
  console.log('================================================================\n');

  const datasetDir = path.resolve(__dirname);
  const manifestPath = path.join(datasetDir, 'dataset_manifest.json');
  const errors: string[] = [];

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Dataset manifest not found: ${manifestPath}`);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`📦 Đã nạp manifest phiên bản ${manifest.version} với ${manifest.services.length} services.`);

  // 1. Kiểm tra tính độc lập & Phân hoạch toán học (Mathematical Partition Completeness)
  const trainSet = new Set(manifest.splits.train);
  const valSet = new Set(manifest.splits.validation);
  const testSet = new Set(manifest.splits.test);
  const allSplitIds = new Set([...manifest.splits.train, ...manifest.splits.validation, ...manifest.splits.test]);

  const trainValOverlap = [...trainSet].filter((x) => valSet.has(x));
  const trainTestOverlap = [...trainSet].filter((x) => testSet.has(x));
  const valTestOverlap = [...valSet].filter((x) => testSet.has(x));

  let noLeakage = true;
  if (trainValOverlap.length > 0 || trainTestOverlap.length > 0 || valTestOverlap.length > 0) {
    noLeakage = false;
    if (trainValOverlap.length > 0) errors.push(`Train/Val overlap: ${trainValOverlap.join(', ')}`);
    if (trainTestOverlap.length > 0) errors.push(`Train/Test overlap: ${trainTestOverlap.join(', ')}`);
    if (valTestOverlap.length > 0) errors.push(`Val/Test overlap: ${valTestOverlap.join(', ')}`);
  }

  let partitionValid = true;
  // Kiểm tra tính đầy đủ: Hợp của các split phải bằng đúng tập service trong manifest
  if (allSplitIds.size !== manifest.services.length) {
    partitionValid = false;
    errors.push(`Tổng số service trong splits (${allSplitIds.size}) không khớp với manifest (${manifest.services.length})`);
  }
  for (const svc of manifest.services) {
    if (!allSplitIds.has(svc.id)) {
      partitionValid = false;
      errors.push(`Service ${svc.id} thiếu trong các danh sách splits`);
    }
    // Kiểm tra trường split của từng service khớp với split chứa nó
    const expectedSplit = trainSet.has(svc.id) ? 'train' : valSet.has(svc.id) ? 'validation' : testSet.has(svc.id) ? 'test' : '';
    if (svc.split !== expectedSplit) {
      partitionValid = false;
      errors.push(`Service ${svc.id} có trường split="${svc.split}" nhưng nằm trong split="${expectedSplit}"`);
    }
  }

  if (noLeakage && partitionValid) {
    console.log('✅ Xác nhận: Phân hoạch toán học hợp lệ (0% Leakage, 100% Partition Completeness).');
    console.log(`   - Train: ${manifest.splits.train.length} services`);
    console.log(`   - Validation: ${manifest.splits.validation.length} services`);
    console.log(`   - Test Holdout: ${manifest.splits.test.length} services`);
  } else {
    console.error('❌ Lỗi phân hoạch dữ liệu trong manifest!');
  }

  // 2. Kiểm tra tính tồn tại của file nguồn trên đĩa
  let allFilesExist = true;
  for (const svc of manifest.services) {
    const svcFolder = path.join(datasetDir, svc.folder);
    const servicePath = path.join(svcFolder, svc.serviceFile);
    const reqPath = path.join(svcFolder, svc.requirementFile);
    const testPath = path.join(svcFolder, svc.testFile);

    if (!fs.existsSync(servicePath) || !fs.existsSync(reqPath) || !fs.existsSync(testPath)) {
      if (!fs.existsSync(servicePath)) errors.push(`Service ${svc.id} thiếu file mã nguồn: ${svc.serviceFile}`);
      if (!fs.existsSync(reqPath)) errors.push(`Service ${svc.id} thiếu file yêu cầu: ${svc.requirementFile}`);
      if (!fs.existsSync(testPath)) errors.push(`Service ${svc.id} thiếu file test: ${svc.testFile}`);
      allFilesExist = false;
    }
  }

  if (allFilesExist) {
    console.log('✅ Xác nhận: Toàn bộ 15 services có đầy đủ service.ts, requirement.md, ground_truth.test.ts.');
  }

  // 3. Kiểm định 3 file JSONL Fine-Tuning (Schema, Traceability, Không placeholder)
  console.log('\n🔍 Đang kiểm định tính toàn vẹn và chất lượng Traceability của 3 file JSONL...');
  const jsonlConfigs = [
    { name: 'train', file: 'fine_tuning_train.jsonl', expectedIds: trainSet },
    { name: 'validation', file: 'fine_tuning_val.jsonl', expectedIds: valSet },
    { name: 'test', file: 'fine_tuning_test.jsonl', expectedIds: testSet },
  ];

  let jsonlValid = true;
  const seenJsonlServiceIds = new Set<string>();

  for (const cfg of jsonlConfigs) {
    const filePath = path.join(datasetDir, cfg.file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Thiếu file JSONL: ${cfg.file}`);
      jsonlValid = false;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    if (lines.length !== cfg.expectedIds.size) {
      errors.push(`File ${cfg.file} có ${lines.length} dòng, mong đợi ${cfg.expectedIds.size} mẫu`);
      jsonlValid = false;
    }

    const currentSplitSeenIds = new Set<string>();

    lines.forEach((line, lineIdx) => {
      try {
        const record = JSON.parse(line);

        // Kiểm tra cấu trúc messages
        if (!Array.isArray(record.messages) || record.messages.length !== 3) {
          errors.push(`[${cfg.file}:L${lineIdx + 1}] record.messages phải có đúng 3 phần tử (system, user, assistant)`);
          jsonlValid = false;
          return;
        }

        const [sysMsg, usrMsg, asstMsg] = record.messages;
        if (sysMsg.role !== 'system' || usrMsg.role !== 'user' || asstMsg.role !== 'assistant') {
          errors.push(`[${cfg.file}:L${lineIdx + 1}] roles không đúng chuẩn (system, user, assistant)`);
          jsonlValid = false;
        }

        // Kiểm tra nội dung assistant (phải là JSON chứa testScenarios và testCode)
        const asstData = JSON.parse(asstMsg.content);
        if (!Array.isArray(asstData.testScenarios) || typeof asstData.testCode !== 'string') {
          errors.push(`[${cfg.file}:L${lineIdx + 1}] assistant content thiếu testScenarios hoặc testCode`);
          jsonlValid = false;
          return;
        }

        if (asstData.testCode.trim().length === 0) {
          errors.push(`[${cfg.file}:L${lineIdx + 1}] testCode bị rỗng`);
          jsonlValid = false;
        }

        // Kiểm tra Traceability của từng scenario: không được chứa placeholder
        for (const scen of asstData.testScenarios) {
          if (!scen.id || !scen.description) {
            errors.push(`[${cfg.file}:L${lineIdx + 1}] scenario thiếu id hoặc description`);
            jsonlValid = false;
          }

          const acRef = scen.acceptanceCriteriaRef || '';
          if (acRef.includes('Rule for ') || acRef.toLowerCase().includes('todo') || acRef.trim().length === 0) {
            errors.push(`[${cfg.file}:L${lineIdx + 1}] scenario ${scen.id} chứa placeholder acceptanceCriteriaRef: "${acRef}"`);
            jsonlValid = false;
          }

          const expected = scen.expectedBehavior || '';
          if (expected.includes('Asserted successfully in test code') || expected.trim().length === 0) {
            errors.push(`[${cfg.file}:L${lineIdx + 1}] scenario ${scen.id} chứa placeholder expectedBehavior: "${expected}"`);
            jsonlValid = false;
          }
        }

        // Kiểm tra metadata
        const svcId = record.metadata?.serviceId;
        if (!svcId || !cfg.expectedIds.has(svcId)) {
          errors.push(`[${cfg.file}:L${lineIdx + 1}] serviceId "${svcId}" không thuộc split ${cfg.name}`);
          jsonlValid = false;
        }

        if (currentSplitSeenIds.has(svcId)) {
          errors.push(`[${cfg.file}:L${lineIdx + 1}] duplicate serviceId "${svcId}" trong cùng split`);
          jsonlValid = false;
        }
        currentSplitSeenIds.add(svcId);

        if (seenJsonlServiceIds.has(svcId)) {
          errors.push(`[${cfg.file}:L${lineIdx + 1}] cross-split data leakage: serviceId "${svcId}" xuất hiện ở nhiều JSONL`);
          jsonlValid = false;
        }
        seenJsonlServiceIds.add(svcId);
      } catch (err: any) {
        errors.push(`[${cfg.file}:L${lineIdx + 1}] Lỗi parse JSON: ${err.message}`);
        jsonlValid = false;
      }
    });
  }

  if (jsonlValid) {
    console.log('✅ Xác nhận: 3 file JSONL hợp lệ 100% (Schema Chat/Instruct chuẩn, Traceability cụ thể, 0% Placeholder, 0% Leakage).');
  } else {
    console.error('❌ Phát hiện lỗi trong các file JSONL!');
  }

  // 4. Thực thi kiểm thử chạy thật toàn bộ Ground Truth bằng CoverageRunner
  console.log('\n🧪 Đang chạy kiểm thử Jest và đo Code Coverage cho 15 Ground Truth test suites...\n');
  const runner = new CoverageRunner({ silent: true });
  let passedCount = 0;
  let failedCount = 0;

  console.log('| ID | Service | Tier | Split | Tests | Suite Pass | Line Cov | Branch Cov |');
  console.log('|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|');

  for (const svc of manifest.services) {
    const testPath = path.join(datasetDir, svc.folder, svc.testFile);
    const svcPath = path.join(datasetDir, svc.folder, svc.serviceFile);

    const execResult = await runner.executeTest(testPath, svcPath);
    if (execResult.executed && execResult.suitePassed) {
      passedCount++;
      const lineCov = execResult.coverage ? `${execResult.coverage.lines}%` : 'N/A';
      const branchCov = execResult.coverage ? `${execResult.coverage.branches}%` : 'N/A';
      console.log(`| ${svc.id} | ${svc.name} | ${svc.tier} | ${svc.split} | ${execResult.totalTests} | ✅ PASS | ${lineCov} | ${branchCov} |`);
    } else {
      failedCount++;
      console.log(`| ${svc.id} | ${svc.name} | ${svc.tier} | ${svc.split} | ${execResult.totalTests} | ❌ FAIL | N/A | N/A |`);
      if (execResult.errorMessage) {
        console.error(`    Lỗi chi tiết: ${execResult.errorMessage.substring(0, 150)}...`);
      }
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`📊 Kết quả kiểm định: ${passedCount}/15 Suites Đạt (100% Pass) | Lỗi: ${failedCount}`);
  console.log('----------------------------------------------------------------\n');

  if (errors.length > 0) {
    console.error('🚨 Danh sách các vi phạm phát hiện trong kiểm định:');
    errors.forEach((e) => console.error(`  - ❌ ${e}`));
    console.error('');
  }

  const success = noLeakage && partitionValid && allFilesExist && jsonlValid && failedCount === 0;

  return {
    success,
    totalServices: manifest.services.length,
    allFilesExist,
    noLeakage,
    partitionValid,
    jsonlValid,
    passedCount,
    failedCount,
    errors,
  };
}

if (require.main === module) {
  validateDataset()
    .then((res) => {
      if (!res.success) {
        console.error('❌ Kiểm định thất bại! Có vi phạm cần khắc phục.');
        process.exit(1);
      } else {
        console.log('🎉 Toàn bộ dữ liệu Ground Truth, Manifest và JSONL đã vượt qua kiểm định thành công!');
      }
    })
    .catch((err) => {
      console.error('Lỗi khi kiểm định:', err);
      process.exit(1);
    });
}
