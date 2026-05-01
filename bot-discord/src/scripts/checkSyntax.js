const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

async function getJavaScriptFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJavaScriptFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const directories = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '..', '..', 'apps', 'api', 'src')
  ];
  const files = [];
  for (const directory of directories) {
    files.push(...(await getJavaScriptFiles(directory)));
  }
  let failures = 0;

  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      failures += 1;
      process.stderr.write(result.stderr || result.stdout || '');
    }
  }

  if (failures > 0) {
    console.error(`Falha de sintaxe em ${failures} arquivo(s).`);
    process.exit(1);
  }

  console.log(`Sintaxe validada em ${files.length} arquivo(s).`);
}

main().catch((error) => {
  console.error('[checkSyntax]', error);
  process.exit(1);
});
