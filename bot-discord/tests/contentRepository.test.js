const { after, test } = require('node:test');
const assert = require('node:assert/strict');

const { closePool } = require('../src/database/mysql');
const { ensureSchema } = require('../src/database/schema');
const {
  CONTENT_BLOCK_TYPES,
  DEFAULT_CONTENT_BLOCKS
} = require('../src/config/constants');
const {
  ensureDefaultContentBlocks,
  getContentBlock,
  upsertContentBlock
} = require('../src/modules/onboarding/contentRepository');

after(async () => {
  await closePool();
});

test('content repository creates defaults and updates custom content', async () => {
  await ensureSchema();

  const guildId = `test-content-${Date.now()}`;
  const defaults = await ensureDefaultContentBlocks(guildId);

  assert.ok(defaults.length >= 4);

  const rules = await getContentBlock(guildId, CONTENT_BLOCK_TYPES.RULES);
  assert.equal(rules.title, DEFAULT_CONTENT_BLOCKS[CONTENT_BLOCK_TYPES.RULES].title);

  const updated = await upsertContentBlock(guildId, CONTENT_BLOCK_TYPES.RULES, {
    title: 'Regras personalizadas',
    bodyText: 'Linha A\nLinha B',
    metadata: {
      source: 'test'
    }
  });

  assert.equal(updated.title, 'Regras personalizadas');
  assert.equal(updated.metadata.source, 'test');
});
