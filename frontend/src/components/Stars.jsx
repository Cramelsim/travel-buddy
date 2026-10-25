export default function Stars({ value }) {
  const filled = Math.round(value ?? 0);
  return (
    <span className="stars" role="img" aria-label={`${value ?? 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? "" : "off"}>
          ★
        </span>
      ))}
    </span>
  );
}
