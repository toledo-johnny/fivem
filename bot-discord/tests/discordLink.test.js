const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractDiscordUserId,
  hasDiscordIdentifier,
  normalizeStoredDiscord
} = require('../src/utils/discordLink');

test('normalizeStoredDiscord treats legacy zero values as empty', () => {
  assert.equal(normalizeStoredDiscord('0'), '');
  assert.equal(normalizeStoredDiscord(0), '');
  assert.equal(normalizeStoredDiscord('discord:0'), '');
  assert.equal(normalizeStoredDiscord('<@0>'), '');
  assert.equal(normalizeStoredDiscord('<@!0>'), '');
  assert.equal(hasDiscordIdentifier('0'), false);
});

test('extractDiscordUserId keeps valid discord identifiers working', () => {
  assert.equal(extractDiscordUserId('discord:316017960538079234'), '316017960538079234');
  assert.equal(extractDiscordUserId('<@316017960538079234>'), '316017960538079234');
  assert.equal(extractDiscordUserId('316017960538079234'), '316017960538079234');
});
