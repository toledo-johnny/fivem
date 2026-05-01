const { after, test } = require('node:test');
const assert = require('node:assert/strict');

const { closePool } = require('../src/database/mysql');
const { ensureSchema } = require('../src/database/schema');
const {
  getSystemJob,
  listSystemJobs,
  upsertSystemJob
} = require('../src/modules/system/jobRepository');

after(async () => {
  await closePool();
});

test('system jobs repository persists heartbeat information', async () => {
  await ensureSchema();

  const jobKey = `test-job-${Date.now()}`;
  const now = new Date();

  await upsertSystemJob(jobKey, 'ok', { checked: true }, now);
  const job = await getSystemJob(jobKey);

  assert.equal(job.jobKey, jobKey);
  assert.equal(job.status, 'ok');
  assert.equal(job.details.checked, true);

  const jobs = await listSystemJobs();
  assert.ok(jobs.some((entry) => entry.jobKey === jobKey));
});
