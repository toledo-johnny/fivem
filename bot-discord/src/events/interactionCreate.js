const { Events, InteractionType } = require('discord.js');
const { handleInteractionError } = require('../utils/interactions');

function resolveHandlerCollection(interaction, client) {
  if (interaction.isButton()) {
    return client.buttons;
  }

  if (interaction.isStringSelectMenu()) {
    return client.selects;
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    return client.modals;
  }

  return null;
}

function resolveMatchingHandler(interaction, handlers) {
  if (!Array.isArray(handlers) || handlers.length === 0) {
    return null;
  }

  return handlers.find((candidate) => candidate.canHandle(interaction)) || null;
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return;
        }

        await command.execute(interaction, client);
        return;
      }

      const handlers = resolveHandlerCollection(interaction, client);
      if (!handlers) {
        return;
      }

      const handler = resolveMatchingHandler(interaction, handlers);
      if (!handler) {
        return;
      }

      await handler.execute(interaction, client);
    } catch (error) {
      await handleInteractionError(interaction, error, 'interactionCreate');
    }
  }
};
