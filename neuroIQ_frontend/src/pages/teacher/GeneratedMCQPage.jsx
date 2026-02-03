import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { registerMCQQuestions } from '../../api/question.api';
import { Button, Card, CardTitle, Input } from '../../components/ui';
import { EmptyState } from '../../components/feedback';

/**
 * Helper to check if an option is the correct one
 * Handles both "Option A/B/C/D" format and actual option text
 */
const isCorrectOption = (correctOption, option, optionIndex) => {
  if (!correctOption) return false;
  // Check if correct_option is in "Option A/B/C/D" format
  const optionMatch = correctOption.match(/Option\s*([A-D])/i);
  if (optionMatch) {
    const correctIndex = optionMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
    return optionIndex === correctIndex;
  }
  // Otherwise, compare by text
  return option === correctOption;
};

/**
 * Normalize correct_option from "Option A" format to actual option text
 */
const normalizeCorrectOption = (question) => {
  if (!question.correct_option || !question.options) return question;
  const optionMatch = question.correct_option.match(/Option\s*([A-D])/i);
  if (optionMatch) {
    const correctIndex = optionMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (question.options[correctIndex]) {
      return { ...question, correct_option: question.options[correctIndex] };
    }
  }
  return question;
};

const GeneratedMCQPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (location.state?.questions) {
      // Normalize correct_option to actual option text
      const normalizedQuestions = location.state.questions.map(normalizeCorrectOption);
      setQuestions(normalizedQuestions);
      setSubject(location.state.subject || '');
      setSemester(location.state.semester || '');
    }
  }, [location.state]);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleCorrectOptionChange = (questionIndex, value) => {
    const updated = [...questions];
    updated[questionIndex].correct_option = value;
    setQuestions(updated);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSaveToBank = async () => {
    if (!semester) {
      setError('Please enter semester');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await registerMCQQuestions({
        subject,
        semester,
        mcq_questions: questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct_option: q.correct_option,
        })),
      });

      setSuccess('MCQ questions saved to question bank!');
      setTimeout(() => {
        navigate('/teacher/question-bank');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to save questions');
    } finally {
      setIsSaving(false);
    }
  };

  if (!questions.length) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
          title="No MCQ questions generated"
          description="Generate MCQ questions from syllabus text first"
          action={
            <Button onClick={() => navigate('/teacher/generate-from-text')}>
              Generate Questions
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generated MCQ Questions</h1>
          <p className="text-gray-500 mt-1">
            Review and edit AI-generated MCQs for {subject}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Semester (e.g., 4)"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-32"
          />
          <Button onClick={handleSaveToBank} loading={isSaving}>
            Save to Bank
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, index) => (
          <Card key={index} className="relative">
            <button
              onClick={() => handleRemoveQuestion(index)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="space-y-4">
              {/* Question Number */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-500">MCQ</span>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question
                </label>
                <textarea
                  value={q.question}
                  onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <span
                      className={`
                        flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${
                          q.correct_option === option
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }
                      `}
                    >
                      {String.fromCharCode(65 + optIndex)}
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                      className={`
                        flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500
                        ${q.correct_option === option ? 'border-green-300 bg-green-50' : 'border-gray-300'}
                      `}
                    />
                    <button
                      type="button"
                      onClick={() => handleCorrectOptionChange(index, option)}
                      className={`
                        p-2 rounded-lg transition-colors
                        ${
                          q.correct_option === option
                            ? 'bg-green-100 text-green-600'
                            : 'hover:bg-gray-100 text-gray-400'
                        }
                      `}
                      title={q.correct_option === option ? 'Correct answer' : 'Mark as correct'}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Correct Answer Display */}
              <div className="pt-2 border-t">
                <span className="text-sm text-gray-500">Correct Answer: </span>
                <span className="text-sm font-medium text-green-600">{q.correct_option}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Total Questions: <span className="font-semibold">{questions.length}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/teacher/generate-from-text')}>
              Generate More
            </Button>
            <Button onClick={handleSaveToBank} loading={isSaving}>
              Save to Question Bank
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GeneratedMCQPage;
