import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Aurora from "../components/Aurora";
import Logo from "../components/Logo";
import Button from "../components/Button";

export default function Home() {
  const nav = useNavigate();

  // Keyboard shortcuts: Enter → login
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Only fire if no input/button is focused
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'TEXTAREA') {
          nav("/login");
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nav]);

  return (
    <Aurora className="home">
      <header className="home__brand"><Logo size={120} round={false} /></header>
      <section className="home__intro">
        <h1 className="reveal" style={{ "--i": 0 } as React.CSSProperties}>Introducing Talyntra…</h1>
        <p className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
          We've built an intelligent CV platform that transforms how professionals understand, validate, and elevate their careers.
        </p>
        <p className="reveal" style={{ "--i": 2 } as React.CSSProperties}>
          Talyntra goes beyond resume parsing — it analyzes your profile, identifies strengths, detects missing competencies, and guides you through a personalized conversational journey to bridge the gap between where you are and where you want to be.
        </p>
        <p className="home__tagline reveal" style={{ "--i": 3 } as React.CSSProperties}>
          Upload your CV. Discover your edge. Close your gaps.
        </p>
      </section>
      <aside className="home__cta glass">
        <h2>Get Started</h2>
        <div className="home__actions">
          <Button onClick={() => nav("/login")}>Login</Button>
          <Button onClick={() => nav("/login?mode=signup")} variant="deep">Sign Up</Button>
        </div>
      </aside>
    </Aurora>
  );
}
