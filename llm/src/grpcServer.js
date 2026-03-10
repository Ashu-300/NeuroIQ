const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const { generateLLMResponse } = require('./service/service');

// Load proto file
const PROTO_CANDIDATES = [
  path.join(__dirname, '../../proto/evaluation.proto'),
  path.join(__dirname, '../proto/evaluation.proto'),
];

const PROTO_PATH = PROTO_CANDIDATES.find((candidate) => fs.existsSync(candidate));
if (!PROTO_PATH) {
  throw new Error(`evaluation.proto not found. Checked: ${PROTO_CANDIDATES.join(', ')}`);
}

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const evaluationProto = grpc.loadPackageDefinition(packageDefinition).evaluation;

/**
 * Extract JSON object from LLM response text
 */
function extractJSONObject(text) {
  try {
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
 * Build evaluation prompt for a theory answer
 */
function buildEvaluationPrompt(questionText, answerText, maxMarks, subject) {
  return `You are an expert examiner for ${subject || 'general subjects'}. Evaluate the following student answer.

Question: ${questionText}

Student's Answer: ${answerText || '(No answer provided)'}

Maximum Marks: ${maxMarks}

Instructions:
1. Evaluate the answer based on correctness, completeness, and clarity
2. Award marks out of ${maxMarks} based on the quality of the answer
3. If no answer is provided or answer is blank, give 0 marks
4. Provide brief, constructive feedback (1-2 sentences)

Respond in this exact JSON format only, no other text:
{
  "obtained_marks": <number between 0 and ${maxMarks}>,
  "feedback": "<brief feedback explaining the score>"
}`;
}

/**
 * Evaluate a single theory answer
 */
async function evaluateTheoryAnswer(call, callback) {
  const { question_id, question_text, answer_text, max_marks, subject } = call.request;

  console.log(`[gRPC] Evaluating theory answer: ${question_id}`);

  try {
    // If no answer provided, return 0 marks
    if (!answer_text || answer_text.trim() === '') {
      callback(null, {
        question_id,
        obtained_marks: 0,
        feedback: "No answer provided.",
        success: true,
        error_message: "",
      });
      return;
    }

    const prompt = buildEvaluationPrompt(question_text, answer_text, max_marks, subject);
    const llmResponse = await generateLLMResponse(prompt);
    const rawText = typeof llmResponse === "string" ? llmResponse : llmResponse?.content ?? "";

    const result = extractJSONObject(rawText);

    // Validate and cap marks
    let obtainedMarks = parseInt(result.obtained_marks) || 0;
    obtainedMarks = Math.max(0, Math.min(obtainedMarks, max_marks));

    callback(null, {
      question_id,
      obtained_marks: obtainedMarks,
      feedback: result.feedback || "Evaluated successfully.",
      success: true,
      error_message: "",
    });

  } catch (error) {
    console.error(`[gRPC] Evaluation Error for ${question_id}:`, error);
    callback(null, {
      question_id,
      obtained_marks: 0,
      feedback: "Evaluation failed. Please review manually.",
      success: false,
      error_message: error.message,
    });
  }
}

/**
 * Evaluate a single MCQ answer
 */
async function evaluateMCQAnswer(call, callback) {
  const {
    question_id,
    selected_option,
    correct_option,
    marks,
  } = call.request;

  console.log(`[gRPC] Evaluating MCQ answer: ${question_id}`);

  try {
    const isCorrect =
      String(selected_option ?? '').trim() !== '' &&
      String(selected_option) === String(correct_option);

    callback(null, {
      question_id,
      is_correct: isCorrect,
      obtained_marks: isCorrect ? Number(marks || 0) : 0,
      success: true,
      error_message: '',
    });
  } catch (error) {
    console.error(`[gRPC] MCQ Evaluation Error for ${question_id}:`, error);
    callback(null, {
      question_id,
      is_correct: false,
      obtained_marks: 0,
      success: false,
      error_message: error.message,
    });
  }
}

/**
 * Start the gRPC server
 */
function startGrpcServer(port = 50051) {
  const server = new grpc.Server();

  server.addService(evaluationProto.EvaluationService.service, {
    EvaluateTheoryAnswer: evaluateTheoryAnswer,
    EvaluateMCQAnswer: evaluateMCQAnswer,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('❌ Failed to start gRPC server:', err);
        return;
      }
      console.log(`✅ gRPC Evaluation Server running on port ${boundPort}`);
    }
  );

  return server;
}

module.exports = { startGrpcServer };
