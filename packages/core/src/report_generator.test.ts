import * as fs from 'fs';
import * as path from 'path';
import { BenchmarkReportGenerator } from '../../../experiments/generate_report';

describe('BenchmarkReportGenerator (Commit 5)', () => {
  const tmpDir = path.resolve(__dirname, '../../../experiments/results_test_tmp');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    // Tạo sample evaluation_summary.json giả lập
    const sampleEval = {
      totalEvaluated: 4,
      compilabilityRate: 100,
      firstPassExecutionRate: 100,
      avgLineCoverage: 85.5,
      avgBranchCoverage: 78.2,
      byStrategy: {
        'zero-shot': {
          count: 1,
          compilableCount: 1,
          compilabilityRate: 100,
          totalTests: 5,
          passedTests: 5,
          passRate: 100,
          avgLineCoverage: 80,
          avgBranchCoverage: 70,
        },
        'few-shot': {
          count: 1,
          compilableCount: 1,
          compilabilityRate: 100,
          totalTests: 6,
          passedTests: 6,
          passRate: 100,
          avgLineCoverage: 85,
          avgBranchCoverage: 80,
        },
        cot: {
          count: 1,
          compilableCount: 1,
          compilabilityRate: 100,
          totalTests: 8,
          passedTests: 8,
          passRate: 100,
          avgLineCoverage: 90,
          avgBranchCoverage: 85,
        },
        hybrid: {
          count: 1,
          compilableCount: 1,
          compilabilityRate: 100,
          totalTests: 10,
          passedTests: 10,
          passRate: 100,
          avgLineCoverage: 95,
          avgBranchCoverage: 90,
        },
      },
      byTier: {
        simple: { count: 2, compilableCount: 2, compilabilityRate: 100, avgLineCoverage: 90, avgBranchCoverage: 85 },
        medium: { count: 1, compilableCount: 1, compilabilityRate: 100, avgLineCoverage: 85, avgBranchCoverage: 80 },
        complex: { count: 1, compilableCount: 1, compilabilityRate: 100, avgLineCoverage: 80, avgBranchCoverage: 70 },
      },
      byModel: {
        'test-model': { count: 4, compilabilityRate: 100, passRate: 100 },
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'evaluation_summary.json'), JSON.stringify(sampleEval), 'utf-8');
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('phải tạo báo cáo thống kê đầy đủ 4 chiến lược prompt và xuất file markdown + csv', () => {
    const generator = new BenchmarkReportGenerator({
      resultsDir: tmpDir,
      outputDir: tmpDir,
    });

    const report = generator.generate();

    expect(report.totalRunsEvaluated).toBe(4);
    expect(report.strategies.length).toBe(4);
    expect(report.markdownContent).toContain('BÁO CÁO THỐNG KÊ & PHÂN TÍCH THỰC NGHIỆM ĐÁNH GIÁ');
    expect(report.markdownContent).toContain('pie title Tỉ lệ phân bổ kịch bản kiểm thử theo chiến lược');

    // Kiểm tra xem 2 file output có được tạo không
    expect(fs.existsSync(path.join(tmpDir, 'report_summary.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'benchmark_matrix.csv'))).toBe(true);

    const csvContent = fs.readFileSync(path.join(tmpDir, 'benchmark_matrix.csv'), 'utf-8');
    expect(csvContent).toContain('"hybrid"');
    expect(csvContent).toContain('"zero-shot"');
  });
});
