const {generateLLMResponse} = require('../service/service')

function extractJSON(text) {
  try {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");

    if (start === -1 || end === -1 || end <= start) {
      console.error("Raw LLM output:", text);
      throw new Error("No JSON array found");
    }

    const jsonText = text.slice(start, end + 1);
    return JSON.parse(jsonText);

  } catch (err) {
    console.error("JSON parse failed. Raw output:", text);
    throw new Error("Failed to parse JSON from LLM response");
  }
}

function validateTheoryQuestions(arr) {
  if (!Array.isArray(arr)) return false;

  return arr.every(q =>
    typeof q === "object" &&
    typeof q.question === "string" &&
    typeof q.marks === "number"
  );
}



const generateTheoryQuestions = async (req, res) => {
  try {
    const {
      subject,
      unit_syllabus,
      num_3marks,
      num_4marks,
      num_10marks
    } = req.body;

    if (!subject || !unit_syllabus) {
      return res.status(400).json({
        success: false,
        message: "subject and unit_syllabus are required",
      });
    }

    const threeMarks = num_3marks ?? 2;
    const fourMarks = num_4marks ?? 2;
    const tenMarks = num_10marks ?? 1;

    const prompt = `
You are an exam question generator.

Generate questions strictly based on the syllabus below.
DO NOT include answers, explanations, headings, or extra text.

Subject: ${subject}

Unit Syllabus:
${unit_syllabus}

Generate exactly ${threeMarks + fourMarks + tenMarks} questions.

Rules for marks:
- First ${threeMarks} questions must have marks = 3
- Next ${fourMarks} questions must have marks = 4
- Last ${tenMarks} questions must have marks = 10

Return ONLY valid JSON in the following format:
[
  { "marks": 3, "question": "question text" }
]

Rules:
- Output MUST be valid JSON
- No markdown
- No explanations
- No text outside JSON
`;

    const llmResponse = await generateLLMResponse(prompt);

    const rawText =
      typeof llmResponse === "string"
        ? llmResponse
        : llmResponse?.content ?? "";

    // ✅ 1. Extract JSON FIRST
    const questionsArray = extractJSON(rawText);

    // ✅ 2. Validate AFTER extraction
    if (!validateTheoryQuestions(questionsArray)) {
      throw new Error("Invalid theory question structure from LLM");
    }

    // ✅ 3. Respond
    res.status(200).json({
      success: true,
      questions: questionsArray,
    });

  } catch (error) {
    console.error("Theory Generation Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};



const generateSeatingArrangement = async (req, res) => {
  try {
    const { students, rooms } = req.body;

    if (!Array.isArray(students) || !Array.isArray(rooms)) {
      return res.status(400).json({
        message: "students and rooms must be arrays",
      });
    }

    if (students.length === 0 || rooms.length === 0) {
      return res.status(400).json({
        message: "students and rooms cannot be empty",
      });
    }

    const studentsJson = JSON.stringify(students, null, 2);
    const roomsJson = JSON.stringify(rooms, null, 2);

    const prompt = `
You are an expert exam seating planner.

You will be given:
1. A list of students as JSON.
2. A list of rooms as JSON.

Use this Go-like struct as the target shape of your answer:

type SeatingArragement struct {
  RoomID            string      \`bson:"room_id" json:"room_id"\`
  Rows              int         \`bson:"rows" json:"rows"\`
  Columns           int         \`bson:"columns" json:"columns"\`
  StudentArragement [][]string  \`bson:"student_arragement" json:"student_arragement"\`
}

Important identifier rule:
- Each student has a field "roll_number" like "0101CS221038".
- In StudentArragement, each non-empty seat must contain the student's roll_number string (not id, not name).

Rules and constraints:

1. No branch in its own department room:
   - Each room has a "branch" field (e.g., "CSE", "IT", "ECE").
   - Do NOT seat students whose branch == room.branch in that room.
   - Example: In room with branch "CSE", do not place students where student.branch == "CSE".
   - Such students should be assigned to rooms whose branch != student's branch.

2. Max two branches per room:
   - In any single room, you may use **at most two different student branches**.
   - Never assign 3 or more different branches in the same room.
   - Example: A room can have only {CSE, ECE} or {IT, MECH}, but not {CSE, ECE, IT} together.

3. Seating grid logic:
   - Each room has: room_id, capacity, rows, columns, branch.
   - StudentArragement must be a 2D array with size [rows][columns].
   - Each cell is either:
       - the student's roll_number (string) like "0101CS221038", or
       - an empty string "" if the seat is unused.

4. Branch alternation rule (zig-zag between benches):
   - Try to avoid seating same-branch students next to each other horizontally when possible.
   - For rooms with 2+ columns and exactly two branches assigned to that room, follow a pattern like:
       Row 1: [BranchA, BranchB, BranchA, BranchB, ...]
       Row 2: [BranchB, BranchA, BranchB, BranchA, ...]
     i.e., if in one row a CSE student is on the left and an ECE student is on the right,
     on the next row swap sides as much as possible.
   - If the student counts of the two branches are not equal, still try to mix and alternate as far as it is practical.

5. Capacity & distribution:
   - Each room has capacity = rows * columns.
   - Do not place more students than capacity in a room.
   - Distribute students across rooms, using available space as evenly as practical.
   - If total students < total capacity, leave extra seats as "".

6. General guidelines:
   - Use each student at most once across all rooms.
   - Prefer assigning a student to any room where:
       - room.branch != student.branch
       - the room currently has 0 or 1 other student-branches (to respect "max two branches per room")
       - there is capacity left.
   - Keep seating fair: mix branches and avoid large clusters of the same branch.

7. Output format:
   - You must output ONLY a valid JSON array of SeatingArragement objects.
   - Do NOT wrap it in any other object.
   - Do NOT include any text, explanation, comments, HTTP style fields, or extra keys like "status" or "success".
   - Just return the raw JSON array.

Example shape (dummy roll numbers, just to show structure):

[
  {
    "room_id": "R101",
    "rows": 2,
    "columns": 3,
    "student_arragement": [
      ["0101CS221038", "0101EC221045", "0101CS221040"],
      ["0101EC221050", "0101CS221041", ""]
    ]
  },
  {
    "room_id": "R102",
    "rows": 2,
    "columns": 2,
    "student_arragement": [
      ["0101ME221001", "0101CV221010"],
      ["0101ME221005", ""]
    ]
  }
]

Here is the input data:

STUDENTS JSON:
${studentsJson}

ROOMS JSON:
${roomsJson}

Now compute the seating plan and output ONLY the final JSON array of SeatingArragement.
`;

    const rawResult = await generateLLMResponse(prompt);

    let seatingArrangements;
    try {
      seatingArrangements = JSON.parse(rawResult);
    } catch (err) {
      console.error("Failed to parse LLM JSON:", err);
      console.error("LLM raw output:", rawResult);
      return res.status(500).json({
        message: "LLM did not return valid JSON seating arrangement",
        raw: rawResult,
      });
    }

    // Return JUST the seating plan JSON (Go can unmarshal directly)
    return res.status(200).json(seatingArrangements);
  } catch (error) {
    console.error("Error in generateSeatingArrangement:", error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  }
};

const generateMCQQuestions = async (req, res) => {
  try {
    const {
      subject,
      semester,
      unit_syllabus,
      num_mcqs
    } = req.body;

    if (!subject || !unit_syllabus) {
      return res.status(400).json({
        success: false,
        message: "subject and unit_syllabus are required",
      });
    }

    const totalMCQs = num_mcqs ?? 5;

    const prompt = `
You are an exam question generator.

Generate Multiple Choice Questions (MCQs) strictly based on the syllabus below.
DO NOT include explanations, headings, or extra text.

Subject: ${subject}
${semester ? `Semester: ${semester}` : ""}

Unit Syllabus:
${unit_syllabus}

Generate exactly ${totalMCQs} MCQ questions.

Return ONLY valid JSON in the following format:
[
  {
    "question": "question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option": "Option A"
  }
]

Rules:
- Output MUST be valid JSON
- Each question must have exactly 4 options
- correct_option MUST exactly match one option
- No markdown
- No explanations
- No text outside JSON
`;

    const llmResponse = await generateLLMResponse(prompt);

    const rawText =
      typeof llmResponse === "string"
        ? llmResponse
        : llmResponse?.content ?? "";

    const questionsArray = extractJSON(rawText);

    res.status(200).json({
      success: true,
      questions: questionsArray,
    });

  } catch (error) {
    console.error("MCQ Generation Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};


module.exports = {generateTheoryQuestions , generateMCQQuestions , generateSeatingArrangement}