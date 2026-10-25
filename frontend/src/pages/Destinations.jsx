import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Stars from "../components/Stars.jsx";

const CATEGORIES = ["beach", "city", "mountain", "safari", "cultural"];

export default function Destinations() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [destinations, setDestinations] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stale = false;
    // Debounce typing in the search box.
    const timer = setTimeout(() => {
      api
        .destinations({ category, search })
        .then((data) => !stale && (setDestinations(data), setError("")))
        .catch((err) => !stale && setError(err.message));
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [category, search]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Where to next?</h1>
          <p className="muted">Pick a destination, book a trip and tell others how it went.</p>
        </div>
        <input
          type="search"
          className="toolbar-search"
          placeholder="Search destinations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search destinations"
        />
      </div>

      <div className="toolbar" style={{ marginBottom: "1.5rem" }}>
        {["", ...CATEGORIES].map((c) => (
          <button
            key={c || "all"}
            className={`chip ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c || "all"}
          </button>
        ))}
      </div>

      {error && <p className="alert">{error}</p>}
      {destinations === null && !error && <p className="muted">Loading…</p>}
      {destinations?.length === 0 && <p className="muted">No destinations match your search.</p>}

      <div className="grid">
        {destinations?.map((d) => (
          <Link key={d.id} to={`/destinations/${d.id}`} className="card dest-card">
            <img src={d.image_url} alt={d.name} loading="lazy" />
            <div className="dest-body">
              <span className="tag">{d.category}</span>
              <h3>{d.name}</h3>
              <p>{d.description}</p>
              {d.review_count > 0 ? (
                <span>
                  <Stars value={d.average_rating} />{" "}
                  <span className="muted">
                    {d.average_rating} ({d.review_count})
                  </span>
                </span>
              ) : (
                <span className="muted">No reviews yet</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
