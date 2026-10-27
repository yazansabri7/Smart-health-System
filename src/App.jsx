
import { RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import router from "./router";
import { authSession } from "./auth/session.js";
export default function App() {
  useEffect(() => {
    function revalidate() {
      authSession.getValidSession();
    }
    function restore() {
      authSession.restore();
    }
    function storageChanged(event) {
      if (event.key === 'authToken' || event.key === null) {
        restore();
      }
    }
    window.addEventListener('storage', storageChanged);
    window.addEventListener('pageshow', restore);
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener('pageshow', restore);
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, []);
  return <RouterProvider router={router} />;
}
