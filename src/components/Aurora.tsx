import { ReactNode } from "react";
/** The Figma diamond-radial teal field, breathing slowly. */
export default function Aurora({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`aurora ${className}`}>
      <div className="aurora__glow" aria-hidden />
      {children}
    </main>
  );
}
