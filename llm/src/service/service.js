

const OLLAMA_URL = process.env.OLLAMA_URL;
const MODEL = "llama3";

async function generateLLMResponse(prompt) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500, // equivalent to maxOutputTokens
        },
      }),
    }); 

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;

  } catch (err) {
    console.error("LLM Error:", err);
    throw new Error("Failed to generate response");
  }
}
 
module.exports = { generateLLMResponse };
 