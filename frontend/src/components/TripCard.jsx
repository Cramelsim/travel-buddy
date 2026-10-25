import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const fmt = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function TripCard({ trip, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    start_date: trip.start_date,
    end_date: trip.end_date,
    travelers: trip.travelers,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cancelled = trip.status === "cancelled";
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Run an API call, then refresh the list; surface any error on the card.
  const run = async (action) => {
    setError("");
    setBusy(true);
    try {
      await action();
      setEditing(false);
      await onChange();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const save = (e) => {
    e.preventDefault();
    run(() => api.updateTrip(trip.id, { ...form, travelers: Number(form.travelers) }));
  };
  const cancel = () => {
    if (window.confirm(`Cancel your trip to ${trip.destination.name}?`)) run(() => api.cancelTrip(trip.id));
  };
  const remove = () => {
    if (window.confirm("Remove this booking from your list?")) run(() => api.deleteTrip(trip.id));
  };

  return (
    <article className={`card trip ${cancelled ? "cancelled" : ""}`}>
      <img src={trip.destination.image_url} alt={trip.destination.name} loading="lazy" />
      <div className="trip-body">
        <h3>
          <Link to={`/destinations/${trip.destination_id}`}>{trip.destination.name}</Link>
          <span className={`status status-${trip.status}`}>{trip.status}</span>
        </h3>
        {error && <p className="alert">{error}</p>}

        {editing ? (
          <form className="form" style={{ padding: 0 }} onSubmit={save}>
            <div className="form-row">
              <label>
                From
                <input type="date" value={form.start_date} onChange={set("start_date")} required />
              </label>
              <label>
                To
                <input type="date" min={form.start_date} value={form.end_date} onChange={set("end_date")} required />
              </label>
              <label>
                Travelers
                <input type="number" min="1" max="20" value={form.travelers} onChange={set("travelers")} required />
              </label>
            </div>
            <div className="row-actions">
              <button className="btn btn-primary btn-sm" disabled={busy}>
                Save
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
                Discard
              </button>
            </div>
          </form>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              {fmt(trip.start_date)} → {fmt(trip.end_date)} · {trip.travelers} traveler
              {trip.travelers === 1 ? "" : "s"}
            </p>
            <div className="row-actions">
              {!cancelled && (
                <>
                  <button className="btn btn-sm" onClick={() => setEditing(true)} disabled={busy}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={cancel} disabled={busy}>
                    Cancel booking
                  </button>
                </>
              )}
              {cancelled && (
                <button className="btn btn-sm btn-danger" onClick={remove} disabled={busy}>
                  Remove
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
