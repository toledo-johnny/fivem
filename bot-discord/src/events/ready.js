const { ActivityType, Events } = require('discord.js');
const { brand } = require('../config/brand');
const { startFiveMStatusScheduler } = require('../modules/fivem/statusPanelService');
const { startStateReconciliationScheduler } = require('../modules/system/reconciliationService');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot online como ${client.user.tag}`);

    client.user.setPresence({
      status: 'online',
      activities: [
        {
          name: brand.presenceText,
          type: ActivityType.Watching
        }
      ]
    });

    startFiveMStatusScheduler(client);
    startStateReconciliationScheduler(client);
  }
};
