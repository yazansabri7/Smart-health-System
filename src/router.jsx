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
import { patientNavigation, doctorNavigation, adminNavigation } from './config/navigation';
import ProtectedRoute from './auth/ProtectedRoute';

function dashboardRoutes(navigation, role) {
  return navigation.map((item, index) => {
    const route = {
      element: <DashboardPlaceholder title={item.label} icon={item.icon} role={role} />,
    };
    if (index === 0) {
      route.index = true;
    } else {
      route.path = item.path.split('/').pop();
    }
    return route;
  });
}

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
    element: <ProtectedRoute role="Patient" />,
    children: [
      {
        path: '/patient',
        element: <PatientLayout />,
        children: [
          ...dashboardRoutes(patientNavigation, 'Patient'),
          { path: '*', element: <DashboardPlaceholder title="Page not found" /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute role="Doctor" />,
    children: [
      {
        path: '/doctor',
        element: <DoctorLayout />,
        children: [
          ...dashboardRoutes(doctorNavigation, 'Doctor'),
          { path: '*', element: <DashboardPlaceholder title="Page not found" role="Doctor" /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute role="Admin" />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          ...dashboardRoutes(adminNavigation, 'Admin'),
          { path: '*', element: <DashboardPlaceholder title="Page not found" role="Admin" /> },
        ],
      },
    ],
  },
]);

export default router;
