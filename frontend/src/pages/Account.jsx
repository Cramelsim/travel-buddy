import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth.jsx";

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({ username: user.username, email: user.email, password: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    const changes = { username: form.username, email: form.email };
    if (form.password) changes.password = form.password;
    try {
      setUser(await api.updateUser(user.id, changes));
      setForm({ ...form, password: "" });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete your account, bookings and reviews? This cannot be undone.")) return;
    try {
      await api.deleteUser(user.id);
      logout(); // ProtectedRoute then sends the visitor to the login page
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-form stack">
      <form className="card form" onSubmit={submit}>
        <h1>Your account</h1>
        {error && <p className="alert">{error}</p>}
        {saved && <p className="notice">Saved.</p>}
        <label>
          Username
          <input value={form.username} onChange={set("username")} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set("email")} required />
        </label>
        <label>
          New password
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            minLength={8}
            placeholder="Leave blank to keep the current one"
            autoComplete="new-password"
          />
        </label>
        <button className="btn btn-primary">Save changes</button>
      </form>
      <button className="btn btn-danger" onClick={remove}>
        Delete account
      </button>
    </div>
  );
}
