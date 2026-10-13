const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const yauzl = require('yauzl');
const yazl = require('yazl');

function run(cmd, cwd) {
  console.log(`Running: ${cmd} in ${cwd || process.cwd()}`);
  cp.execSync(cmd, { cwd: cwd || process.cwd(), stdio: 'inherit' });
}

async function main() {
  const extensionDir = path.resolve(__dirname, '..');
  const rootDir = path.resolve(extensionDir, '../..');
  const vsixFileName = 'context-aware-unit-test-generation-extension-0.1.0.vsix';
  const vsixPath = path.join(extensionDir, vsixFileName);
  const tempVsixPath = path.join(extensionDir, 'bundled_temp.vsix');

  // 1. Biên dịch TypeScript cho Extension
  console.log('📦 Bước 1: Biên dịch mã TypeScript Extension...');
  run('npm run compile:extension', rootDir);

  // 2. Chạy vsce package để tạo VSIX ban đầu kèm manifest và content types
  console.log('📦 Bước 2: Đóng gói base VSIX qua @vscode/vsce...');
  run('npx @vscode/vsce package --no-dependencies --skip-license', extensionDir);

  if (!fs.existsSync(vsixPath)) {
    throw new Error(`Không tìm thấy file VSIX tại: ${vsixPath}`);
  }

  // 3. Đóng gói thêm runtime production dependencies vào extension/node_modules/
  console.log('📦 Bước 3: Đóng gói runtime dependencies (typescript, dotenv) vào VSIX bundle...');
  await new Promise((resolve, reject) => {
    const zipFile = new yazl.ZipFile();

    yauzl.open(vsixPath, { lazyEntries: true }, (err, inZip) => {
      if (err) return reject(err);

      inZip.readEntry();
      inZip.on('entry', (entry) => {
        inZip.openReadStream(entry, (err, readStream) => {
          if (err) return reject(err);
          zipFile.addReadStream(readStream, entry.fileName);
          inZip.readEntry();
        });
      });

      inZip.on('end', () => {
        // Đệ quy thêm các thư mục dependency cần thiết
        function addDir(localDir, zipPrefix) {
          if (!fs.existsSync(localDir)) {
            throw new Error(`[package_extension] Thư mục dependency bắt buộc không tồn tại: ${localDir}`);
          }
          const items = fs.readdirSync(localDir);
          for (const item of items) {
            const fullLocal = path.join(localDir, item);
            const fullZip = path.posix.join(zipPrefix, item);
            const stat = fs.statSync(fullLocal);
            if (stat.isDirectory()) {
              addDir(fullLocal, fullZip);
            } else {
              zipFile.addFile(fullLocal, fullZip);
            }
          }
        }

        // Đóng gói node_modules/dotenv và node_modules/typescript
        const dotenvDir = path.join(rootDir, 'node_modules', 'dotenv');
        const tsDir = path.join(rootDir, 'node_modules', 'typescript');

        if (!fs.existsSync(dotenvDir)) {
          throw new Error(`[package_extension] Không tìm thấy thư mục dotenv bắt buộc tại: ${dotenvDir}`);
        }
        if (!fs.existsSync(tsDir)) {
          throw new Error(`[package_extension] Không tìm thấy thư mục typescript bắt buộc tại: ${tsDir}`);
        }

        addDir(dotenvDir, 'extension/node_modules/dotenv');
        addDir(tsDir, 'extension/node_modules/typescript');

        zipFile.end();
        const outStream = fs.createWriteStream(tempVsixPath);
        zipFile.outputStream.pipe(outStream).on('close', () => {
          resolve();
        });
        outStream.on('error', reject);
      });
    });
  });

  // 4. Thay thế file VSIX ban đầu bằng file VSIX đã đóng gói đủ dependencies
  fs.unlinkSync(vsixPath);
  fs.renameSync(tempVsixPath, vsixPath);

  // 5. Xác minh tính toàn vẹn (Self-Contained Verification) của archive VSIX
  console.log('🔍 Bước 4: Kiểm tra tính toàn vẹn các entry runtime dependencies trong file VSIX...');
  await new Promise((resolve, reject) => {
    let hasTs = false;
    let hasDotenv = false;

    yauzl.open(vsixPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.readEntry();
      zip.on('entry', (entry) => {
        if (entry.fileName.includes('node_modules/typescript/lib/typescript.js')) {
          hasTs = true;
        }
        if (entry.fileName.includes('node_modules/dotenv/lib/main.js') || entry.fileName.includes('node_modules/dotenv/package.json')) {
          hasDotenv = true;
        }
        zip.readEntry();
      });
      zip.on('end', () => {
        if (!hasTs || !hasDotenv) {
          return reject(
            new Error(
              `[package_extension] Xác minh thất bại: VSIX archive thiếu runtime dependencies! (hasTs=${hasTs}, hasDotenv=${hasDotenv})`
            )
          );
        }
        resolve();
      });
      zip.on('error', reject);
    });
  });

  const finalStats = fs.statSync(vsixPath);
  console.log(`✅ Hoàn tất đóng gói VSIX tự chủ hoàn toàn (Self-Contained Release):`);
  console.log(`   - File: ${vsixPath}`);
  console.log(`   - Kích thước: ${(finalStats.size / (1024 * 1024)).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('❌ Lỗi khi đóng gói extension:', err);
  process.exit(1);
});
