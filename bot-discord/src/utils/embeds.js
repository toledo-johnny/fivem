const { EmbedBuilder } = require('discord.js');
const { getBrandContext } = require('../config/brand');
const { COPY } = require('../config/copy');

function buildEmbed(guild, options = {}) {
  const brand = getBrandContext(guild);
  const embed = new EmbedBuilder().setColor(options.color || brand.palette.primary).setTimestamp();

  const footerText = options.footerText || brand.footerName;
  const footerIcon =
    options.footerIcon === false
      ? null
      : options.footerIcon || brand.logoUrl || guild?.iconURL?.() || null;

  embed.setFooter({
    text: footerText,
    ...(footerIcon ? { iconURL: footerIcon } : {})
  });

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (Array.isArray(options.fields) && options.fields.length > 0) {
    embed.addFields(options.fields);
  }

  const thumbnail =
    options.thumbnail === false ? null : options.thumbnail || brand.logoUrl || null;
  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  if (options.image) embed.setImage(options.image);
  if (options.author?.name) {
    embed.setAuthor(options.author);
  }

  return embed;
}

function successEmbed(guild, title, description, fields = []) {
  const brand = getBrandContext(guild);
  return buildEmbed(guild, {
    color: brand.palette.success,
    title,
    description,
    fields
  });
}

function errorEmbed(guild, title, description, fields = []) {
  const brand = getBrandContext(guild);
  return buildEmbed(guild, {
    color: brand.palette.error,
    title,
    description,
    fields
  });
}

function warningEmbed(guild, title, description, fields = []) {
  const brand = getBrandContext(guild);
  return buildEmbed(guild, {
    color: brand.palette.warning,
    title,
    description,
    fields
  });
}

function adminEmbed(guild, title, description, fields = []) {
  return buildEmbed(guild, {
    title,
    description,
    fields
  });
}

function inlineField(name, value) {
  return {
    name,
    value: String(value ?? COPY.common.notInformed).slice(0, 1024) || COPY.common.notInformed,
    inline: true
  };
}

function blockField(name, value) {
  return {
    name,
    value: String(value ?? COPY.common.notInformed).slice(0, 1024) || COPY.common.notInformed,
    inline: false
  };
}

module.exports = {
  adminEmbed,
  blockField,
  buildEmbed,
  errorEmbed,
  inlineField,
  successEmbed,
  warningEmbed
};
