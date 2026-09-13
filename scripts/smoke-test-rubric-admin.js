#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const scriptPath = require('node:path').join(__dirname, 'smoke-test-rubric-admin.mjs');

const result = spawnSync(process.execPath, [scriptPath], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
