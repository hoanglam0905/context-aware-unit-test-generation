import * as fs from 'fs';
import * as path from 'path';

export class RequirementFinder {
  private static readonly CANDIDATE_NAMES = [
    'requirement.md',
    'requirements.md',
    'spec.md',
    'specification.md',
    'srs.md',
    'ba_doc.md',
    'README.md',
    'acceptance_criteria.md',
    'requirement.json',
  ];

  /**
   * Tự động tìm kiếm file tài liệu BA liên kết với file Service
   */
  public static findRequirementFile(serviceFilePath: string): string | undefined {
    const serviceDir = path.dirname(serviceFilePath);

    // 1. Tìm trong cùng thư mục với file service
    for (const name of this.CANDIDATE_NAMES) {
      const candidatePath = path.join(serviceDir, name);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    // 2. Tìm trong thư mục docs/ hoặc requirements/ ở cấp cha gần nhất
    const parentDir = path.dirname(serviceDir);
    const candidateDirs = ['docs', 'requirements', 'specs'];

    for (const dir of candidateDirs) {
      for (const name of this.CANDIDATE_NAMES) {
        const candidatePath = path.join(parentDir, dir, name);
        if (fs.existsSync(candidatePath)) {
          return candidatePath;
        }
      }
    }

    return undefined;
  }
}
