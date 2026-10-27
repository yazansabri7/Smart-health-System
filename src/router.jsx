import { createBrowserRouter } from "react-router-dom";
import Authlayout from "./layouts/Authlayout";
import Register from "./pages/register/Register";
import Login from "./pages/login/Login";
import SendCode from "./pages/sendcode/SendCode";
import ResetPassword from "./pages/reset/ResetPassword";
import DoctorRegister from "./pages/docregister/DoctorRegister";
import PatientLayout from "./layouts/PatientLayout";
import DoctorLayout from "./layouts/DoctorLayout";
import AdminLayout from "./layouts/AdminLayout";
import DashboardPlaceholder from "./pages/dashboard/DashboardPlaceholder";
import { patientNavigation, doctorNavigation, adminNavigation } from "./config/navigation";

const dashboardRoutes = (navigation, role) => navigation.map((item, index) => ({
  ...(index === 0 ? { index: true } : { path: item.path.split('/').pop() }),
  element: <DashboardPlaceholder title={item.label} icon={item.icon} role={role} />,
}));

const router = createBrowserRouter([
  
  {
    path:'/',
    element:<Authlayout/>,
    children:[
        {
            path:'/register',
            element:<Register/>
        },
        {
            index:true,
            element:<Login/>
        },
        {
            path:'login',
            element:<Login/>
        },
        {
            path:'/sendcode',
            element:<SendCode/>
        },
        {
            path:'/resetpassword',
            element:<ResetPassword/>
        },
        {
            path:'/docregister',
            element:<DoctorRegister/>
        }
    ]
  },
  {
    path:'/patient',
    element:<PatientLayout/>,
    children: dashboardRoutes(patientNavigation, 'Patient'),
  },
  {
    path:'/doctor',
    element:<DoctorLayout/>,
    children: dashboardRoutes(doctorNavigation, 'Doctor'),
  },
  {
    path:'/admin',
    element:<AdminLayout/>,
    children: dashboardRoutes(adminNavigation, 'Admin'),
  }
]);
export default router;
