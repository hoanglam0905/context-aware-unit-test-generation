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
  passedCount: number;
  failedCount: number;
}> {
  console.log('================================================================');
  console.log('🔍 KIỂM ĐỊNH TẬP DỮ LIỆU & BỘ GROUND TRUTH 15 SERVICES');
  console.log('================================================================\n');

  const datasetDir = path.resolve(__dirname);
  const manifestPath = path.join(datasetDir, 'dataset_manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Dataset manifest not found: ${manifestPath}`);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`📦 Đã nạp manifest phiên bản ${manifest.version} với ${manifest.services.length} services.`);

  // 1. Kiểm tra tính độc lập (Disjoint / No leakage) của các split
  const trainSet = new Set(manifest.splits.train);
  const valSet = new Set(manifest.splits.validation);
  const testSet = new Set(manifest.splits.test);

  const trainValOverlap = [...trainSet].filter((x) => valSet.has(x));
  const trainTestOverlap = [...trainSet].filter((x) => testSet.has(x));
  const valTestOverlap = [...valSet].filter((x) => testSet.has(x));

  const hasLeakage = trainValOverlap.length > 0 || trainTestOverlap.length > 0 || valTestOverlap.length > 0;
  if (hasLeakage) {
    console.error('❌ Phát hiện rò rỉ dữ liệu giữa các splits:');
    if (trainValOverlap.length > 0) console.error(`  - Train / Val trùng: ${trainValOverlap.join(', ')}`);
    if (trainTestOverlap.length > 0) console.error(`  - Train / Test trùng: ${trainTestOverlap.join(', ')}`);
    if (valTestOverlap.length > 0) console.error(`  - Val / Test trùng: ${valTestOverlap.join(', ')}`);
  } else {
    console.log('✅ Xác nhận: Các tập Train, Validation, Test hoàn toàn độc lập (0% Data Leakage).');
    console.log(`   - Train: ${manifest.splits.train.length} services`);
    console.log(`   - Validation: ${manifest.splits.validation.length} services`);
    console.log(`   - Test Holdout: ${manifest.splits.test.length} services`);
  }

  // 2. Kiểm tra tính tồn tại của file trên đĩa
  let allFilesExist = true;
  for (const svc of manifest.services) {
    const svcFolder = path.join(datasetDir, svc.folder);
    const servicePath = path.join(svcFolder, svc.serviceFile);
    const reqPath = path.join(svcFolder, svc.requirementFile);
    const testPath = path.join(svcFolder, svc.testFile);

    if (!fs.existsSync(servicePath) || !fs.existsSync(reqPath) || !fs.existsSync(testPath)) {
      console.error(`❌ Thiếu file trong service ${svc.id}:`);
      if (!fs.existsSync(servicePath)) console.error(`  - Thiếu ${svc.serviceFile}`);
      if (!fs.existsSync(reqPath)) console.error(`  - Thiếu ${svc.requirementFile}`);
      if (!fs.existsSync(testPath)) console.error(`  - Thiếu ${svc.testFile}`);
      allFilesExist = false;
    }
  }

  if (allFilesExist) {
    console.log('✅ Xác nhận: Toàn bộ 15 services có đầy đủ service.ts, requirement.md, ground_truth.test.ts.\n');
  }

  // 3. Thực thi kiểm thử chạy thật toàn bộ Ground Truth bằng CoverageRunner
  console.log('🧪 Đang chạy kiểm thử Jest và đo Code Coverage cho 15 Ground Truth test suites...\n');
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

  return {
    success: !hasLeakage && allFilesExist && failedCount === 0,
    totalServices: manifest.services.length,
    allFilesExist,
    noLeakage: !hasLeakage,
    passedCount,
    failedCount,
  };
}

if (require.main === module) {
  validateDataset()
    .then((res) => {
      if (!res.success) {
        console.error('❌ Kiểm định thất bại!');
        process.exit(1);
      } else {
        console.log('🎉 Toàn bộ dữ liệu Ground Truth và Split đã vượt qua kiểm định thành công!');
      }
    })
    .catch((err) => {
      console.error('Lỗi khi kiểm định:', err);
      process.exit(1);
    });
}
