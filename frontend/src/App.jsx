import { Route, Routes } from "react-router-dom";
import AuthForm from "./pages/AuthForm.jsx";
import DestinationDetail from "./pages/DestinationDetail.jsx";
import Destinations from "./pages/Destinations.jsx";
import Navbar from "./components/Navbar.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Destinations />} />
          <Route path="/destinations/:id" element={<DestinationDetail />} />
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
