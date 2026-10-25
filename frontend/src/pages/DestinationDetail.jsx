import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import BookTripForm from "../components/BookTripForm.jsx";
import ReviewForm from "../components/ReviewForm.jsx";
import Stars from "../components/Stars.jsx";

export default function DestinationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [destination, setDestination] = useState(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(
    () =>
      api
        .destination(id)
        .then(setDestination)
        .catch((err) => setError(err.message)),
    [id]
  );
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="alert">{error}</p>;
  if (!destination) return <p className="muted">Loading…</p>;

  const myReview = destination.reviews.find((r) => r.user_id === user?.id);
  const saved = () => {
    setEditingId(null);
    load();
  };
  const remove = async (review) => {
    if (!window.confirm("Delete your review?")) return;
    try {
      await api.deleteReview(review.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <p>
        <Link to="/">← All destinations</Link>
      </p>
      <div className="detail">
        <div className="stack">
          <img className="hero" src={destination.image_url} alt={destination.name} />
          <div>
            <span className="tag">{destination.category}</span>
            <h1>{destination.name}</h1>
            <p>{destination.description}</p>
            <p className="muted">
              {destination.review_count > 0 ? (
                <>
                  <Stars value={destination.average_rating} /> {destination.average_rating} from{" "}
                  {destination.review_count} review{destination.review_count === 1 ? "" : "s"}
                </>
              ) : (
                "No reviews yet"
              )}
              {destination.users.length > 0 &&
                ` · ${destination.users.length} traveler${destination.users.length === 1 ? "" : "s"} booked`}
            </p>
          </div>

          <h2>Reviews</h2>
          {destination.reviews.length === 0 && <p className="muted">Be the first to review this place.</p>}
          {destination.reviews.map((r) =>
            editingId === r.id ? (
              <ReviewForm
                key={r.id}
                destinationId={destination.id}
                review={r}
                onSaved={saved}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <article key={r.id} className="card review">
                <header>
                  <strong>{r.username}</strong>
                  <Stars value={r.rating} />
                </header>
                {r.comment && <p>{r.comment}</p>}
                <small className="muted">{new Date(r.created_at).toLocaleDateString()}</small>
                {r.user_id === user?.id && (
                  <div className="row-actions">
                    <button className="btn btn-sm" onClick={() => setEditingId(r.id)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>
                      Delete
                    </button>
                  </div>
                )}
              </article>
            )
          )}
        </div>

        <aside className="stack">
          {user ? (
            <>
              <BookTripForm destination={destination} />
              {!myReview && <ReviewForm destinationId={destination.id} onSaved={saved} />}
            </>
          ) : (
            <div className="card form">
              <h2>Ready to go?</h2>
              <p className="muted">Log in to book a trip and share your experience.</p>
              <Link to="/login" state={{ from: `/destinations/${destination.id}` }} className="btn btn-primary">
                Log in
              </Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
