import type { SVGProps } from "react";

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3v2.5" />
      <path d="M12 18.5V21" />
      <path d="M3 12h2.5" />
      <path d="M18.5 12H21" />
      <path d="M5.5 5.5l1.8 1.8" />
      <path d="M16.7 16.7l1.8 1.8" />
      <path d="M5.5 18.5l1.8-1.8" />
      <path d="M16.7 7.3l1.8-1.8" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export const Icons = {
  home: "🏠",
  analytics: "📊",
  microphone: "🎤",
  speaker: "🔊",
  next: "➡️",
  reset: "🔄",
} as const;
