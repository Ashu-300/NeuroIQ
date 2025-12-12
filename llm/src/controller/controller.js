const {generateLLMResponse} = require('../service/service')

const generateQuestions = async (req, res) => {
  try {
    const {
      subject,
      unitSyllabus,    // full syllabus text for that unit
      num3Marks,       // number of 3-mark questions to generate
      num4Marks,       // number of 4-mark questions to generate
      num10Marks       // number of 10-mark questions to generate
    } = req.body;

    // Basic validation (optional, but helpful)
    if (!subject || !unitSyllabus) {
      return res.status(400).json({
        success: false,
        message: "subject and unitSyllabus are required",
      });
    }

    // Build dynamic “Generate:” part
    const generateLines = [];
    if (num3Marks && num3Marks > 0) {
      generateLines.push(`- ${num3Marks} questions of 3 marks`);
    }
    if (num4Marks && num4Marks > 0) {
      generateLines.push(`- ${num4Marks} questions of 4 marks`);
    }
    if (num10Marks && num10Marks > 0) {
      generateLines.push(`- ${num10Marks} questions of 10 marks`);
    }

    // If nothing provided, default to something (optional)
    if (generateLines.length === 0) {
      generateLines.push(`- 3 questions of 3 marks`);
      generateLines.push(`- 3 questions of 4 marks`);
      generateLines.push(`- 3 questions of 10 marks`);
    }

    // Build dynamic “Format” part
    let formatSection = "";

    if (num3Marks && num3Marks > 0) {
      formatSection += `\n3 Marks Questions:\n`;
      for (let i = 1; i <= num3Marks; i++) {
        formatSection += `${i}. ...\n`;
      }
    }

    if (num4Marks && num4Marks > 0) {
      formatSection += `\n4 Marks Questions:\n`;
      for (let i = 1; i <= num4Marks; i++) {
        formatSection += `${i}. ...\n`;
      }
    }

    if (num10Marks && num10Marks > 0) {
      formatSection += `\n10 Marks Questions:\n`;
      for (let i = 1; i <= num10Marks; i++) {
        formatSection += `${i}. ...\n`;
      }
    }

    const prompt = `
You are an expert exam question paper setter.

Generate exam questions strictly based on the following information.

Subject: ${subject}
Unit: ${unitName || "Single Unit"}
Complete Unit Syllabus:
${unitSyllabus}

Generate:
${generateLines.join("\n")}

Rules:
- Cover the full unit syllabus across the questions.
- Use clear, exam-style language.
- Avoid repeating the same concept in many questions unless it is core to the unit.
- Mix definitions, explanations, comparisons, and scenario-based questions where suitable.

Format your answer exactly like this:
${formatSection}
    `;

    const result = await generateLLMResponse(prompt);

    res.status(200).json({
      success: true,
      questions: result,
    });

  } catch (error) {
    console.error(error);
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

module.exports = {generateQuestions , generateSeatingArrangement}