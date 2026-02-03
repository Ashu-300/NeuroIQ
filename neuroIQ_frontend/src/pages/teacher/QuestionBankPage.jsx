import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions } from '../../api/question.api';
import { Button, Card, Input, Select, Loader } from '../../components/ui';
import { EmptyState } from '../../components/feedback';

const categoryOptions = [
  { value: 'THEORY', label: 'Theory Questions' },
  { value: 'MCQ', label: 'MCQ Questions' },
  { value: 'BOTH', label: 'Both (Theory + MCQ)' },
];

const QuestionBankPage = () => {
  const navigate = useNavigate();
  const [questionSets, setQuestionSets] = useState([]); // Array of question set documents
  const [flatQuestions, setFlatQuestions] = useState([]); // Flattened individual questions
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    subject: '',
    semester: '',
    category: 'BOTH',
  });

  const fetchQuestions = async () => {
    if (!filters.subject || !filters.semester) return;

    setIsLoading(true);
    setError('');

    try {
      let allSets = [];
      let allQuestions = [];

      if (filters.category === 'BOTH') {
        // Fetch both THEORY and MCQ questions
        const [theoryResult, mcqResult] = await Promise.all([
          getQuestions({ subject: filters.subject, semester: filters.semester, category: 'THEORY' }),
          getQuestions({ subject: filters.subject, semester: filters.semester, category: 'MCQ' }),
        ]);

        const theorySets = theoryResult.questions || [];
        const mcqSets = mcqResult.questions || [];
        allSets = [...theorySets, ...mcqSets];

        // Flatten theory questions
        theorySets.forEach((set) => {
          (set.theory_questions || []).forEach((q) => {
            allQuestions.push({
              ...q,
              type: 'THEORY',
              setId: set._id,
              subject: set.subject,
              semester: set.semester,
            });
          });
        });

        // Flatten MCQ questions
        mcqSets.forEach((set) => {
          (set.mcq_questions || []).forEach((q) => {
            allQuestions.push({
              ...q,
              type: 'MCQ',
              setId: set._id,
              subject: set.subject,
              semester: set.semester,
            });
          });
        });
      } else {
        // Fetch single category
        const result = await getQuestions({
          subject: filters.subject,
          semester: filters.semester,
          category: filters.category,
        });
        
        allSets = result.questions || [];
        
        // Flatten questions from all sets for display
        allSets.forEach((set) => {
          const questionsArray = 
            filters.category === 'THEORY' 
              ? set.theory_questions || [] 
              : set.mcq_questions || [];
          
          questionsArray.forEach((q) => {
            allQuestions.push({
              ...q,
              type: filters.category,
              setId: set._id,
              subject: set.subject,
              semester: set.semester,
            });
          });
        });
      }

      setQuestionSets(allSets);
      setFlatQuestions(allQuestions);
    } catch (err) {
      setError(err.message || 'Failed to fetch questions');
      setQuestionSets([]);
      setFlatQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-500 mt-1">Browse and manage your saved questions</p>
        </div>
        <Button onClick={() => navigate('/teacher/upload')}>+ Add Questions</Button>
      </div>

      {/* Filters */}
      <Card>
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Subject"
              placeholder="e.g., Data Structures"
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            />
          </div>
          <div className="w-32">
            <Input
              label="Semester"
              placeholder="e.g., 4"
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
            />
          </div>
          <div className="w-48">
            <Select
              label="Category"
              options={categoryOptions}
              value={filters.category}
              onChange={(e) => {
                // Clear existing questions when category changes to prevent schema mismatch
                setFlatQuestions([]);
                setQuestionSets([]);
                setFilters({ ...filters, category: e.target.value });
              }}
            />
          </div>
          <Button type="submit" disabled={!filters.subject || !filters.semester}>
            Search
          </Button>
        </form>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      )}

      {/* Results */}
      {!isLoading && flatQuestions.length === 0 && filters.subject && filters.semester && (
        <EmptyState
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          title="No questions found"
          description="No questions match your search criteria"
          action={
            <Button onClick={() => navigate('/teacher/upload')}>Upload Syllabus</Button>
          }
        />
      )}

      {!isLoading && flatQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Found {flatQuestions.length} question(s) from {questionSets.length} set(s)
              {filters.category === 'BOTH' && (
                <span className="ml-2">
                  (Theory: {flatQuestions.filter(q => q.type === 'THEORY').length}, 
                  MCQ: {flatQuestions.filter(q => q.type === 'MCQ').length})
                </span>
              )}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                navigate('/teacher/create-exam', {
                  state: { questions: flatQuestions, subject: filters.subject, semester: filters.semester, category: filters.category },
                })
              }
            >
              Create Exam from These
            </Button>
          </div>

          {/* Mixed/Both Questions - render based on each question's type */}
          <div className="space-y-4">
            {flatQuestions.map((q, index) => {
              // Render Theory Question
              if (q.type === 'THEORY') {
                return (
                  <Card key={index} padding="md" hover>
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                            THEORY
                          </span>
                        </div>
                        <p className="text-gray-900">{q.question || 'No question text'}</p>
                        <p className="text-sm text-gray-500 mt-2">Marks: {q.marks ?? 'N/A'}</p>
                      </div>
                    </div>
                  </Card>
                );
              }

              // Render MCQ Question
              const getCorrectOptionIndex = () => {
                if (!q.correct_option) return -1;
                const optionMatch = q.correct_option.match(/Option\s*([A-D])/i);
                if (optionMatch) {
                  return optionMatch[1].toUpperCase().charCodeAt(0) - 65;
                }
                return q.options?.findIndex(opt => opt === q.correct_option) ?? -1;
              };
              const correctIndex = getCorrectOptionIndex();
              
              return (
                <Card key={index} padding="md" hover>
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            MCQ
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium">{q.question || 'No question text'}</p>
                      </div>
                    </div>
                    <div className="ml-12 grid grid-cols-2 gap-2">
                      {q.options?.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded border ${
                            optIndex === correctIndex
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : 'border-gray-200'
                          }`}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          {option}
                        </div>
                      ))}
                    </div>
                    <div className="ml-12 text-sm text-green-600">
                      Correct: {q.correct_option}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBankPage;
