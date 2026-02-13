import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, RoleGuard } from '../auth';
import { ROLES } from '../utils/constants';

// Layouts
import { AuthLayout, AdminLayout, TeacherLayout, StudentLayout } from '../layouts';

// Auth Pages
import { LoginPage, SignupPage } from '../pages/auth';

// Dashboard Pages
import { Dashboard as AdminDashboard, RoomManagementPage, SeatingGenerationPage, AttendancePage } from '../pages/admin';
import { Dashboard as TeacherDashboard, UploadSyllabusPage, GenerateFromTextPage, GeneratedQuestionsPage, GeneratedMCQPage, QuestionBankPage, CreateExamPage, ExamListPage, ScheduledExamsPage } from '../pages/teacher';
import { Dashboard as StudentDashboard, ExamLaunchPage, IdentityVerificationPage, ProctoringExamPage } from '../pages/student';
import ProfilePage from '../pages/ProfilePage';

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <AdminLayout />
              </RoleGuard>
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="rooms" element={<RoomManagementPage />} />
          <Route path="seating" element={<SeatingGenerationPage />} />
          <Route path="attendance" element={<AttendancePage />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[ROLES.TEACHER]}>
                <TeacherLayout />
              </RoleGuard>
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/teacher/dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="upload" element={<UploadSyllabusPage />} />
          <Route path="generate-from-text" element={<GenerateFromTextPage />} />
          <Route path="questions" element={<GeneratedQuestionsPage />} />
          <Route path="mcq-questions" element={<GeneratedMCQPage />} />
          <Route path="question-bank" element={<QuestionBankPage />} />
          <Route path="create-exam" element={<CreateExamPage />} />
          <Route path="exams" element={<ExamListPage />} />
          <Route path="scheduled-exams" element={<ScheduledExamsPage />} />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[ROLES.STUDENT]}>
                <StudentLayout />
              </RoleGuard>
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="exams" element={<ExamLaunchPage />} />
          <Route path="verify-identity" element={<IdentityVerificationPage />} />
          <Route path="proctoring-exam" element={<ProctoringExamPage />} />
          <Route path="reports" element={<div className="p-4">Exam Reports (Coming Soon)</div>} />
        </Route>

        {/* Profile Route - accessible by all authenticated users */}
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <ProfilePage />
            </AuthGuard>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900">404</h1>
                <p className="text-gray-500 mt-2">Page not found</p>
                <a href="/login" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
                  Go to login →
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
