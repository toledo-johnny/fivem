function safeParseJson(input, fallback) {
  if (!input || typeof input !== 'string') {
    return structuredClone(fallback);
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    return structuredClone(fallback);
  }
}

function safeStringifyJson(input, fallback = {}) {
  try {
    return JSON.stringify(input ?? fallback);
  } catch (error) {
    return JSON.stringify(fallback);
  }
}

module.exports = {
  safeParseJson,
  safeStringifyJson
};
