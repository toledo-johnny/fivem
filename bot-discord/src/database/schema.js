const { pool } = require('./mysql');

const REQUIRED_CITY_SCHEMA = {
  accounts: ['id', 'whitelist', 'gems', 'premium', 'discord', 'license'],
  characters: ['id', 'license', 'name', 'name2', 'bank', 'fines', 'prison', 'discord', 'deleted'],
  playerdata: ['Passport', 'dkey', 'dvalue'],
  entitydata: ['dkey', 'dvalue']
};

const baselineStatements = [
  `
    CREATE TABLE IF NOT EXISTS discord_bot_schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      migration_key VARCHAR(120) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_schema_migrations_key (migration_key)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_guild_configs (
      guild_id VARCHAR(32) PRIMARY KEY,
      support_role_id VARCHAR(32) NULL,
      admin_role_id VARCHAR(32) NULL,
      owner_role_id VARCHAR(32) NULL,
      staff_role_id VARCHAR(32) NULL,
      whitelist_role_id VARCHAR(32) NULL,
      unverified_role_id VARCHAR(32) NULL,
      ticket_category_id VARCHAR(32) NULL,
      ticket_panel_channel_id VARCHAR(32) NULL,
      ticket_panel_message_id VARCHAR(32) NULL,
      whitelist_panel_channel_id VARCHAR(32) NULL,
      whitelist_panel_message_id VARCHAR(32) NULL,
      whitelist_review_channel_id VARCHAR(32) NULL,
      ticket_settings_text LONGTEXT NOT NULL,
      whitelist_settings_text LONGTEXT NOT NULL,
      log_channels_text LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_panels (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      panel_type VARCHAR(32) NOT NULL,
      channel_id VARCHAR(32) NOT NULL,
      message_id VARCHAR(32) NULL,
      metadata_text LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_panels_guild_panel (guild_id, panel_type)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_tickets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      channel_id VARCHAR(32) NOT NULL,
      owner_id VARCHAR(32) NOT NULL,
      category_key VARCHAR(32) NOT NULL,
      status VARCHAR(16) NOT NULL,
      claimed_by VARCHAR(32) NULL,
      close_reason TEXT NULL,
      transcript_log_channel_id VARCHAR(32) NULL,
      transcript_message_id VARCHAR(32) NULL,
      closed_by VARCHAR(32) NULL,
      opened_at DATETIME NOT NULL,
      claimed_at DATETIME NULL,
      closed_at DATETIME NULL,
      metadata_text LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_tickets_channel (channel_id),
      KEY idx_discord_bot_tickets_owner_status (guild_id, owner_id, status)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_ticket_members (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ticket_id BIGINT UNSIGNED NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      added_by VARCHAR(32) NOT NULL,
      removed_by VARCHAR(32) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_ticket_member (ticket_id, user_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_whitelist_applications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      status VARCHAR(16) NOT NULL,
      question_version INT NOT NULL DEFAULT 1,
      answers_text LONGTEXT NOT NULL,
      user_server_id VARCHAR(32) NULL,
      character_name VARCHAR(64) NULL,
      linked_user_id INT NULL,
      review_channel_id VARCHAR(32) NULL,
      review_message_id VARCHAR(32) NULL,
      reviewer_id VARCHAR(32) NULL,
      rejection_reason TEXT NULL,
      submitted_at DATETIME NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_discord_bot_whitelist_user_status (guild_id, user_id, status)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_whitelist_attempts (
      guild_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      attempts_used INT NOT NULL DEFAULT 0,
      last_attempt_at DATETIME NULL,
      cooldown_until DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NULL,
      event_type VARCHAR(64) NOT NULL,
      actor_id VARCHAR(32) NULL,
      target_id VARCHAR(32) NULL,
      entity_type VARCHAR(32) NULL,
      entity_id VARCHAR(64) NULL,
      details_text LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_discord_bot_audit_logs_guild_created (guild_id, created_at)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_staff_notes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      entity_type VARCHAR(32) NOT NULL,
      entity_id VARCHAR(64) NOT NULL,
      actor_id VARCHAR(32) NOT NULL,
      note_text TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_discord_bot_staff_notes_entity (guild_id, entity_type, entity_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_content_blocks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      content_key VARCHAR(32) NOT NULL,
      title VARCHAR(120) NOT NULL,
      body_text LONGTEXT NOT NULL,
      metadata_text LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_content_blocks (guild_id, content_key)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_system_jobs (
      job_key VARCHAR(64) NOT NULL PRIMARY KEY,
      status VARCHAR(24) NOT NULL,
      details_text LONGTEXT NOT NULL,
      last_run_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_portal_settings (
      guild_id VARCHAR(32) NOT NULL PRIMARY KEY,
      server_name VARCHAR(120) NOT NULL,
      short_name VARCHAR(64) NULL,
      logo_url TEXT NULL,
      hero_title VARCHAR(180) NOT NULL,
      hero_subtitle TEXT NOT NULL,
      hero_image_url TEXT NULL,
      discord_url TEXT NULL,
      connect_url TEXT NULL,
      primary_color VARCHAR(16) NOT NULL,
      accent_color VARCHAR(16) NOT NULL,
      social_links_text LONGTEXT NOT NULL,
      landing_sections_text LONGTEXT NOT NULL,
      footer_text VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_portal_news (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      title VARCHAR(160) NOT NULL,
      category VARCHAR(64) NOT NULL,
      description_text TEXT NOT NULL,
      image_url TEXT NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      published_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_discord_bot_portal_news_guild_published (guild_id, is_published, published_at)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_portal_servers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description_text TEXT NOT NULL,
      image_url TEXT NULL,
      status_label VARCHAR(64) NULL,
      connect_url TEXT NULL,
      permission_required VARCHAR(64) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      display_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_discord_bot_portal_servers_guild_active (guild_id, is_active, display_order)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_portal_packages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description_text TEXT NOT NULL,
      diamond_amount INT NOT NULL DEFAULT 0,
      bonus_amount INT NOT NULL DEFAULT 0,
      price_cents INT NOT NULL DEFAULT 0,
      checkout_url TEXT NULL,
      highlight_label VARCHAR(64) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      display_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_discord_bot_portal_packages_guild_active (guild_id, is_active, display_order)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_payment_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      discord_user_id VARCHAR(32) NOT NULL,
      player_account_id BIGINT NULL,
      package_id BIGINT UNSIGNED NOT NULL,
      provider VARCHAR(24) NOT NULL DEFAULT 'mercadopago',
      external_reference VARCHAR(120) NOT NULL,
      package_snapshot_text LONGTEXT NOT NULL,
      metadata_text LONGTEXT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      currency_id VARCHAR(8) NOT NULL DEFAULT 'BRL',
      total_price_cents INT NOT NULL DEFAULT 0,
      total_diamonds INT NOT NULL DEFAULT 0,
      total_bonus INT NOT NULL DEFAULT 0,
      payment_status VARCHAR(24) NOT NULL DEFAULT 'draft',
      delivery_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      provider_preference_id VARCHAR(120) NULL,
      provider_checkout_url TEXT NULL,
      provider_payment_id VARCHAR(120) NULL,
      approved_at DATETIME NULL,
      delivered_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_payment_orders_reference (external_reference),
      KEY idx_discord_bot_payment_orders_discord (discord_user_id, created_at),
      KEY idx_discord_bot_payment_orders_status (payment_status, delivery_status, created_at)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_payment_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NULL,
      provider VARCHAR(24) NOT NULL,
      provider_event_type VARCHAR(64) NOT NULL,
      provider_resource_id VARCHAR(120) NULL,
      request_id VARCHAR(120) NULL,
      payload_text LONGTEXT NOT NULL,
      headers_text LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_discord_bot_payment_events_order (order_id, created_at),
      KEY idx_discord_bot_payment_events_provider (provider, provider_resource_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_payment_deliveries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      player_account_id BIGINT NOT NULL,
      provider_payment_id VARCHAR(120) NULL,
      gems_before INT NOT NULL DEFAULT 0,
      gems_after INT NOT NULL DEFAULT 0,
      gems_delta INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      details_text LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_payment_deliveries_order (order_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS discord_bot_webhook_receipts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      provider VARCHAR(24) NOT NULL,
      request_id VARCHAR(120) NULL,
      signature_text TEXT NULL,
      manifest_text TEXT NULL,
      query_text LONGTEXT NOT NULL,
      headers_text LONGTEXT NOT NULL,
      body_text LONGTEXT NOT NULL,
      is_valid_signature TINYINT(1) NOT NULL DEFAULT 0,
      processing_status VARCHAR(24) NOT NULL DEFAULT 'received',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_discord_bot_webhook_receipts_request (provider, request_id)
    )
  `
];

async function migrationAlreadyApplied(migrationKey) {
  const [rows] = await pool.execute(
    'SELECT 1 FROM discord_bot_schema_migrations WHERE migration_key = ? LIMIT 1',
    [migrationKey]
  );

  return rows.length > 0;
}

async function markMigrationApplied(migrationKey) {
  await pool.execute(
    `
      INSERT INTO discord_bot_schema_migrations (migration_key)
      VALUES (?)
      ON DUPLICATE KEY UPDATE migration_key = VALUES(migration_key)
    `,
    [migrationKey]
  );
}

async function getColumnNames(tableName) {
  const [rows] = await pool.execute(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
    `,
    [tableName]
  );

  return new Set(rows.map((row) => row.column_name || row.COLUMN_NAME));
}

async function ensureColumn(tableName, columnName, definition) {
  const columns = await getColumnNames(tableName);
  if (columns.has(columnName)) {
    return;
  }

  await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
}

async function ensureBaseTables() {
  for (const statement of baselineStatements) {
    await pool.query(statement);
  }
}

async function syncLegacyRoleColumns() {
  await pool.query(`
    UPDATE discord_bot_guild_configs
    SET
      support_role_id = COALESCE(support_role_id, staff_role_id),
      admin_role_id = COALESCE(admin_role_id, staff_role_id),
      staff_role_id = COALESCE(staff_role_id, support_role_id, admin_role_id)
  `);
}

async function ensureSharedCitySchema() {
  const missing = [];

  for (const [tableName, columns] of Object.entries(REQUIRED_CITY_SCHEMA)) {
    const existingColumns = await getColumnNames(tableName);
    for (const columnName of columns) {
      if (!existingColumns.has(columnName)) {
        missing.push(`${tableName}.${columnName}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Schema da cidade incompleto para o portal compartilhado: ${missing.join(', ')}.`
    );
  }
}

async function getSharedCitySchemaHealth() {
  try {
    await ensureSharedCitySchema();
    return {
      ok: true,
      missing: []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      missing: message
    };
  }
}

const migrations = [
  {
    key: '001_baseline_shared_bot_schema',
    up: async () => {
      await ensureBaseTables();
    }
  },
  {
    key: '002_roles_and_payments',
    up: async () => {
      await ensureColumn(
        'discord_bot_guild_configs',
        'support_role_id',
        '`support_role_id` VARCHAR(32) NULL AFTER `guild_id`'
      );
      await ensureColumn(
        'discord_bot_guild_configs',
        'admin_role_id',
        '`admin_role_id` VARCHAR(32) NULL AFTER `support_role_id`'
      );
      await ensureColumn(
        'discord_bot_guild_configs',
        'owner_role_id',
        '`owner_role_id` VARCHAR(32) NULL AFTER `admin_role_id`'
      );
      await syncLegacyRoleColumns();
    }
  }
];

async function ensureSchema() {
  await ensureBaseTables();

  for (const migration of migrations) {
    const applied = await migrationAlreadyApplied(migration.key);
    if (applied) {
      continue;
    }

    await migration.up();
    await markMigrationApplied(migration.key);
  }

  await ensureSharedCitySchema();
}

module.exports = {
  ensureSchema,
  ensureSharedCitySchema,
  getSharedCitySchemaHealth
};
