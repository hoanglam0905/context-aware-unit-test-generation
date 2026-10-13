import * as path from 'path';
import * as fs from 'fs';
import { MutationRunner } from '../packages/core/src/mutation/mutation_runner';
import { MutationAnalyzer } from '../packages/core/src/mutation/mutation_analyzer';
import { MutationSummary } from '../packages/core/src/mutation/types';

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
}

interface DatasetManifest {
  version: string;
  name: string;
  services: ManifestService[];
}

interface RunManifestEntry {
  serviceId: string;
  tier?: string;
  model?: string;
  strategy: string;
  testFilePath: string;
}

function parseCliArgs(): {
  all: boolean;
  serviceIds: string[];
  customTestPath?: string;
  manifestPath?: string;
} {
  const args = process.argv.slice(2);
  let all = false;
  const serviceIds: string[] = [];
  let customTestPath: string | undefined;
  let manifestPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') {
      all = true;
    } else if (arg === '--service' && i + 1 < args.length) {
      serviceIds.push(args[++i]);
    } else if (arg === '--services' && i + 1 < args.length) {
      const list = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
      serviceIds.push(...list);
    } else if (arg === '--test' && i + 1 < args.length) {
      customTestPath = path.resolve(args[++i]);
    } else if (arg === '--manifest' && i + 1 < args.length) {
      manifestPath = path.resolve(args[++i]);
    }
  }

  return { all, serviceIds, customTestPath, manifestPath };
}

function findMatchingService(
  services: ManifestService[],
  idOrPrefix: string
): ManifestService | undefined {
  const norm = idOrPrefix.toLowerCase();
  return services.find(
    (s) =>
      s.id.toLowerCase() === norm ||
      s.id.toLowerCase().startsWith(norm + '_') ||
      s.folder.toLowerCase().includes(norm)
  );
}

async function main() {
  console.log('================================================================');
  console.log('🧬 TIẾN HÀNH THỰC NGHIỆM MUTATION TESTING');
  console.log('================================================================\n');

  const rootDatasetDir = path.resolve(__dirname, 'dataset');
  const manifestPath = path.join(rootDatasetDir, 'dataset_manifest.json');
  const resultsDir = path.resolve(__dirname, 'results');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Không tìm thấy dataset_manifest.json tại: ${manifestPath}`);
  }

  const manifest: DatasetManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const { all, serviceIds, customTestPath, manifestPath: customManifestPath } = parseCliArgs();

  let targetServices: ManifestService[] = [];
  if (all) {
    targetServices = manifest.services;
    console.log(`🎯 Chế độ chạy: TOÀN BỘ BENCHMARK (${targetServices.length} services)`);
  } else if (serviceIds.length > 0) {
    for (const sid of serviceIds) {
      const matched = findMatchingService(manifest.services, sid);
      if (!matched) {
        throw new Error(`Không tìm thấy service khớp với định danh: "${sid}" trong manifest.`);
      }
      if (!targetServices.some((s) => s.id === matched.id)) {
        targetServices.push(matched);
      }
    }
    console.log(`🎯 Chế độ chạy: Dịch vụ chỉ định (${targetServices.map((s) => s.id).join(', ')})`);
  } else {
    // Mặc định chạy pilot service S01_DiscountCalculator
    const defaultService = findMatchingService(manifest.services, 'S01_DiscountCalculator');
    if (!defaultService) {
      throw new Error('Không tìm thấy dịch vụ mặc định S01_DiscountCalculator.');
    }
    targetServices = [defaultService];
    console.log('🎯 Chế độ chạy: Mặc định Pilot Service S01_DiscountCalculator.');
    console.log('💡 Gợi ý: Có thể dùng flag `--all` hoặc `--service <serviceId>` để chỉ định service khác.\n');
  }

  // 🔒 Kiểm tra an toàn: Không được dùng chung một custom test path cho nhiều services!
  if (customTestPath && (all || targetServices.length > 1)) {
    throw new Error(
      `❌ Lỗi cấu hình an toàn: Cờ --test <path> chỉ được áp dụng cho đúng 1 service (ví dụ: --service S01 --test ...). Khi chạy ${targetServices.length} services hoặc --all, mỗi service bắt buộc phải dùng test suite tương ứng của mình!`
    );
  }

  // Đọc run manifest nếu có
  let batchManifestEntries: RunManifestEntry[] = [];
  if (customManifestPath && fs.existsSync(customManifestPath)) {
    try {
      const rawManifest = JSON.parse(fs.readFileSync(customManifestPath, 'utf-8'));
      batchManifestEntries = Array.isArray(rawManifest) ? rawManifest : rawManifest.runs || [];
      console.log(`📋 Đã nạp batch run manifest: ${batchManifestEntries.length} bản ghi thí nghiệm.`);
    } catch (e: any) {
      console.warn(`⚠️ Không thể nạp manifest tại ${customManifestPath}: ${e.message}`);
    }
  }

  const runner = new MutationRunner({ silent: true });
  const analyzer = new MutationAnalyzer();

  const serviceResults: Record<
    string,
    {
      serviceId: string;
      tier: string;
      groundTruth: MutationSummary;
      strategies?: Record<string, MutationSummary>;
      comparison?: any;
    }
  > = {};

  for (let idx = 0; idx < targetServices.length; idx++) {
    const s = targetServices[idx];
    const servicePath = path.join(rootDatasetDir, s.folder, s.serviceFile);
    const groundTruthTestPath = customTestPath || path.join(rootDatasetDir, s.folder, s.testFile);

    console.log(`[${idx + 1}/${targetServices.length}] 🔬 Chạy Mutation Testing cho: ${s.id} (${s.tier})...`);
    console.log(`   - Service Path: ${path.relative(process.cwd(), servicePath)}`);
    console.log(`   - Test Path:    ${path.relative(process.cwd(), groundTruthTestPath)}`);

    const groundTruthSummary = await runner.runMutationTesting(
      servicePath,
      groundTruthTestPath,
      s.id,
      'ground-truth'
    );

    console.log(`   -> Tổng Mutants: ${groundTruthSummary.totalMutants} | Hợp lệ: ${groundTruthSummary.validMutants} | Diệt: ${groundTruthSummary.killedMutants} | Sót: ${groundTruthSummary.survivedMutants} | Mutation Score: ${groundTruthSummary.mutationScore}% (${groundTruthSummary.durationMs}ms)`);

    const summaries: Record<string, MutationSummary> = {
      'ground-truth': groundTruthSummary,
    };

    // Tìm generated test từ manifest hoặc file hệ thống (flat / nested)
    const strategies = ['hybrid', 'zero-shot', 'few-shot', 'cot'];
    for (const strat of strategies) {
      let testFileToRun: string | undefined;

      // 1. Kiểm tra từ batch run manifest
      const manifestMatch = batchManifestEntries.find(
        (m) => (m.serviceId === s.id || m.serviceId.includes(s.id)) && m.strategy === strat && fs.existsSync(m.testFilePath)
      );
      if (manifestMatch) {
        testFileToRun = manifestMatch.testFilePath;
      }

      // 2. Kiểm tra flat path: results/<serviceId>_<strat>.test.ts
      if (!testFileToRun) {
        const flatPath = path.join(resultsDir, `${s.id}_${strat}.test.ts`);
        if (fs.existsSync(flatPath)) testFileToRun = flatPath;
      }

      // 3. Kiểm tra nested batch output: results/<tier>/<serviceId>/**/<strat>/generated.test.ts
      if (!testFileToRun) {
        const serviceBatchDir = path.join(resultsDir, s.tier, s.id);
        if (fs.existsSync(serviceBatchDir)) {
          const findInDir = (dir: string): string | undefined => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                if (entry.name === strat) {
                  const candidate = path.join(full, 'generated.test.ts');
                  if (fs.existsSync(candidate)) return candidate;
                }
                const nested = findInDir(full);
                if (nested) return nested;
              }
            }
            return undefined;
          };
          testFileToRun = findInDir(serviceBatchDir);
        }
      }

      if (testFileToRun && fs.existsSync(testFileToRun)) {
        console.log(`   -> Đang chạy Mutation Testing cho generated test [${strat}] (${path.relative(process.cwd(), testFileToRun)})...`);
        const genSummary = await runner.runMutationTesting(
          servicePath,
          testFileToRun,
          s.id,
          strat
        );
        summaries[strat] = genSummary;
        console.log(`      Score [${strat}]: ${genSummary.mutationScore}%`);
      }
    }

    let comparison: any = undefined;
    if (Object.keys(summaries).length > 1) {
      comparison = analyzer.compareStrategies(s.id, summaries);
    }

    serviceResults[s.id] = {
      serviceId: s.id,
      tier: s.tier,
      groundTruth: groundTruthSummary,
      strategies: summaries,
      comparison,
    };
  }

  // Tổng hợp dữ liệu
  let totalMutantsAll = 0;
  let validMutantsAll = 0;
  let killedMutantsAll = 0;
  let survivedMutantsAll = 0;
  let timeoutMutantsAll = 0;
  let compileErrorMutantsAll = 0;

  for (const item of Object.values(serviceResults)) {
    const gt = item.groundTruth;
    totalMutantsAll += gt.totalMutants;
    validMutantsAll += gt.validMutants;
    killedMutantsAll += gt.killedMutants;
    survivedMutantsAll += gt.survivedMutants;
    timeoutMutantsAll += gt.timeoutMutants;
    compileErrorMutantsAll += gt.compileErrorMutants;
  }

  const overallMutationScore =
    validMutantsAll > 0
      ? parseFloat((((killedMutantsAll + timeoutMutantsAll) / validMutantsAll) * 100).toFixed(2))
      : 0;

  const outputSummaryJson = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    executionCommand: `npm run experiment:mutation ${process.argv.slice(2).join(' ')}`.trim(),
    formula: 'Mutation Score (%) = (Killed + Timeout) / (Total - CompileError) * 100',
    testedServices: targetServices.map((s) => s.id),
    aggregate: {
      totalServices: targetServices.length,
      totalMutants: totalMutantsAll,
      validMutants: validMutantsAll,
      killedMutants: killedMutantsAll,
      survivedMutants: survivedMutantsAll,
      timeoutMutants: timeoutMutantsAll,
      compileErrorMutants: compileErrorMutantsAll,
      overallMutationScore,
    },
    services: serviceResults,
  };

  const summaryJsonPath = path.join(resultsDir, 'mutation_summary.json');
  fs.writeFileSync(summaryJsonPath, JSON.stringify(outputSummaryJson, null, 2), 'utf-8');

  // Tạo báo cáo Markdown chi tiết
  const mdLines: string[] = [];
  mdLines.push('# 🧬 Báo Cáo Thực Nghiệm Mutation Testing');
  mdLines.push('');
  mdLines.push(`- **Thời gian thực hiện:** ${outputSummaryJson.generatedAt}`);
  mdLines.push(`- **Lệnh thực thi:** \`${outputSummaryJson.executionCommand}\``);
  mdLines.push(`- **Công thức tính:** \`${outputSummaryJson.formula}\``);
  mdLines.push(`- **Số lượng Service đánh giá:** ${targetServices.length} (trên 15 services)`);
  mdLines.push(`- **Tổng số Mutants sinh ra:** ${totalMutantsAll}`);
  mdLines.push(`- **Tổng số Mutants hợp lệ (Mẫu số):** ${validMutantsAll}`);
  mdLines.push(`- **Tổng số Mutants bị tiêu diệt (Tử số):** ${killedMutantsAll}`);
  mdLines.push(`- **Mutation Score trung bình:** **${overallMutationScore}%**`);
  mdLines.push('');
  mdLines.push('## 1. Bảng Tổng Hợp Kết Quả Ground Truth');
  mdLines.push('');
  mdLines.push('| Service ID | Phân loại | Tổng Mutants | Hợp lệ (Mẫu số) | Tiêu diệt (Killed) | Sống sót (Survived) | Lỗi biên dịch | **Mutation Score (%)** |');
  mdLines.push('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

  for (const s of targetServices) {
    const res = serviceResults[s.id].groundTruth;
    mdLines.push(
      `| **${s.id}** | ${s.tier} | ${res.totalMutants} | ${res.validMutants} | ${res.killedMutants} | ${res.survivedMutants} | ${res.compileErrorMutants} | **${res.mutationScore}%** |`
    );
  }

  mdLines.push(
    `| **TỔNG HỢP / TRUNG BÌNH** | - | **${totalMutantsAll}** | **${validMutantsAll}** | **${killedMutantsAll}** | **${survivedMutantsAll}** | **${compileErrorMutantsAll}** | **${overallMutationScore}%** |`
  );
  mdLines.push('');

  // Chi tiết từng Mutant cho từng service
  mdLines.push('## 2. Chi Tiết Từng Mutant Theo Từng Dịch Vụ');
  mdLines.push('');

  for (const s of targetServices) {
    const res = serviceResults[s.id].groundTruth;
    mdLines.push(`### 🔹 ${s.id} (Score: ${res.mutationScore}%)`);
    mdLines.push('');
    mdLines.push('| ID | Loại Mutator | Dòng | Trạng thái | Mô tả Đột biến | Test Case Tiêu diệt |');
    mdLines.push('| :--- | :--- | :---: | :---: | :--- | :--- |');

    for (const mRes of res.results) {
      const m = mRes.mutant;
      const killing = mRes.killingTestName ? `\`${mRes.killingTestName}\`` : '-';
      const statusEmoji = mRes.status === 'KILLED' ? '✅ KILLED' : mRes.status === 'SURVIVED' ? '⚠️ SURVIVED' : mRes.status;
      mdLines.push(
        `| \`${m.id}\` | \`${m.mutatorType}\` | ${m.lineNumber} | ${statusEmoji} | ${m.description} | ${killing} |`
      );
    }
    mdLines.push('');
  }

  const reportMdPath = path.join(resultsDir, 'mutation_report.md');
  fs.writeFileSync(reportMdPath, mdLines.join('\n'), 'utf-8');

  console.log(`\n================================================================`);
  console.log(`✅ Đã xuất báo cáo chi tiết tại: ${reportMdPath}`);
  console.log(`✅ Đã xuất dữ liệu tổng hợp tại: ${summaryJsonPath}`);
  console.log('================================================================\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Mutation testing error:', err);
    process.exit(1);
  });
}
