const pdfParse = require('pdf-parse');

/**
 * Extract and clean text from PDF buffer
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    let text = data.text;
    
    // Clean the text
    text = text
      .replace(/\r\n/g, '\n')           // Normalize line breaks
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive line breaks
      .replace(/[ \t]{2,}/g, ' ')       // Normalize spaces
      .replace(/^\s*\d+\s*$/gm, '')     // Remove page numbers on their own lines
      .trim();
    
    return text;
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

/**
 * Split text into overlapping chunks for better context
 */
function chunkText(text, maxTokens = 500) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const chunks = [];
  
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4); // Rough token estimate
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with some overlap (last sentence)
      const lastSentence = currentChunk.split(/[.!?]+/).slice(-1)[0];
      currentChunk = lastSentence + sentence;
      currentTokens = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += sentence + '. ';
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

module.exports = {
  extractTextFromPDF,
  chunkText
};
