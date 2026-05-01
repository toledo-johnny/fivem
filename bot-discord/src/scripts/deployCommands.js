const { REST, Routes } = require('discord.js');
const env = require('../config/env');
const { loadCommands } = require('../bot/loaders');

async function deployCommands() {
  const mockClient = {};
  const commands = await loadCommands(mockClient);
  const payload = [...commands.values()].map((command) => command.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(env.botToken);
  const route = env.discordTestGuildId
    ? Routes.applicationGuildCommands(env.discordClientId, env.discordTestGuildId)
    : Routes.applicationCommands(env.discordClientId);

  await rest.put(route, { body: payload });
  console.log(
    `Comandos registrados com sucesso (${payload.length}) em ${
      env.discordTestGuildId ? `guild ${env.discordTestGuildId}` : 'escopo global'
    }.`
  );
}

deployCommands().catch((error) => {
  console.error('[deployCommands]', error);
  process.exitCode = 1;
});
