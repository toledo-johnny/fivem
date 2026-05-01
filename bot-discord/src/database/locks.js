const { pool } = require('./mysql');

async function withTransaction(connection, work) {
  await connection.beginTransaction();

  try {
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function withLockedConnection(lockName, work, timeoutSeconds = 10) {
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [
      lockName,
      timeoutSeconds
    ]);

    if (!rows[0]?.acquired) {
      throw new Error('Nao foi possivel obter o lock operacional no banco.');
    }

    return await work(connection);
  } finally {
    await connection.query('DO RELEASE_LOCK(?)', [lockName]).catch(() => null);
    connection.release();
  }
}

async function withLockedTransaction(lockName, work, timeoutSeconds = 10) {
  return withLockedConnection(lockName, (connection) => withTransaction(connection, work), timeoutSeconds);
}

module.exports = {
  withLockedConnection,
  withLockedTransaction,
  withTransaction
};
