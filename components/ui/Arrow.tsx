/** Decorative link affordance; the surrounding label supplies its accessible name. */
export default function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`link-arrow ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}
