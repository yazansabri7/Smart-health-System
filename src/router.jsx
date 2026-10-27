import { createBrowserRouter } from "react-router-dom";
import Mainlayout from "./layouts/Mainlayout";
import Home from "./pages/home/Home";
import Authlayout from "./layouts/Authlayout";
import Register from "./pages/register/Register";
import Login from "./pages/login/Login";
import SendCode from "./pages/sendcode/SendCode";
import ResetPassword from "./pages/reset/ResetPassword";
import DoctorRegister from "./pages/docregister/DoctorRegister";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Mainlayout></Mainlayout>,
    children:[
        {
            index:true ,
            element : <Home></Home>
        },
       
    ]
  },
  {
    element:<Authlayout></Authlayout>,
    children:[
        {
            path:'/register',
            element:<Register></Register>
        },
        {
            path:'/login',
            element:<Login></Login>
        },
        {
            path:'/sendcode',
            element:<SendCode></SendCode>
        },
        {
            path:'/resetpassword',
            element:<ResetPassword></ResetPassword>
        },
        {
            path:'/docregister',
            element:<DoctorRegister></DoctorRegister>
        }
    ]
  }
]);
export default router;