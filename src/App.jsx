import React from 'react'
import Mainlayout from './layouts/Mainlayout'
import router from './router'
import { RouterProvider } from "react-router-dom";
export default function App() {
  return (
    <>
    <RouterProvider router={router} />
    </>
  )
}
