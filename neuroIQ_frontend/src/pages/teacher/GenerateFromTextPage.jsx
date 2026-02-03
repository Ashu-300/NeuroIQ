import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { generateTheoryQuestions, generateMCQQuestions } from '../../api/llm.api';
import { Button, Input, Card, CardTitle, Select } from '../../components/ui';

const GenerateFromTextPage = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [questionType, setQuestionType] = useState('theory'); // 'theory' or 'mcq'

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      subject: '',
      semester: '',
      unit_syllabus: '',
      // Theory options
      num_3marks: 2,
      num_4marks: 2,
      num_10marks: 1,
      // MCQ options
      num_mcqs: 10,
    },
  });

  const onSubmit = async (data) => {
    if (!data.unit_syllabus.trim()) {
      setError('Please enter syllabus text');
      return;
    }

    setError('');
    setIsGenerating(true);

    try {
      if (questionType === 'theory') {
        // Generate theory questions
        const result = await generateTheoryQuestions({
          subject: data.subject,
          unit_syllabus: data.unit_syllabus,
          num_3marks: parseInt(data.num_3marks),
          num_4marks: parseInt(data.num_4marks),
          num_10marks: parseInt(data.num_10marks),
        });

        // Navigate to generated questions page with the result
        navigate('/teacher/questions', {
          state: {
            questions: result.questions,
            subject: data.subject,
            semester: data.semester,
            questionType: 'theory',
          },
        });
      } else {
        // Generate MCQ questions
        const result = await generateMCQQuestions({
          subject: data.subject,
          semester: data.semester,
          unit_syllabus: data.unit_syllabus,
          num_mcqs: parseInt(data.num_mcqs),
        });

        // Navigate to generated MCQ questions page
        navigate('/teacher/mcq-questions', {
          state: {
            questions: result.questions,
            subject: data.subject,
            semester: data.semester,
            questionType: 'mcq',
          },
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Questions from Text</h1>
        <p className="text-gray-500 mt-1">
          Enter syllabus text to generate AI-powered questions
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Question Type Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Question Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setQuestionType('theory')}
                className={`
                  flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all
                  ${
                    questionType === 'theory'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Theory Questions
                </div>
                <p className="text-xs mt-1 opacity-75">Long answer questions with marks</p>
              </button>
              <button
                type="button"
                onClick={() => setQuestionType('mcq')}
                className={`
                  flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all
                  ${
                    questionType === 'mcq'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  MCQ Questions
                </div>
                <p className="text-xs mt-1 opacity-75">Multiple choice with 4 options</p>
              </button>
            </div>
          </div>

          {/* Subject & Semester */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Subject"
              placeholder="e.g., Data Structures"
              error={errors.subject?.message}
              disabled={isGenerating}
              {...register('subject', {
                required: 'Subject is required',
              })}
            />
            <Input
              label="Semester"
              placeholder="e.g., 4"
              error={errors.semester?.message}
              disabled={isGenerating}
              {...register('semester')}
            />
          </div>

          {/* Syllabus Text Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Syllabus / Unit Content <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`
                w-full min-h-[200px] p-3 rounded-lg border transition-colors
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                ${errors.unit_syllabus ? 'border-red-500' : 'border-gray-300'}
                ${isGenerating ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              `}
              placeholder="Paste your syllabus content here...&#10;&#10;Example:&#10;Unit 1: Introduction to Data Structures&#10;- Arrays: Single and Multi-dimensional arrays, Array operations&#10;- Linked Lists: Singly, Doubly, Circular linked lists&#10;- Stacks: Array and Linked list implementation, Applications&#10;- Queues: Types of queues, Priority queue, Dequeue"
              disabled={isGenerating}
              {...register('unit_syllabus', {
                required: 'Syllabus text is required',
              })}
            />
            {errors.unit_syllabus && (
              <p className="text-sm text-red-500">{errors.unit_syllabus.message}</p>
            )}
          </div>

          {/* Question Count Options - Theory */}
          {questionType === 'theory' && (
            <div className="space-y-4">
              <CardTitle className="text-base">Theory Question Distribution</CardTitle>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    3 Marks Questions
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isGenerating}
                    {...register('num_3marks', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    4 Marks Questions
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isGenerating}
                    {...register('num_4marks', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    10 Marks Questions
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isGenerating}
                    {...register('num_10marks', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Question Count Options - MCQ */}
          {questionType === 'mcq' && (
            <div className="space-y-4">
              <CardTitle className="text-base">MCQ Options</CardTitle>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of MCQs
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isGenerating}
                  {...register('num_mcqs', { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isGenerating}>
              {isGenerating ? 'Generating...' : `Generate ${questionType === 'theory' ? 'Theory' : 'MCQ'} Questions`}
            </Button>
          </div>
        </form>
      </Card>

      {/* Tips Section */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <svg className="h-6 w-6 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-medium text-blue-800">Tips for better results</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Include detailed topic descriptions for more relevant questions</li>
              <li>• Break down complex topics into smaller units</li>
              <li>• Include key terms, concepts, and formulas for technical subjects</li>
              <li>• The more context you provide, the better the generated questions</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GenerateFromTextPage;
