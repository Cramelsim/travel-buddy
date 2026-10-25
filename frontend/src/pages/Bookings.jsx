import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import TripCard from "../components/TripCard.jsx";

const FILTERS = ["all", "booked", "cancelled"];

export default function Bookings() {
  const [trips, setTrips] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
        .trips()
        .then(setTrips)
        .catch((err) => setError(err.message)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const visible = trips?.filter((t) => filter === "all" || t.status === filter);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My bookings</h1>
          <p className="muted">Review, change or cancel your upcoming trips.</p>
        </div>
        <div className="toolbar">
          {FILTERS.map((f) => (
            <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="alert">{error}</p>}
      {trips === null && !error && <p className="muted">Loading…</p>}
      {visible?.length === 0 && (
        <p className="muted">
          {trips.length === 0 ? (
            <>
              You have no bookings yet. <Link to="/">Find a destination</Link>.
            </>
          ) : (
            `No ${filter} bookings.`
          )}
        </p>
      )}
      <div className="stack">
        {visible?.map((trip) => (
          <TripCard key={trip.id} trip={trip} onChange={load} />
        ))}
      </div>
    </>
  );
}
