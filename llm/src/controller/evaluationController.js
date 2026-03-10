const { generateLLMResponse } = require('../service/service');

/**
 * Extract JSON object from LLM response text
 * @param {string} text - Raw LLM response
 * @returns {object} Parsed JSON object
 */
function extractJSONObject(text) {
  try {
    // Try to find JSON object
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      console.error("Raw LLM output:", text);
      throw new Error("No JSON object found");
    }

    const jsonText = text.slice(start, end + 1);
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("JSON parse failed. Raw output:", text);
    throw new Error("Failed to parse JSON from LLM response");
  }
}

/**
 * Build evaluation prompt for a single theory answer
 * @param {object} answer - Answer to evaluate
 * @returns {string} Prompt for LLM
 */
function buildEvaluationPrompt(answer) {
  const { question_text, answer_text, max_marks, subject } = answer;
  
  return `You are an expert examiner for ${subject || 'general subjects'}. Evaluate the following student answer.

Question: ${question_text}

Student's Answer: ${answer_text || '(No answer provided)'}

Maximum Marks: ${max_marks}

Instructions:
1. Evaluate the answer based on correctness, completeness, and clarity
2. Award marks out of ${max_marks} based on the quality of the answer
3. If no answer is provided or answer is blank, give 0 marks
4. Provide brief, constructive feedback (1-2 sentences)

Respond in this exact JSON format only, no other text:
{
  "obtained_marks": <number between 0 and ${max_marks}>,
  "feedback": "<brief feedback explaining the score>"
}`;
}

/**
 * Evaluate a single theory answer
 * POST /api/llm/evaluate
 */
const evaluateTheoryAnswer = async (req, res) => {
  try {
    const { question_id, question_text, answer_text, max_marks, subject } = req.body;

    if (!question_text || max_marks === undefined) {
      return res.status(400).json({
        success: false,
        error: "question_text and max_marks are required"
      });
    }

    // If no answer provided, return 0 marks
    if (!answer_text || answer_text.trim() === '') {
      return res.json({
        question_id,
        obtained_marks: 0,
        feedback: "No answer provided.",
        success: true
      });
    }

    const prompt = buildEvaluationPrompt({
      question_text,
      answer_text,
      max_marks,
      subject
    });

    const llmResponse = await generateLLMResponse(prompt);
    const rawText = typeof llmResponse === "string" ? llmResponse : llmResponse?.content ?? "";
    
    const result = extractJSONObject(rawText);

    // Validate and cap marks
    let obtainedMarks = parseInt(result.obtained_marks) || 0;
    obtainedMarks = Math.max(0, Math.min(obtainedMarks, max_marks));

    res.json({
      question_id,
      obtained_marks: obtainedMarks,
      feedback: result.feedback || "Evaluated successfully.",
      success: true
    });

  } catch (error) {
    console.error("Evaluation Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to evaluate answer"
    });
  }
};

/**
 * Evaluate a batch of theory answers
 * POST /api/llm/evaluate/batch
 */
const evaluateTheoryBatch = async (req, res) => {
  try {
    const { answers, subject, exam_type } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: "answers array is required and must not be empty"
      });
    }

    const results = [];

    // Process each answer sequentially to avoid overwhelming the LLM
    for (const answer of answers) {
      try {
        // If no answer provided, return 0 marks
        if (!answer.answer_text || answer.answer_text.trim() === '') {
          results.push({
            question_id: answer.question_id,
            obtained_marks: 0,
            feedback: "No answer provided.",
            success: true
          });
          continue;
        }

        const prompt = buildEvaluationPrompt({
          question_text: answer.question_text,
          answer_text: answer.answer_text,
          max_marks: answer.max_marks,
          subject: subject || answer.subject
        });

        const llmResponse = await generateLLMResponse(prompt);
        const rawText = typeof llmResponse === "string" ? llmResponse : llmResponse?.content ?? "";
        
        const result = extractJSONObject(rawText);

        // Validate and cap marks
        let obtainedMarks = parseInt(result.obtained_marks) || 0;
        obtainedMarks = Math.max(0, Math.min(obtainedMarks, answer.max_marks));

        results.push({
          question_id: answer.question_id,
          obtained_marks: obtainedMarks,
          feedback: result.feedback || "Evaluated successfully.",
          success: true
        });

      } catch (answerError) {
        console.error(`Error evaluating answer ${answer.question_id}:`, answerError);
        results.push({
          question_id: answer.question_id,
          obtained_marks: 0,
          feedback: "Evaluation failed. Please review manually.",
          success: false
        });
      }
    }

    res.json({
      results,
      success: true
    });

  } catch (error) {
    console.error("Batch Evaluation Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to evaluate batch"
    });
  }
};

module.exports = {
  evaluateTheoryAnswer,
  evaluateTheoryBatch
};
