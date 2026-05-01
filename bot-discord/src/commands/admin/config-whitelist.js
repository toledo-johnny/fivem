const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const {
  hydrateWhitelistSettings,
  normalizeQuestionsInput,
  publishWhitelistPanel
} = require('../../modules/whitelist/whitelistService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertTextChannelOperational } = require('../../services/discord/preflightService');
const { adminEmbed, successEmbed } = require('../../utils/embeds');
const { buildWhitelistConfigFields } = require('../../utils/configViews');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-whitelist')
    .setDescription('Visualiza ou ajusta a configuracao do modulo de whitelist.')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand.setName('show').setDescription('Exibe a configuracao atual da whitelist.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('limits')
        .setDescription('Atualiza cooldown e limite de tentativas.')
        .addIntegerOption((option) =>
          option
            .setName('attempt_limit')
            .setDescription('Limite total de tentativas por usuario.')
            .setMinValue(1)
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('cooldown_minutes')
            .setDescription('Cooldown em minutos entre tentativas.')
            .setMinValue(0)
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName('allow_retry')
            .setDescription('Permite nova tentativa apos reprovacao?')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('questions')
        .setDescription('Atualiza as perguntas da whitelist a partir de um JSON.')
        .addStringOption((option) =>
          option
            .setName('json')
            .setDescription('Array JSON com perguntas. Precisa incluir server_id e character_name.')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('publish')
        .setDescription('Republica o painel principal da whitelist.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Canal para republicar o painel (opcional).')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'show') {
      await interaction.reply({
        embeds: [
          adminEmbed(
            interaction.guild,
            'Configuracao de whitelist',
            'Resumo do painel, canal de revisao, cargos e regras de tentativa.',
            buildWhitelistConfigFields({
              ...guildConfig,
              whitelistSettings: hydrateWhitelistSettings(guildConfig.whitelistSettings)
            })
          )
        ],
        ephemeral: true
      });

      await logAdministrativeCommand({
        interaction,
        guildConfig,
        commandName: 'config-whitelist',
        details: {
          action: 'show'
        }
      });
      return;
    }

    if (subcommand === 'limits') {
      const updatedConfig = await updateGuildConfig(interaction.guild.id, {
        whitelistSettings: {
          ...guildConfig.whitelistSettings,
          attemptLimit: interaction.options.getInteger('attempt_limit', true),
          cooldownMinutes: interaction.options.getInteger('cooldown_minutes', true),
          allowRetry: interaction.options.getBoolean('allow_retry', true)
        }
      });

      await interaction.reply({
        embeds: [
          successEmbed(
            interaction.guild,
            'Regras da whitelist atualizadas',
            'Cooldown, limite de tentativas e politica de nova tentativa foram atualizados.'
          )
        ],
        ephemeral: true
      });

      await logAdministrativeCommand({
        interaction,
        guildConfig: updatedConfig,
        commandName: 'config-whitelist',
        details: {
          action: 'limits'
        }
      });
      return;
    }

    if (subcommand === 'questions') {
      const jsonInput = interaction.options.getString('json', true);
      let parsed;
      try {
        parsed = JSON.parse(jsonInput);
      } catch (error) {
        throw new Error('O JSON informado e invalido.');
      }

      const normalizedQuestions = normalizeQuestionsInput(parsed);
      const updatedConfig = await updateGuildConfig(interaction.guild.id, {
        whitelistSettings: {
          ...guildConfig.whitelistSettings,
          questions: normalizedQuestions
        }
      });

      await interaction.reply({
        embeds: [
          successEmbed(
            interaction.guild,
            'Perguntas atualizadas',
            `O questionario da whitelist agora possui ${normalizedQuestions.length} pergunta(s).`
          )
        ],
        ephemeral: true
      });

      await logAdministrativeCommand({
        interaction,
        guildConfig: updatedConfig,
        commandName: 'config-whitelist',
        details: {
          action: 'questions',
          questionCount: normalizedQuestions.length
        }
      });
      return;
    }

    const targetChannel =
      interaction.options.getChannel('channel') ||
      (guildConfig.whitelistPanelChannelId
        ? await interaction.guild.channels.fetch(guildConfig.whitelistPanelChannelId).catch(() => null)
        : null);

    if (!targetChannel?.isTextBased()) {
      throw new Error('Defina um canal valido para republicar o painel de whitelist.');
    }
    await assertTextChannelOperational(targetChannel);

    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      whitelistPanelChannelId: targetChannel.id
    });

    const message = await publishWhitelistPanel(targetChannel, updatedConfig);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Painel republicado',
          `O painel de whitelist foi republicado em ${targetChannel}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'config-whitelist',
      details: {
        action: 'publish',
        channelId: targetChannel.id,
        messageId: message.id
      }
    });
  }
};
