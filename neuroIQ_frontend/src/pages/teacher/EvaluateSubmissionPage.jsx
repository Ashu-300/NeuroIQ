import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardTitle, Button, Modal } from '../../components/ui';
import { getStudentExamSubmission, evaluateTheoryAnswer, storeExamEvaluation, getStudentExamEvaluation } from '../../api/answer.api';

// Helper to normalize MongoDB ObjectID
const normalizeId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.$oid) return value.$oid;
  return String(value);
};

// Local storage key helper for saving in-progress evaluations
// Use URL params (examId, sessionId, studentId) so the key stays stable across refreshes
const getEvaluationDraftKey = (examId, sessionId, studentId) => 
  `exam_evaluation_draft:${examId || 'no-exam'}:${sessionId || 'no-session'}:${studentId || 'no-student'}`;

const EvaluateSubmissionPage = () => {
  const { examId, sessionId, studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get context from navigation state
  const examContext = location.state || {};
  const { question_bank_id, exam_title, subject: examSubject, viewOnly } = examContext;

  const [submission, setSubmission] = useState(null);
  const [existingEvaluation, setExistingEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theoryEvaluations, setTheoryEvaluations] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(viewOnly || false);

  // Use question_bank_id for fetching answers (this is what answers are stored with)
  // Fall back to examId (schedule_id) if question_bank_id is not available
  const answerExamId = question_bank_id || examId;

  useEffect(() => {
    fetchSubmission();
  }, [answerExamId, studentId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      setError(null);
      // Answers are stored with question_bank_id as exam_id, not schedule_id
      const data = await getStudentExamSubmission(answerExamId, studentId);
      setSubmission(data);
      
      // Try to fetch existing evaluation
      try {
        const evalData = await getStudentExamEvaluation(answerExamId, studentId);
        if (evalData) {
          setExistingEvaluation(evalData);
          setIsViewMode(true);
          
          // Pre-populate evaluations from existing data
          const existingEvals = {};
          evalData.evaluation?.theory_evaluations?.forEach((evalItem) => {
            const qId = normalizeId(evalItem.question_id);
            existingEvals[qId] = {
              obtained_marks: evalItem.obtained_marks,
              max_marks: evalItem.max_marks,
              feedback: evalItem.feedback || '',
            };
          });
          setTheoryEvaluations(existingEvals);
          return; // Skip default initialization
        }
      } catch (evalErr) {
        // No existing evaluation, continue with default initialization
        console.log('No existing evaluation found');
      }
      
      // Initialize theory evaluations from existing answers (for new evaluations)
      if (data?.answers?.theory_answers) {
        let initialEvals = {};

        // Try to load any saved draft from local storage first
        try {
          // Load any saved draft using stable URL-based key (examId, sessionId, studentId)
          const draftKey = getEvaluationDraftKey(examId, sessionId, studentId);
          const draftStr = window?.localStorage?.getItem(draftKey);
          if (draftStr) {
            const draft = JSON.parse(draftStr);
            if (draft && draft.theoryEvaluations) {
              initialEvals = draft.theoryEvaluations;
            }
          }
        } catch (storageErr) {
          console.error('Failed to load evaluation draft from local storage:', storageErr);
        }

        // If no draft found, initialize fresh evaluations
        if (!initialEvals || Object.keys(initialEvals).length === 0) {
          data.answers.theory_answers.forEach((answer) => {
            const qId = normalizeId(answer.question_id);
            initialEvals[qId] = {
              obtained_marks: 0,
              max_marks: answer.max_marks || 5,
              feedback: '',
            };
          });
        }

        setTheoryEvaluations(initialEvals);
      }
    } catch (err) {
      console.error('Failed to fetch submission:', err);
      setError(err.response?.data?.error || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  // Persist in-progress theory evaluations to local storage to survive refresh
  useEffect(() => {
    if (!submission || isViewMode) return;
    if (!submission.answers?.theory_answers?.length) return;

    try {
      // Save draft using stable URL-based key (examId, sessionId, studentId)
      const draftKey = getEvaluationDraftKey(examId, sessionId, studentId);
      const payload = {
        theoryEvaluations,
      };
      window?.localStorage?.setItem(draftKey, JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to save evaluation draft to local storage:', err);
    }
  }, [theoryEvaluations, submission, examId, sessionId, studentId, isViewMode]);

  const handleTheoryMarksChange = (questionId, field, value) => {
    if (isViewMode) return; // Don't allow changes in view mode
    setTheoryEvaluations((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: field === 'obtained_marks' ? parseInt(value) || 0 : value,
      },
    }));
  };

  const handleAIEvaluate = async (answer) => {
    const qId = normalizeId(answer.question_id);
    try {
      setAiLoading((prev) => ({ ...prev, [qId]: true }));
      const result = await evaluateTheoryAnswer({
        question_id: qId,
        question_text: answer.question_text,
        answer_text: answer.answer_text,
        subject: submission?.subject || examSubject || 'General',
        max_marks: answer.max_marks || 5,
      });
      
      setTheoryEvaluations((prev) => ({
        ...prev,
        [qId]: {
          obtained_marks: result.obtained_marks,
          max_marks: answer.max_marks || 5,
          feedback: result.feedback,
        },
      }));
    } catch (err) {
      console.error('AI evaluation failed:', err);
      alert('AI evaluation failed. Please evaluate manually.');
    } finally {
      setAiLoading((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handleSubmitEvaluation = async () => {
    try {
      setSubmitting(true);
      
      // Build theory evaluations array
      const theoryEvals = submission?.answers?.theory_answers?.map((answer) => {
        const qId = normalizeId(answer.question_id);
        const evalData = theoryEvaluations[qId] || {};
        return {
          question_id: qId,
          obtained_marks: evalData.obtained_marks || 0,
          max_marks: evalData.max_marks || answer.max_marks || 5,
          feedback: evalData.feedback || '',
        };
      }) || [];

      // Build MCQ evaluations from submission (already graded)
      const mcqEvals = submission?.answers?.mcq_answers?.map((answer) => ({
        question_id: normalizeId(answer.question_id),
        is_correct: answer.is_correct,
        obtained_marks: answer.is_correct ? (answer.marks || 1) : 0,
        max_marks: answer.marks || 1,
      })) || [];

      await storeExamEvaluation({
        submission_id: normalizeId(submission._id || submission.id),
        exam_id: answerExamId,
        student_id: studentId,
        subject: submission?.subject || examSubject || '',
        semester: submission?.semester || '',
        exam_type: submission?.exam_type || '',
        theory_evaluations: theoryEvals,
        mcq_evaluations: mcqEvals,
      });

      // Clear only this evaluation's draft from local storage on successful submit
      try {
        const draftKey = getEvaluationDraftKey(examId, sessionId, studentId);
        window?.localStorage?.removeItem(draftKey);
      } catch (storageErr) {
        console.error('Failed to clear evaluation draft from local storage:', storageErr);
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error('Failed to submit evaluation:', err);
      alert(err.response?.data?.error || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotalMarks = () => {
    let theoryTotal = 0;
    let mcqTotal = 0;
    let theoryMax = 0;
    let mcqMax = 0;

    // Theory marks
    submission?.answers?.theory_answers?.forEach((answer) => {
      const qId = normalizeId(answer.question_id);
      const evalData = theoryEvaluations[qId];
      theoryTotal += evalData?.obtained_marks || 0;
      theoryMax += evalData?.max_marks || answer.max_marks || 5;
    });

    // MCQ marks
    submission?.answers?.mcq_answers?.forEach((answer) => {
      if (answer.is_correct) {
        mcqTotal += answer.marks || 1;
      }
      mcqMax += answer.marks || 1;
    });

    return { theoryTotal, mcqTotal, theoryMax, mcqMax, total: theoryTotal + mcqTotal, max: theoryMax + mcqMax };
  };

  const marks = calculateTotalMarks();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading submission...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Submission</h3>
            <p className="mt-2 text-gray-500">{error}</p>
            <Button onClick={fetchSubmission} className="mt-4">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Attempts
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {isViewMode ? 'View Evaluation' : 'Evaluate Submission'} {exam_title && `- ${exam_title}`}
            </h1>
            {isViewMode && (
              <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Already Evaluated
              </span>
            )}
          </div>
          {!question_bank_id && (
            <p className="text-orange-500 text-sm mt-1">
              Warning: Missing question bank reference. Using schedule ID to fetch answers.
            </p>
          )}
          <p className="text-gray-500 mt-1">
            Student ID: <span className="font-mono">{studentId?.slice(0, 12)}...</span>
          </p>
        </div>
      </div>

      {/* Submission Info Card */}
      <Card padding="md">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-500">Subject</p>
            <p className="font-medium">{submission?.subject || examSubject || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Semester</p>
            <p className="font-medium">{submission?.semester || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Exam Type</p>
            <p className="font-medium">{submission?.exam_type || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`px-2 py-1 text-xs rounded-full ${
              submission?.status === 'submitted' ? 'bg-green-100 text-green-800' : 
              submission?.status === 'evaluated' ? 'bg-blue-100 text-blue-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {submission?.status || 'N/A'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Submitted At</p>
            <p className="font-medium text-sm">
              {submission?.created_at 
                ? new Date(submission.created_at).toLocaleString() 
                : 'N/A'}
            </p>
          </div>
        </div>
      </Card>

      {/* Marks Summary */}
      <Card padding="md" className="bg-indigo-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-indigo-600">Theory Marks</p>
              <p className="text-2xl font-bold text-indigo-900">{marks.theoryTotal} / {marks.theoryMax}</p>
            </div>
            <div>
              <p className="text-sm text-indigo-600">MCQ Marks</p>
              <p className="text-2xl font-bold text-indigo-900">{marks.mcqTotal} / {marks.mcqMax}</p>
            </div>
            <div>
              <p className="text-sm text-indigo-600">Total Marks</p>
              <p className="text-2xl font-bold text-indigo-900">{marks.total} / {marks.max}</p>
            </div>
            {existingEvaluation && (
              <div>
                <p className="text-sm text-indigo-600">Evaluated On</p>
                <p className="text-sm font-medium text-indigo-900">
                  {existingEvaluation.created_at 
                    ? new Date(existingEvaluation.created_at).toLocaleString() 
                    : 'N/A'}
                </p>
              </div>
            )}
          </div>
          {!isViewMode && (
            <Button 
              onClick={handleSubmitEvaluation} 
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? 'Submitting...' : 'Submit Evaluation'}
            </Button>
          )}
        </div>
      </Card>

      {/* Theory Answers Section */}
      {submission?.answers?.theory_answers?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Theory Answers ({submission.answers.theory_answers.length})
          </h2>
          <div className="space-y-4">
            {submission.answers.theory_answers.map((answer, index) => {
              const qId = normalizeId(answer.question_id);
              const evalData = theoryEvaluations[qId] || {};
              const isAiLoading = aiLoading[qId];
              
              return (
                <Card key={qId || index} padding="md" className="border-l-4 border-l-indigo-500">
                  <div className="space-y-4">
                    {/* Question */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wide">
                          Question {index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          Max Marks: {answer.max_marks || 5}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium">{answer.question_text}</p>
                    </div>

                    {/* Student's Answer */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        Student's Answer
                      </p>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {answer.answer_text || <span className="italic text-gray-400">No answer provided</span>}
                      </p>
                    </div>

                    {/* Evaluation Section */}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg ${isViewMode ? 'bg-green-50' : 'bg-indigo-50'}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Obtained Marks
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={evalData.max_marks || answer.max_marks || 5}
                          value={evalData.obtained_marks || 0}
                          onChange={(e) => handleTheoryMarksChange(qId, 'obtained_marks', e.target.value)}
                          disabled={isViewMode}
                          readOnly={isViewMode}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isViewMode ? 'bg-white cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Feedback
                        </label>
                        <textarea
                          rows={2}
                          value={evalData.feedback || ''}
                          onChange={(e) => handleTheoryMarksChange(qId, 'feedback', e.target.value)}
                          placeholder={isViewMode ? 'No feedback provided' : 'Enter feedback for the student...'}
                          disabled={isViewMode}
                          readOnly={isViewMode}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isViewMode ? 'bg-white cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    {/* AI Evaluate Button */}
                    {!isViewMode && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAIEvaluate(answer)}
                          disabled={isAiLoading || !answer.answer_text}
                        >
                          {isAiLoading ? (
                            <>
                              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                              Evaluating...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              AI Evaluate
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* MCQ Answers Section */}
      {submission?.answers?.mcq_answers?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            MCQ Answers ({submission.answers.mcq_answers.length})
          </h2>
          <div className="space-y-3">
            {submission.answers.mcq_answers.map((answer, index) => {
              const qId = normalizeId(answer.question_id);
              
              return (
                <Card 
                  key={qId || index} 
                  padding="md" 
                  className={`border-l-4 ${answer.is_correct ? 'border-l-green-500' : 'border-l-red-500'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wide">
                          Question {index + 1}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          answer.is_correct 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {answer.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {answer.is_correct ? answer.marks || 1 : 0} / {answer.marks || 1} marks
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-3">{answer.question_text}</p>
                      
                      {/* Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {answer.options?.map((option, optIdx) => {
                          const isSelected = option === answer.selected_option;
                          const isCorrect = option === answer.correct_option;
                          
                          let bgColor = 'bg-gray-50';
                          let textColor = 'text-gray-700';
                          let borderColor = 'border-gray-200';
                          
                          if (isCorrect) {
                            bgColor = 'bg-green-50';
                            textColor = 'text-green-800';
                            borderColor = 'border-green-300';
                          } else if (isSelected && !isCorrect) {
                            bgColor = 'bg-red-50';
                            textColor = 'text-red-800';
                            borderColor = 'border-red-300';
                          }
                          
                          return (
                            <div 
                              key={optIdx}
                              className={`p-2 rounded border ${bgColor} ${borderColor}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${textColor}`}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span className={textColor}>{option}</span>
                                {isSelected && (
                                  <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                                    Selected
                                  </span>
                                )}
                                {isCorrect && (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Answers Message */}
      {!submission?.answers?.theory_answers?.length && !submission?.answers?.mcq_answers?.length && (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Answers Found</h3>
            <p className="mt-2 text-gray-500">This submission contains no answers.</p>
          </div>
        </Card>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate(-1);
        }}
        title="Evaluation Submitted"
      >
        <div className="text-center py-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Evaluation Saved Successfully</h3>
          <p className="text-gray-500 mb-4">
            Total Marks: <span className="font-bold text-indigo-600">{marks.total} / {marks.max}</span>
          </p>
          <Button onClick={() => {
            setShowSuccessModal(false);
            navigate(-1);
          }}>
            Back to Attempts
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default EvaluateSubmissionPage;
