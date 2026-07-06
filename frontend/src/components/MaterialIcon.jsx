export default function MaterialIcon({
  name,
  className = "",
  ariaHidden = true,
}) {
  return (
    <span
      className={`material-symbols-outlined material-icon ${className}`.trim()}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  );
}
