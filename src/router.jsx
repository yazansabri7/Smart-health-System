import { createBrowserRouter } from 'react-router-dom';
import Authlayout from './layouts/Authlayout';
import Register from './pages/register/Register';
import Login from './pages/login/Login';
import SendCode from './pages/sendcode/SendCode';
import ResetPassword from './pages/reset/ResetPassword';
import DoctorRegister from './pages/docregister/DoctorRegister';
import PatientLayout from './layouts/PatientLayout';
import DoctorLayout from './layouts/DoctorLayout';
import AdminLayout from './layouts/AdminLayout';
import DashboardPlaceholder from './pages/dashboard/DashboardPlaceholder';
import AccessDenied from './pages/dashboard/AccessDenied';
import NotFound from './pages/NotFound';
import ProtectedRoute from './auth/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Authlayout />,
    children: [
      { path: '/register', element: <Register /> },
      { index: true, element: <Login /> },
      { path: 'login', element: <Login /> },
      { path: '/sendcode', element: <SendCode /> },
      { path: '/resetpassword', element: <ResetPassword /> },
      { path: '/docregister', element: <DoctorRegister /> },
    ],
  },
  {
    path: '/patient',
    children: [
      {
        element: (
          <ProtectedRoute role="Patient">
            <PatientLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPlaceholder title="Dashboard" icon="dashboard" role="Patient" /> },
          { path: 'readings', element: <DashboardPlaceholder title="Health Readings" icon="monitor_heart" role="Patient" /> },
          { path: 'medications', element: <DashboardPlaceholder title="Medications" icon="medication" role="Patient" /> },
          { path: 'doctors', element: <DashboardPlaceholder title="My Doctors" icon="medical_services" role="Patient" /> },
          { path: 'messages', element: <DashboardPlaceholder title="Messages" icon="chat" role="Patient" /> },
          { path: 'alerts', element: <DashboardPlaceholder title="Alerts" icon="notifications" role="Patient" /> },
          { path: 'predictions', element: <DashboardPlaceholder title="AI Predictions" icon="psychology" role="Patient" /> },
          { path: 'profile', element: <DashboardPlaceholder title="Profile" icon="person" role="Patient" /> },
        ],
      },
      {
        path: '*',
        element: (
          <ProtectedRoute role="Patient">
            <NotFound />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/doctor',
    children: [
      {
        element: (
          <ProtectedRoute role="Doctor">
            <DoctorLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPlaceholder title="Dashboard" icon="dashboard" role="Doctor" /> },
        ],
      },
      {
        path: '*',
        element: (
          <ProtectedRoute role="Doctor">
            <NotFound />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/admin',
    children: [
      {
        element: (
          <ProtectedRoute role="Admin">
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPlaceholder title="Dashboard" icon="dashboard" role="Admin" /> },
        ],
      },
      {
        path: '*',
        element: (
          <ProtectedRoute role="Admin">
            <NotFound />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '/unauthorized', element: <AccessDenied /> },
  { path: '*', element: <NotFound /> },
]);

export default router;
