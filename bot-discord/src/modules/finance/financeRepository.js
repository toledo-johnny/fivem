const { pool } = require('../../database/mysql');
const { getPlayerByAccountId } = require('../players/playerRepository');

function getExecutor(executor) {
  return executor || pool;
}

function getMonthStartUnix() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return Math.floor(monthStart.getTime() / 1000);
}

function mapPaymentRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    target: Number(row.target),
    type: row.type,
    description: row.description,
    value: Number(row.value || 0),
    createdAt:
      row.created_at && Number(row.created_at) > 0
        ? new Date(Number(row.created_at) * 1000).toISOString()
        : null
  };
}

async function getFinanceSummary(executor = pool) {
  const queryExecutor = getExecutor(executor);
  const monthStartUnix = getMonthStartUnix();

  const [summaryRows] = await queryExecutor.execute(
    `
      SELECT
        COUNT(*) AS total_payments,
        COALESCE(SUM(value), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN value ELSE 0 END), 0) AS revenue_month
      FROM smartphone_paypal_transactions
    `,
    [monthStartUnix]
  );

  const [recentRows] = await queryExecutor.execute(
    `
      SELECT *
      FROM smartphone_paypal_transactions
      ORDER BY created_at DESC, id DESC
      LIMIT 20
    `
  );

  const [topRows] = await queryExecutor.execute(
    `
      SELECT
        user_id,
        COUNT(*) AS purchases,
        COALESCE(SUM(value), 0) AS total_spent
      FROM smartphone_paypal_transactions
      GROUP BY user_id
      ORDER BY total_spent DESC, purchases DESC, user_id DESC
      LIMIT 10
    `
  );

  const topBuyers = [];
  for (const row of topRows) {
    const player = await getPlayerByAccountId(row.user_id, queryExecutor);
    topBuyers.push({
      userId: Number(row.user_id),
      purchases: Number(row.purchases || 0),
      totalSpent: Number(row.total_spent || 0),
      player
    });
  }

  return {
    totals: {
      totalPayments: Number(summaryRows[0]?.total_payments || 0),
      totalRevenue: Number(summaryRows[0]?.total_revenue || 0),
      revenueMonth: Number(summaryRows[0]?.revenue_month || 0),
      diamondsSold: 0
    },
    capabilities: {
      paymentHistory: true,
      diamondsSold: false
    },
    recentPayments: recentRows.map(mapPaymentRow).filter(Boolean),
    topBuyers
  };
}

module.exports = {
  getFinanceSummary
};
