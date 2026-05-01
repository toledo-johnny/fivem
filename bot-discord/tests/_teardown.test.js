const { after } = require('node:test');
const { closePool } = require('../src/database/mysql');

after(async () => {
  await closePool();
});
