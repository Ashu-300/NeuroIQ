import { useEffect, useState } from 'react';
import { Card, Button, Loader, Select } from '../../components/ui';
import { EmptyState } from '../../components/feedback';
import { getScheduledExams } from '../../api/management.api';
import { getMyExamStatus, getExamReport } from '../../api/proctoring.api';

const isSubmittedStatus = (statusValue) => {
  const normalized = String(statusValue || '').toLowerCase();
  return normalized === 'submitted' || normalized === 'auto_submitted' || normalized === 'terminated';
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const StudentReportsPage = () => {
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedProfile = localStorage.getItem('neuroiq_student_profile');
    if (!storedProfile) return;

    try {
      const profile = JSON.parse(storedProfile);
      if (profile?.branch) {
        setBranch(profile.branch);
      }
      if (profile?.semester !== undefined && profile?.semester !== null) {
        setSemester(String(profile.semester));
      }
    } catch (err) {
      console.error('Failed to parse student profile:', err);
    }
  }, []);

  const fetchReports = async () => {
    if (!branch || !semester) {
      setError('Please select branch and semester to load your reports.');
      setReports([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const scheduledExams = await getScheduledExams(branch, semester);

      const transformedExams = (scheduledExams || []).map((exam, idx) => ({
        id: exam._id || `exam-${idx}`,
        title: exam.title,
        subject: exam.subject,
        start_time: exam.date && exam.start_time ? `${exam.date.split('T')[0]}T${exam.start_time}:00` : exam.date,
      }));

      const statusResults = await Promise.all(
        transformedExams.map(async (exam) => {
          try {
            const status = await getMyExamStatus(exam.id);
            return { exam, status };
          } catch (statusErr) {
            console.error(`Failed to load status for exam ${exam.id}:`, statusErr);
            return { exam, status: null };
          }
        })
      );

      const submittedSessions = statusResults.filter(({ status }) => {
        if (!status?.session_id) return false;
        if (isSubmittedStatus(status?.status)) return true;
        return status?.can_attempt === false;
      });

      const reportResults = await Promise.all(
        submittedSessions.map(async ({ exam, status }) => {
          try {
            const report = await getExamReport(status.session_id);
            return {
              exam,
              status,
              report,
            };
          } catch (reportErr) {
            console.error(`Failed to load report for session ${status.session_id}:`, reportErr);
            return {
              exam,
              status,
              report: null,
            };
          }
        })
      );

      const mapped = reportResults
        .map(({ exam, status, report }) => ({
          id: status.session_id,
          examTitle: exam.title || 'Untitled Exam',
          subject: exam.subject || '-',
          examDate: exam.start_time,
          sessionStatus: report?.status || status?.status || '-',
          warnings: report?.total_warnings ?? 0,
          violations: Array.isArray(report?.violations) ? report.violations.length : 0,
          durationSeconds: report?.duration_seconds,
          submittedAt: report?.end_time,
          reportAvailable: Boolean(report),
        }))
        .sort((a, b) => {
          const aTime = new Date(a.submittedAt || a.examDate || 0).getTime();
          const bTime = new Date(b.submittedAt || b.examDate || 0).getTime();
          return bTime - aTime;
        });

      setReports(mapped);
    } catch (err) {
      console.error('Failed to load student reports:', err);
      setError('Failed to load reports. Please try again.');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Reports</h1>
        <p className="text-gray-500 mt-1">Your submitted exams and proctoring report summaries</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label="Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            options={[
              { value: '', label: 'Select Branch' },
              { value: 'CSE', label: 'CSE' },
              { value: 'IT', label: 'IT' },
              { value: 'ECE', label: 'ECE' },
              { value: 'MECH', label: 'MECH' },
              { value: 'CIVIL', label: 'CIVIL' },
              { value: 'EE', label: 'EE' },
              { value: 'EC', label: 'EC' },
            ]}
          />

          <Select
            label="Semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            options={[
              { value: '', label: 'Select Semester' },
              { value: '1', label: '1st' },
              { value: '2', label: '2nd' },
              { value: '3', label: '3rd' },
              { value: '4', label: '4th' },
              { value: '5', label: '5th' },
              { value: '6', label: '6th' },
              { value: '7', label: '7th' },
              { value: '8', label: '8th' },
            ]}
          />

          <Button onClick={fetchReports} disabled={!branch || !semester || isLoading}>
            {isLoading ? 'Loading...' : 'Load Reports'}
          </Button>
        </div>
      </Card>

      {error && (
        <Card>
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-52">
          <Loader size="lg" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports available"
          description="Submitted exam reports will appear here after the exam ends and proctoring report is generated."
        />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <div key={report.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{report.examTitle}</p>
                  <p className="text-sm text-gray-500">{report.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Exam: {formatDateTime(report.examDate)} | Submitted: {formatDateTime(report.submittedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 md:justify-end">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    Status: {report.sessionStatus}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Warnings: {report.warnings}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                    Violations: {report.violations}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    Duration: {formatDuration(report.durationSeconds)}
                  </span>
                  {!report.reportAvailable && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Report processing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default StudentReportsPage;
