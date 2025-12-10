const {ChatOpenAI } = require('@langchain/openai')


const llm = new ChatOpenAI({
  model: "gpt-4o-mini",   // or gpt-4o etc
  temperature: 0.3,
});

async function generateLLMResponse(prompt) {
  try {
    const response = await llm.invoke(prompt);
    return response.content;
  } catch (err) {
    console.error("LLM Error:", err);
    throw new Error("Failed to generate response");
  }
}

module.exports = {generateLLMResponse}
