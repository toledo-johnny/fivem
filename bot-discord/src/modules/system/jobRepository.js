const { pool } = require('../../database/mysql');
const { safeParseJson, safeStringifyJson } = require('../../utils/json');

function mapJobRow(row) {
  if (!row) return null;

  return {
    jobKey: row.job_key,
    status: row.status,
    details: safeParseJson(row.details_text, {}),
    lastRunAt: row.last_run_at,
    updatedAt: row.updated_at
  };
}

async function upsertSystemJob(jobKey, status, details = {}, lastRunAt = new Date()) {
  await pool.execute(
    `
      INSERT INTO discord_bot_system_jobs (
        job_key,
        status,
        details_text,
        last_run_at
      )
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        details_text = VALUES(details_text),
        last_run_at = VALUES(last_run_at)
    `,
    [jobKey, status, safeStringifyJson(details, {}), lastRunAt]
  );

  return getSystemJob(jobKey);
}

async function getSystemJob(jobKey) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_system_jobs WHERE job_key = ? LIMIT 1',
    [jobKey]
  );

  return mapJobRow(rows[0] || null);
}

async function listSystemJobs() {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_system_jobs ORDER BY job_key ASC'
  );

  return rows.map(mapJobRow).filter(Boolean);
}

module.exports = {
  getSystemJob,
  listSystemJobs,
  upsertSystemJob
};
