const env = require('../config/env');
const { brand } = require('../config/brand');

function formatOptional(value) {
  return value || 'Nao configurado';
}

function main() {
  console.log('Ambiente validado com sucesso.');
  console.log(`Brand: ${brand.shortName}`);
  console.log(`Footer: ${brand.footerName}`);
  console.log(`Guild de teste: ${formatOptional(env.discordTestGuildId)}`);
  console.log(`MySQL: ${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database}`);
  console.log(`FiveM endpoint: ${formatOptional(env.fivem.statusBaseUrl)}`);
  console.log(`FiveM connect: ${formatOptional(env.fivem.connectUrl)}`);
}

main();
