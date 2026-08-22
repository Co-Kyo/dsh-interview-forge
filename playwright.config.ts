import { defineConfig } from '@playwright/test';

// InterviewForge 答题流程 e2e：直击 live GUI（http://127.0.0.1:3080）。
// 本环境（bwrap 沙箱）下 chromium 自身沙箱无法起命名空间，必须 --no-sandbox。
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1, // 共享同一个 live 宿主与队列，串行避免互相干扰
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3080',
    headless: true,
    launchOptions: { args: ['--no-sandbox'] },
    contextOptions: { viewport: { width: 1440, height: 900 } },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
