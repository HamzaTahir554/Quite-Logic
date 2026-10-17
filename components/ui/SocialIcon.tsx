import type { SocialPlatform } from "@/lib/social-links";

export default function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const paths: Record<SocialPlatform, React.ReactNode> = {
    LinkedIn: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 10v7m0-10v.1M11 17v-7m0 3a3 3 0 0 1 6 0v4" />
      </>
    ),
    Instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17 7h.01" />
      </>
    ),
    GitHub: (
      <>
        <path d="M9 21v-3c-4 1-4-2-6-2m12 5v-4c0-1 .1-1.5-.5-2 4-.5 5.5-2 5.5-5a4 4 0 0 0-1-3c.3-1 .3-2 0-3-1 0-2 .5-3 1a12 12 0 0 0-8 0C7 4.5 6 4 5 4c-.3 1-.3 2 0 3a4 4 0 0 0-1 3c0 3 1.5 4.5 5.5 5-.6.5-.5 1-.5 2" />
      </>
    ),
    Facebook: (
      <path d="M14 21v-8h3l.5-4H14V7c0-1 .5-2 2-2h2V2h-3c-3 0-5 2-5 5v2H7v4h3v8" />
    ),
    X: (
      <>
        <path d="m4 3 16 18h-4L2 3h4ZM21 3 3 21" />
      </>
    ),
    YouTube: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="4" />
        <path d="m10 9 5 3-5 3Z" />
      </>
    ),
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[platform]}
    </svg>
  );
}
