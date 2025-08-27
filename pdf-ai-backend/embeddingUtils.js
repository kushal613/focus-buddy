const OpenAI = require('openai');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Generate embeddings for text chunks
 */
async function generateEmbeddings(textChunks) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textChunks
    });
    
    return response.data.map(item => item.embedding);
  } catch (error) {
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Find most relevant chunks based on query
 */
async function findRelevantChunks(query, pdfChunks, topK = 3) {
  if (!openai) {
    // Fallback: return first few chunks
    return pdfChunks.slice(0, topK).map(chunk => chunk.text);
  }
  
  try {
    // Generate embedding for the query
    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: [query]
    });
    
    const queryEmbedding = queryResponse.data[0].embedding;
    
    // Calculate similarities
    const similarities = pdfChunks.map(chunk => ({
      text: chunk.text,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by similarity and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, topK).map(item => item.text);
  } catch (error) {
    console.error('Error finding relevant chunks:', error);
    // Fallback: return first few chunks
    return pdfChunks.slice(0, topK).map(chunk => chunk.text);
  }
}

module.exports = {
  generateEmbeddings,
  cosineSimilarity,
  findRelevantChunks
};
