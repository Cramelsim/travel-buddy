import { useState } from "react";
import { api } from "../api";

// Creates a review, or edits it when `review` is given.
export default function ReviewForm({ destinationId, review, onSaved, onCancel }) {
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (review) await api.updateReview(review.id, { rating: Number(rating), comment });
      else await api.createReview({ destination_id: destinationId, rating: Number(rating), comment });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h3>{review ? "Edit your review" : "Leave a review"}</h3>
      {error && <p className="alert">{error}</p>}
      <label>
        Rating
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)} ({n})
            </option>
          ))}
        </select>
      </label>
      <label>
        Comment
        <textarea rows="3" maxLength="1000" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <div className="row-actions">
        <button className="btn btn-primary" disabled={busy}>
          {review ? "Save changes" : "Post review"}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
