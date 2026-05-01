const fs = require('node:fs');
const path = require('node:path');

const [, , envFile, entryFile] = process.argv;

if (!envFile || !entryFile) {
  console.error(
    'Uso: node ./src/scripts/runRuntime.js <arquivo-env> <arquivo-entry>.'
  );
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFile);
const entryPath = path.resolve(process.cwd(), entryFile);

if (!fs.existsSync(envPath)) {
  console.error(`Arquivo de ambiente nao encontrado: ${envPath}`);
  process.exit(1);
}

if (!fs.existsSync(entryPath)) {
  console.error(`Arquivo de entrada nao encontrado: ${entryPath}`);
  process.exit(1);
}

process.env.BOT_ENV_PATH = envPath;
require(entryPath);
