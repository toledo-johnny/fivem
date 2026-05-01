const fs = require('node:fs/promises');
const path = require('node:path');
const { Collection } = require('discord.js');

async function getJavaScriptFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJavaScriptFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function loadCommands(client) {
  const commandsDirectory = path.join(__dirname, '..', 'commands');
  const files = await getJavaScriptFiles(commandsDirectory);
  const commands = new Collection();

  for (const file of files) {
    delete require.cache[file];
    const command = require(file);

    if (!command?.data?.name || typeof command.execute !== 'function') {
      continue;
    }

    commands.set(command.data.name, command);
  }

  client.commands = commands;
  return commands;
}

async function loadInteractionHandlers(client) {
  const baseDirectory = path.join(__dirname, '..', 'interactions');
  const handlerMap = {
    buttons: [],
    modals: [],
    selects: []
  };

  for (const group of Object.keys(handlerMap)) {
    const files = await getJavaScriptFiles(path.join(baseDirectory, group));

    for (const file of files) {
      delete require.cache[file];
      const handler = require(file);

      if (!handler?.type || typeof handler.canHandle !== 'function' || typeof handler.execute !== 'function') {
        continue;
      }

      handlerMap[group].push(handler);
    }
  }

  client.buttons = handlerMap.buttons;
  client.modals = handlerMap.modals;
  client.selects = handlerMap.selects;

  return handlerMap;
}

async function loadEvents(client) {
  const eventsDirectory = path.join(__dirname, '..', 'events');
  const files = await getJavaScriptFiles(eventsDirectory);

  for (const file of files) {
    delete require.cache[file];
    const event = require(file);

    if (!event?.name || typeof event.execute !== 'function') {
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
      continue;
    }

    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

module.exports = {
  loadCommands,
  loadEvents,
  loadInteractionHandlers
};
