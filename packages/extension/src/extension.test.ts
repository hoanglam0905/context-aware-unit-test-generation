import * as path from 'path';
import * as fs from 'fs';

describe('Thành viên C - VS Code Extension (Step 1: Extension Scaffolding & Webview Setup)', () => {
  const extensionPkgPath = path.resolve(__dirname, '../package.json');

  describe('1. Extension Manifest Validation (package.json)', () => {
    let pkg: any;

    beforeAll(() => {
      expect(fs.existsSync(extensionPkgPath)).toBe(true);
      const content = fs.readFileSync(extensionPkgPath, 'utf-8');
      pkg = JSON.parse(content);
    });

    it('khai báo đầy đủ metadata, publisher và categories', () => {
      expect(pkg.name).toBe('context-aware-unit-test-generation-extension');
      expect(pkg.publisher).toBe('utc2-research-team');
      expect(pkg.categories).toContain('Testing');
      expect(pkg.engines.vscode).toBeDefined();
    });

    it('đăng ký đầy đủ các commands cần thiết', () => {
      const commands = pkg.contributes.commands;
      expect(Array.isArray(commands)).toBe(true);
      const commandIds = commands.map((c: any) => c.command);

      expect(commandIds).toContain('contextAwareTestGen.generateTest');
      expect(commandIds).toContain('contextAwareTestGen.openSettings');
      expect(commandIds).toContain('contextAwareTestGen.openSidebar');
    });

    it('cấu hình Menu chuột phải (Context Menu) trong Editor và Explorer', () => {
      const editorMenus = pkg.contributes.menus['editor/context'];
      const explorerMenus = pkg.contributes.menus['explorer/context'];

      expect(editorMenus).toBeDefined();
      expect(editorMenus.some((m: any) => m.command === 'contextAwareTestGen.generateTest')).toBe(true);

      expect(explorerMenus).toBeDefined();
      expect(explorerMenus.some((m: any) => m.command === 'contextAwareTestGen.generateTest')).toBe(true);
    });

    it('đăng ký Activity Bar View Container và Sidebar Webview View', () => {
      const viewContainers = pkg.contributes.viewsContainers.activitybar;
      expect(viewContainers.some((vc: any) => vc.id === 'context-aware-test-gen-container')).toBe(true);

      const views = pkg.contributes.views['context-aware-test-gen-container'];
      expect(views.some((v: any) => v.id === 'contextAwareTestGen.sidebarView')).toBe(true);
    });

    it('cấu hình Settings properties cho Model Provider và Prompt Strategy', () => {
      const properties = pkg.contributes.configuration.properties;
      expect(properties['contextAwareTestGen.modelProvider']).toBeDefined();
      expect(properties['contextAwareTestGen.promptStrategy']).toBeDefined();
      expect(properties['contextAwareTestGen.autoRunCoverage']).toBeDefined();
    });
  });

  describe('2. Webview HTML & Protocol Verification', () => {
    it('đảm bảo các files nguồn của Extension tồn tại và hợp lệ', () => {
      const extSource = path.resolve(__dirname, 'extension.ts');
      const sidebarSource = path.resolve(__dirname, 'sidebar/sidebar_provider.ts');
      const previewSource = path.resolve(__dirname, 'webview/preview_panel.ts');
      const typesSource = path.resolve(__dirname, 'types.ts');

      expect(fs.existsSync(extSource)).toBe(true);
      expect(fs.existsSync(sidebarSource)).toBe(true);
      expect(fs.existsSync(previewSource)).toBe(true);
      expect(fs.existsSync(typesSource)).toBe(true);
    });
  });
});
