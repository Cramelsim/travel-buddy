import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const today = () => new Date().toISOString().slice(0, 10);

export default function BookTripForm({ destination }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ start_date: "", end_date: "", travelers: 1 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createTrip({
        ...form,
        travelers: Number(form.travelers),
        destination_id: destination.id,
      });
      navigate("/bookings");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Book a trip to {destination.name}</h2>
      {error && <p className="alert">{error}</p>}
      <div className="form-row">
        <label>
          From
          <input type="date" min={today()} value={form.start_date} onChange={set("start_date")} required />
        </label>
        <label>
          To
          <input
            type="date"
            min={form.start_date || today()}
            value={form.end_date}
            onChange={set("end_date")}
            required
          />
        </label>
      </div>
      <label>
        Travelers
        <input type="number" min="1" max="20" value={form.travelers} onChange={set("travelers")} required />
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Booking…" : "Book now"}
      </button>
    </form>
  );
}
