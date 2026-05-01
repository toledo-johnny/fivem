const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

async function getTestFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getTestFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const testsDirectory = path.resolve(process.cwd(), 'tests');
  const files = await getTestFiles(testsDirectory);

  if (files.length === 0) {
    console.log('Nenhum teste encontrado.');
    return;
  }

  const result = spawnSync(process.execPath, ['--test', ...files], {
    stdio: 'inherit'
  });

  process.exit(result.status || 0);
}

main().catch((error) => {
  console.error('[runTests]', error);
  process.exit(1);
});
