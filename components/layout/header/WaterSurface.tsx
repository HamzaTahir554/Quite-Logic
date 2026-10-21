/** Decorative only: the controls are siblings so liquid motion never moves text. */
export default function WaterSurface() {
  return (
    <div className="header-float" aria-hidden="true">
      <div className="header-surface">
        <svg
          className="header-water-wave header-water-wave--wide"
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
          focusable="false"
        >
          <path d="M0 72C160 5 285 145 520 72S875 9 1200 64V160H0Z" />
          <path
            className="header-water-edge"
            d="M0 72C160 5 285 145 520 72S875 9 1200 64"
          />
        </svg>
        <svg
          className="header-water-wave header-water-wave--near"
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
          focusable="false"
        >
          <path d="M0 90C205 156 330 12 610 75S950 132 1200 45V160H0Z" />
        </svg>
        <span className="header-water-reflection" />
      </div>
    </div>
  );
}
