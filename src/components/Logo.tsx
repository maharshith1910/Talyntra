import { useState } from "react";

/** Uses /public/logo.png (export from Figma node 22:11 / 27:32) and falls back to an inline mark. */
export default function Logo({ size = 72, round = true }: { size?: number; round?: boolean }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderRadius: round ? "50%" : 24 };
  if (!failed)
    return <img src="/logo.png" alt="Talyntra" className="logo" style={style} onError={() => setFailed(true)} />;
  return (
    <svg className="logo" style={style} viewBox="0 0 64 64" role="img" aria-label="Talyntra">
      <rect width="64" height="64" fill="#032a2d" />
      <g fill="none" stroke="#2fc9c6" strokeWidth="2" strokeLinecap="round">
        <path d="M32 12v40M32 22H20a7 7 0 0 0 0 14h12M32 22h12a7 7 0 0 1 0 14H32" />
        <circle cx="32" cy="12" r="2.5" /><circle cx="32" cy="52" r="2.5" />
        <circle cx="20" cy="29" r="1.6" /><circle cx="44" cy="29" r="1.6" />
      </g>
    </svg>
  );
}
