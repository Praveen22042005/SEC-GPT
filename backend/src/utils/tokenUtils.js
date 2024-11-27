// utils/tokenUtils.js
const { encoding_for_model } = require('tiktoken');

const MAX_TOKENS = 400;

const splitResponseIntoChunks = (text, maxTokens = MAX_TOKENS) => {
  const enc = encoding_for_model('gpt-3.5-turbo'); // Use the appropriate model
  const tokens = enc.encode(text);
  let chunks = [];
  let currentChunk = '';
  let currentTokens = 0;

  text.split('\n').forEach(line => {
    const lineTokens = enc.encode(line + '\n').length;
    
    if (currentTokens + lineTokens > maxTokens) {
      chunks.push(currentChunk);
      currentChunk = line + '\n';
      currentTokens = lineTokens;
    } else {
      currentChunk += line + '\n';
      currentTokens += lineTokens;
    }
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.map((chunk, index) => 
    index < chunks.length - 1 ? `${chunk}\n\nTo be continued...` : chunk
  );
};

module.exports = { splitResponseIntoChunks };