import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

// One form for both login and registration.
export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate(location.state?.from ?? "/", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card form auth-form" onSubmit={submit}>
      <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
      {error && <p className="alert">{error}</p>}
      {isRegister && (
        <label>
          Username
          <input value={form.username} onChange={set("username")} required autoComplete="username" />
        </label>
      )}
      <label>
        {isRegister ? "Email" : "Email or username"}
        <input
          type={isRegister ? "email" : "text"}
          value={form.email}
          onChange={set("email")}
          required
          autoComplete="email"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={form.password}
          onChange={set("password")}
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Please wait…" : isRegister ? "Sign up" : "Log in"}
      </button>
      <p className="muted">
        {isRegister ? (
          <>
            Already have an account? <Link to="/login">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link to="/register">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
