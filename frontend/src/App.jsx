import { Route, Routes } from "react-router-dom";
import AuthForm from "./pages/AuthForm.jsx";
import Navbar from "./components/Navbar.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
          <Route path="*" element={<p className="muted">Nothing here yet.</p>} />
        </Routes>
      </main>
    </>
  );
}
