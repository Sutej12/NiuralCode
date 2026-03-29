import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CandidateLayout from './layouts/CandidateLayout';
import AdminLayout from './layouts/AdminLayout';

// Candidate-facing pages
import CareerPage from './pages/CareerPage';
import JobDetail from './pages/JobDetail';
import ApplyForm from './pages/ApplyForm';
import ApplicationSuccess from './pages/ApplicationSuccess';
import CandidatePortal from './pages/CandidatePortal';
import CandidateScheduleSelect from './pages/CandidateScheduleSelect';
import CandidateOfferSign from './pages/CandidateOfferSign';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import CandidateDetail from './pages/CandidateDetail';
import SchedulingPage from './pages/SchedulingPage';
import InterviewPage from './pages/InterviewPage';
import OfferPage from './pages/OfferPage';
import OnboardingPage from './pages/OnboardingPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* ==================== CANDIDATE PORTAL ==================== */}
        <Route element={<CandidateLayout />}>
          <Route path="/" element={<CareerPage />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/apply/success" element={<ApplicationSuccess />} />
          <Route path="/apply/:jobId" element={<ApplyForm />} />
          <Route path="/candidate/portal/:candidateId/:token" element={<CandidatePortal />} />
          <Route path="/candidate/schedule/:candidateId" element={<CandidateScheduleSelect />} />
          <Route path="/schedule/select/:candidateId" element={<CandidateScheduleSelect />} />
          <Route path="/candidate/offer/:candidateId" element={<CandidateOfferSign />} />
        </Route>

        {/* ==================== ADMIN PORTAL ==================== */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
          <Route path="/admin/candidates/:id" element={<CandidateDetail />} />
          <Route path="/admin/scheduling/:candidateId" element={<SchedulingPage />} />
          <Route path="/admin/interviews/:candidateId" element={<InterviewPage />} />
          <Route path="/admin/offers/:candidateId" element={<OfferPage />} />
          <Route path="/admin/onboarding/:candidateId" element={<OnboardingPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
