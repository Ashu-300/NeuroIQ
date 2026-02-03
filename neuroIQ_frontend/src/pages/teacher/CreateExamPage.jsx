import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateTheoryExam, generateMCQExam, generateBothExam } from '../../api/question.api';
import { Button, Card, CardTitle, Input, Select } from '../../components/ui';

const CreateExamPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [examType, setExamType] = useState(location.state?.category || 'BOTH');
  const [examDetails, setExamDetails] = useState({
    subject: location.state?.subject || '',
    semester: location.state?.semester || '',
  });
  // All available questions from question bank
  const [allQuestions, setAllQuestions] = useState(location.state?.questions || []);
  // Track which questions are selected (by index)
  const [selectedIndices, setSelectedIndices] = useState(
    new Set(location.state?.questions?.map((_, i) => i) || [])
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get selected questions based on indices
  const selectedQuestions = allQuestions.filter((_, i) => selectedIndices.has(i));

  const totalMarks = selectedQuestions.reduce(
    (sum, q) => sum + (q.marks || 1),
    0
  );

  const theoryQuestions = selectedQuestions.filter(q => q.type === 'THEORY');
  const mcqQuestions = selectedQuestions.filter(q => q.type === 'MCQ');

  const handleToggleQuestion = (index) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(allQuestions.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleCreateExam = async () => {
    if (!examDetails.subject || !examDetails.semester) {
      setError('Please fill in all exam details');
      return;
    }

    if (selectedQuestions.length === 0) {
      setError('Please select at least one question');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Handle BOTH - use the dedicated endpoint for mixed exams
      if (examType === 'BOTH') {
        await generateBothExam({
          subject: examDetails.subject,
          semester: examDetails.semester,
          theory_questions: theoryQuestions.map(q => ({
            marks: q.marks || 1,
            question: q.question,
          })),
          mcq_questions: mcqQuestions.map(q => ({
            question: q.question,
            options: q.options,
            correct_option: q.correct_option,
          })),
        });
      } else if (examType === 'THEORY') {
        await generateTheoryExam({
          subject: examDetails.subject,
          semester: examDetails.semester,
          category: 'THEORY',
          mcq_questions: selectedQuestions,
        });
      } else {
        await generateMCQExam({
          subject: examDetails.subject,
          semester: examDetails.semester,
          category: 'MCQ',
          mcq_questions: selectedQuestions,
        });
      }

      setSuccess('Exam created successfully!');
      setTimeout(() => {
        navigate('/teacher/exams');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create exam');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Exam</h1>
        <p className="text-gray-500 mt-1">
          Build an exam from your question bank
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 ${
                  step > s ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
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

      {/* Step 1: Exam Details */}
      {step === 1 && (
        <Card>
          <CardTitle>Exam Details</CardTitle>
          <div className="mt-4 space-y-4">
            <Input
              label="Subject"
              value={examDetails.subject}
              onChange={(e) =>
                setExamDetails({ ...examDetails, subject: e.target.value })
              }
              placeholder="e.g., Data Structures"
            />
            <Input
              label="Semester"
              value={examDetails.semester}
              onChange={(e) =>
                setExamDetails({ ...examDetails, semester: e.target.value })
              }
              placeholder="e.g., 4"
            />
            <Select
              label="Exam Type"
              options={[
                { value: 'BOTH', label: 'Mixed (Theory + MCQ)' },
                { value: 'THEORY', label: 'Theory Only' },
                { value: 'MCQ', label: 'MCQ Only' },
              ]}
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            />
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!examDetails.subject || !examDetails.semester}
            >
              Next: Select Questions
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Select Questions */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Questions</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {selectedQuestions.length} / {allQuestions.length} | Total Marks: {totalMarks}
                  {examType === 'BOTH' && theoryQuestions.length > 0 && mcqQuestions.length > 0 && (
                    <span className="ml-2">(Theory: {theoryQuestions.length}, MCQ: {mcqQuestions.length})</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
          </Card>

          {allQuestions.length === 0 ? (
            <Card>
              <p className="text-center text-gray-500 py-8">
                No questions loaded. Go to{' '}
                <button
                  onClick={() => navigate('/teacher/question-bank')}
                  className="text-indigo-600 hover:underline"
                >
                  Question Bank
                </button>{' '}
                to search and select questions first.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {allQuestions.map((q, index) => {
                const isSelected = selectedIndices.has(index);
                return (
                  <Card 
                    key={index} 
                    padding="md" 
                    hover
                    className={!isSelected ? 'opacity-60 bg-gray-50' : ''}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleQuestion(index)}
                        className="mt-1 h-4 w-4 text-indigo-600 rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            q.type === 'THEORY' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {q.type || 'THEORY'}
                          </span>
                          {!isSelected && (
                            <span className="text-xs text-gray-400">(not selected)</span>
                          )}
                        </div>
                        <p className="text-gray-900">{q.question}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Marks: {q.marks || 1}
                        </p>
                        {q.type === 'MCQ' && q.options && (
                          <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                            {q.options.map((opt, i) => (
                              <span key={i} className="text-gray-600">
                                {String.fromCharCode(65 + i)}. {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={selectedQuestions.length === 0}>
              Next: Preview
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardTitle>Exam Preview</CardTitle>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Subject:</span>{' '}
                <span className="font-medium">{examDetails.subject}</span>
              </p>
              <p>
                <span className="text-gray-500">Semester:</span>{' '}
                <span className="font-medium">{examDetails.semester}</span>
              </p>
              <p>
                <span className="text-gray-500">Type:</span>{' '}
                <span className="font-medium">
                  {examType === 'BOTH' ? 'Mixed (Theory + MCQ)' : examType}
                </span>
              </p>
              <p>
                <span className="text-gray-500">Total Questions:</span>{' '}
                <span className="font-medium">
                  {selectedQuestions.length}
                  {examType === 'BOTH' && (
                    <span className="text-gray-400 ml-1">
                      (Theory: {theoryQuestions.length}, MCQ: {mcqQuestions.length})
                    </span>
                  )}
                </span>
              </p>
              <p>
                <span className="text-gray-500">Total Marks:</span>{' '}
                <span className="font-medium">{totalMarks}</span>
              </p>
            </div>
          </Card>

          <Card padding="none">
            <div className="divide-y divide-gray-100">
              {selectedQuestions.map((q, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <span className="text-sm font-medium text-gray-500">
                      Q{index + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          q.type === 'THEORY' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {q.type || 'THEORY'}
                        </span>
                        <span className="text-sm text-gray-500">[{q.marks || 1} marks]</span>
                      </div>
                      <p className="text-gray-900">{q.question}</p>
                      {q.type === 'MCQ' && q.options && (
                        <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-600">
                          {q.options.map((opt, i) => (
                            <span key={i}>{String.fromCharCode(65 + i)}. {opt}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleCreateExam} loading={isCreating}>
              Create Exam
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateExamPage;
