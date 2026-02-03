import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { registerTheoryQuestions } from '../../api/question.api';
import { Button, Card, CardTitle, Input } from '../../components/ui';
import { EmptyState } from '../../components/feedback';

const GeneratedQuestionsPage = () => {
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
      setQuestions(location.state.questions);
      setSubject(location.state.subject || '');
    }
  }, [location.state]);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
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
      await registerTheoryQuestions({
        subject,
        semester,
        theory_questions: questions.map((q) => ({
          marks: q.marks,
          question: q.question,
        })),
      });

      setSuccess('Questions saved to question bank!');
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          }
          title="No questions generated"
          description="Upload a syllabus first to generate questions"
          action={
            <Button onClick={() => navigate('/teacher/upload')}>Upload Syllabus</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generated Questions</h1>
          <p className="text-gray-500 mt-1">
            Review and edit AI-generated questions for {subject}
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
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Marks:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={q.marks}
                    onChange={(e) =>
                      handleQuestionChange(index, 'marks', parseInt(e.target.value))
                    }
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                  />
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    q.marks <= 3
                      ? 'bg-green-100 text-green-800'
                      : q.marks <= 5
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {q.marks <= 3 ? 'Short' : q.marks <= 5 ? 'Medium' : 'Long'}
                </span>
              </div>

              <textarea
                value={q.question}
                onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/teacher/upload')}>
          Generate More
        </Button>
        <Button onClick={handleSaveToBank} loading={isSaving}>
          Save {questions.length} Questions
        </Button>
      </div>
    </div>
  );
};

export default GeneratedQuestionsPage;
