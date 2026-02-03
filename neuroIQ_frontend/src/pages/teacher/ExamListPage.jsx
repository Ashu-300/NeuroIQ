import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardTitle, Input, Select, Loader } from '../../components/ui';
import { EmptyState } from '../../components/feedback';
import { getExamsBySubjectAndSemester } from '../../api/question.api';

const ExamListPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [error, setError] = useState('');
  const [viewingExam, setViewingExam] = useState(null);

  const fetchExams = async () => {
    if (!subject.trim() || !semester.trim()) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      const response = await getExamsBySubjectAndSemester(subject.trim(), semester.trim());
      const fetchedExams = (response.exams || []).map((exam) => ({
        id: exam._id,
        subject: exam.subject,
        semester: exam.semester,
        type: exam.category || 'BOTH',
        theoryCount: exam.theory_questions?.length || 0,
        mcqCount: exam.mcq_questions?.length || 0,
        questionCount: (exam.theory_questions?.length || 0) + (exam.mcq_questions?.length || 0),
        totalMarks: (exam.theory_questions || []).reduce((sum, q) => sum + (q.marks || 0), 0) + (exam.mcq_questions?.length || 0),
        createdAt: exam.created_at || new Date().toISOString(),
        theoryQuestions: exam.theory_questions,
        mcqQuestions: exam.mcq_questions,
      }));
      setExams(fetchedExams);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      setError(err.message || 'Failed to fetch exams');
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchExams();
  };

  const handleViewExam = (exam) => {
    setViewingExam(exam);
  };

  const handleCloseView = () => {
    setViewingExam(null);
  };

  const generateExamText = (exam) => {
    let content = `EXAMINATION PAPER\n`;
    content += `${'='.repeat(50)}\n\n`;
    content += `Subject: ${exam.subject}\n`;
    content += `Semester: ${exam.semester}\n`;
    content += `Type: ${exam.type}\n`;
    content += `Total Questions: ${exam.questionCount}\n`;
    content += `Total Marks: ${exam.totalMarks}\n`;
    content += `\n${'='.repeat(50)}\n\n`;

    let questionNo = 1;

    // Theory Questions
    if (exam.theoryQuestions && exam.theoryQuestions.length > 0) {
      content += `SECTION A: THEORY QUESTIONS\n`;
      content += `${'-'.repeat(30)}\n\n`;
      exam.theoryQuestions.forEach((q) => {
        content += `Q${questionNo}. ${q.question} [${q.marks} marks]\n\n`;
        questionNo++;
      });
      content += '\n';
    }

    // MCQ Questions
    if (exam.mcqQuestions && exam.mcqQuestions.length > 0) {
      content += `SECTION B: MULTIPLE CHOICE QUESTIONS\n`;
      content += `${'-'.repeat(30)}\n\n`;
      exam.mcqQuestions.forEach((q) => {
        content += `Q${questionNo}. ${q.question} [1 mark]\n`;
        q.options.forEach((opt, i) => {
          content += `    ${String.fromCharCode(65 + i)}. ${opt}\n`;
        });
        content += `\n`;
        questionNo++;
      });
    }

    content += `\n${'='.repeat(50)}\n`;
    content += `END OF PAPER\n`;

    return content;
  };

  const handleDownloadText = (exam) => {
    const content = generateExamText(exam);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.subject.replace(/\s+/g, '_')}_Sem${exam.semester}_Exam.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = (exam) => {
    // Generate HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${exam.subject} - Semester ${exam.semester} Exam</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header { margin-bottom: 30px; }
          .header p { margin: 5px 0; }
          .section-title { background: #f0f0f0; padding: 10px; margin: 20px 0 10px 0; font-weight: bold; }
          .question { margin: 15px 0; page-break-inside: avoid; }
          .question-text { font-weight: 500; }
          .marks { color: #666; font-size: 0.9em; }
          .options { margin: 10px 0 10px 20px; }
          .option { margin: 5px 0; }
          .footer { margin-top: 40px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h1>EXAMINATION PAPER</h1>
        <div class="header">
          <p><strong>Subject:</strong> ${exam.subject}</p>
          <p><strong>Semester:</strong> ${exam.semester}</p>
          <p><strong>Type:</strong> ${exam.type}</p>
          <p><strong>Total Questions:</strong> ${exam.questionCount}</p>
          <p><strong>Total Marks:</strong> ${exam.totalMarks}</p>
        </div>
    `;

    let questionNo = 1;

    // Theory Questions
    if (exam.theoryQuestions && exam.theoryQuestions.length > 0) {
      htmlContent += `<div class="section-title">SECTION A: THEORY QUESTIONS</div>`;
      exam.theoryQuestions.forEach((q) => {
        htmlContent += `
          <div class="question">
            <span class="question-text">Q${questionNo}. ${q.question}</span>
            <span class="marks">[${q.marks} marks]</span>
          </div>
        `;
        questionNo++;
      });
    }

    // MCQ Questions
    if (exam.mcqQuestions && exam.mcqQuestions.length > 0) {
      htmlContent += `<div class="section-title">SECTION B: MULTIPLE CHOICE QUESTIONS</div>`;
      exam.mcqQuestions.forEach((q) => {
        htmlContent += `
          <div class="question">
            <div class="question-text">Q${questionNo}. ${q.question} <span class="marks">[1 mark]</span></div>
            <div class="options">
              ${q.options.map((opt, i) => `<div class="option">${String.fromCharCode(65 + i)}. ${opt}</div>`).join('')}
            </div>
          </div>
        `;
        questionNo++;
      });
    }

    htmlContent += `
        <div class="footer">END OF PAPER</div>
      </body>
      </html>
    `;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.semester.includes(searchTerm);
    const matchesType = filterType === 'ALL' || exam.type === filterType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'THEORY':
        return 'bg-purple-100 text-purple-800';
      case 'MCQ':
        return 'bg-blue-100 text-blue-800';
      case 'BOTH':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
          <p className="text-gray-500 mt-1">View and manage created exams</p>
        </div>
        <Button onClick={() => navigate('/teacher/question-bank')}>
          Create New Exam
        </Button>
      </div>

      {/* Search by Subject and Semester */}
      <Card padding="md">
        <CardTitle>Search Exams</CardTitle>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <Input
              placeholder="e.g., Network Security"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <Select
              options={[
                { value: '', label: 'Select Semester' },
                { value: '1', label: 'Semester 1' },
                { value: '2', label: 'Semester 2' },
                { value: '3', label: 'Semester 3' },
                { value: '4', label: 'Semester 4' },
                { value: '5', label: 'Semester 5' },
                { value: '6', label: 'Semester 6' },
                { value: '7', label: 'Semester 7' },
                { value: '8', label: 'Semester 8' },
              ]}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleSearch} 
              disabled={!subject.trim() || !semester.trim()}
              loading={isLoading}
              fullWidth
            >
              Search Exams
            </Button>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </Card>

      {/* Filter Results */}
      {exams.length > 0 && (
        <Card padding="md">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Filter by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: 'ALL', label: 'All Types' },
                { value: 'BOTH', label: 'Both (Theory + MCQ)' },
                { value: 'THEORY', label: 'Theory' },
                { value: 'MCQ', label: 'MCQ' },
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            />
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader size="lg" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title={subject && semester ? "No exams found" : "Search for exams"}
          description={subject && semester 
            ? "No exams found for this subject and semester. Create one from the question bank."
            : "Enter a subject and semester to search for exams."
          }
          action={
            <Button onClick={() => navigate('/teacher/question-bank')}>
              Go to Question Bank
            </Button>
          }
        />
      ) : filteredExams.length === 0 ? (
        <EmptyState
          title="No matching exams"
          description="Try adjusting your filter criteria"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <Card key={exam.id} hover>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {exam.subject}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Semester {exam.semester}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(exam.type)}`}
                  >
                    {exam.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Questions:</span>{' '}
                    <span className="font-medium">{exam.questionCount}</span>
                    {exam.type === 'BOTH' && (
                      <span className="text-xs text-gray-400 block">
                        (T: {exam.theoryCount}, M: {exam.mcqCount})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Marks:</span>{' '}
                    <span className="font-medium">{exam.totalMarks}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  Created {formatDate(exam.createdAt)}
                </div>

                <div className="pt-2 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    fullWidth
                    onClick={() => handleViewExam(exam)}
                  >
                    View
                  </Button>
                  <div className="relative group flex-1">
                    <Button variant="secondary" size="sm" fullWidth>
                      Download ▾
                    </Button>
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => handleDownloadText(exam)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📄 Text File
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(exam)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📑 PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Exam Modal */}
      {viewingExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{viewingExam.subject}</h2>
                <p className="text-sm text-gray-500">Semester {viewingExam.semester} • {viewingExam.type}</p>
              </div>
              <button
                onClick={handleCloseView}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-indigo-600">{viewingExam.questionCount}</p>
                    <p className="text-sm text-gray-500">Total Questions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{viewingExam.totalMarks}</p>
                    <p className="text-sm text-gray-500">Total Marks</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{viewingExam.type}</p>
                    <p className="text-sm text-gray-500">Exam Type</p>
                  </div>
                </div>
              </div>

              {/* Theory Questions */}
              {viewingExam.theoryQuestions && viewingExam.theoryQuestions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Theory Questions ({viewingExam.theoryQuestions.length})
                  </h3>
                  <div className="space-y-3">
                    {viewingExam.theoryQuestions.map((q, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-gray-400">Q{idx + 1}</span>
                          <div className="flex-1">
                            <p className="text-gray-800">{q.question}</p>
                            <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              {q.marks} marks
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MCQ Questions */}
              {viewingExam.mcqQuestions && viewingExam.mcqQuestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    MCQ Questions ({viewingExam.mcqQuestions.length})
                  </h3>
                  <div className="space-y-3">
                    {viewingExam.mcqQuestions.map((q, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-gray-400">
                            Q{(viewingExam.theoryQuestions?.length || 0) + idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-800 mb-2">{q.question}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {q.options.map((opt, i) => (
                                <div
                                  key={i}
                                  className={`text-sm px-3 py-2 rounded ${
                                    q.correct_option === opt ||
                                    q.correct_option === `Option ${String.fromCharCode(65 + i)}`
                                      ? 'bg-green-100 text-green-800 border border-green-300'
                                      : 'bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + i)}. {opt}
                                </div>
                              ))}
                            </div>
                            <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              1 mark
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleDownloadText(viewingExam)}>
                Download Text
              </Button>
              <Button variant="secondary" onClick={() => handleDownloadPDF(viewingExam)}>
                Download PDF
              </Button>
              <Button onClick={handleCloseView}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamListPage;
