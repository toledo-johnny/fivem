const { AttachmentBuilder } = require('discord.js');

async function fetchAllMessages(channel) {
  const results = [];
  let before;

  while (true) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {})
    });

    if (batch.size === 0) {
      break;
    }

    results.push(...batch.values());
    before = batch.last().id;

    if (batch.size < 100) {
      break;
    }
  }

  return results.sort((left, right) => left.createdTimestamp - right.createdTimestamp);
}

function renderMessage(message) {
  const timestamp = new Date(message.createdTimestamp).toISOString();
  const authorTag = message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown author';
  const content = message.content?.trim() || '[sem texto]';
  const attachments =
    message.attachments.size > 0
      ? ` | anexos: ${message.attachments.map((attachment) => attachment.url).join(', ')}`
      : '';

  return `[${timestamp}] ${authorTag}: ${content}${attachments}`;
}

function chunkString(input, maxLength) {
  const output = [];
  let cursor = 0;

  while (cursor < input.length) {
    output.push(input.slice(cursor, cursor + maxLength));
    cursor += maxLength;
  }

  return output.length > 0 ? output : ['Nenhuma mensagem registrada.'];
}

function buildTranscriptAttachments(ticketId, transcriptText) {
  const chunks = chunkString(transcriptText, 1_500_000);
  return chunks.map(
    (chunk, index) =>
      new AttachmentBuilder(Buffer.from(chunk, 'utf8'), {
        name: `ticket-${ticketId}-transcript-parte-${index + 1}.txt`
      })
  );
}

async function createTranscriptAttachments(channel, ticketId) {
  const messages = await fetchAllMessages(channel);
  const transcriptText = messages.map(renderMessage).join('\n') || 'Nenhuma mensagem registrada.';

  return {
    messages,
    transcriptText,
    attachments: buildTranscriptAttachments(ticketId, transcriptText)
  };
}

module.exports = {
  createTranscriptAttachments
};
