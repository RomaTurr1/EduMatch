import { useState } from "react";
import { ArrowRight, Moon, Sparkles, Sun, UsersRound, Zap } from "lucide-react";
import { api, setAuth } from "../services/api";
import type { AuthPayload } from "../types/api";

type Props = {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onAuthenticated: (payload: AuthPayload) => void;
};

export function AuthPage({ theme, onToggleTheme, onAuthenticated }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setError("");
    const payload =
      mode === "signup"
        ? {
            name: String(formData.get("name")),
            email: String(formData.get("email")),
            password: String(formData.get("password")),
            course: String(formData.get("course") || ""),
            university: String(formData.get("university") || ""),
            skills: String(formData.get("skills") || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          }
        : {
            email: String(formData.get("email")),
            password: String(formData.get("password"))
          };

    try {
      const result = await api<AuthPayload>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setAuth(result);
      onAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  return (
    <section className="auth-page">
      <button className="theme-float" onClick={onToggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="auth-hero">
        <span className="eyebrow"><Sparkles size={16} /> Student teams, matched faster</span>
        <h1>EduMatch</h1>
        <p className="hero-copy">Build a standout project team, discover classmates with the right skills, and keep every project conversation in one polished workspace.</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => setMode("signup")}>
            Start matching <ArrowRight size={18} />
          </button>
          <button className="secondary" onClick={() => setMode("signin")}>I already have an account</button>
        </div>
        <div className="hero-stats">
          <div><strong>24/7</strong><span>Project rooms</span></div>
          <div><strong>Skills</strong><span>Smart search</span></div>
          <div><strong>Live</strong><span>Team chat</span></div>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-header">
          <div className="mini-icon"><UsersRound size={20} /></div>
          <div>
            <h2>{mode === "signin" ? "Welcome back" : "Create your profile"}</h2>
            <p>{mode === "signin" ? "Pick up where your team left off." : "Tell EduMatch what you can build."}</p>
          </div>
        </div>
        <div className="segmented">
          <button type="button" className={mode === "signin" ? "selected" : ""} onClick={() => setMode("signin")}>
            Sign in
          </button>
          <button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>
            Sign up
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
          }}
        >
          {mode === "signup" && (
            <>
              <input name="name" placeholder="Full name" required />
              <input name="course" placeholder="Course" />
              <input name="university" placeholder="University" />
              <input name="skills" placeholder="Skills, comma separated" />
            </>
          )}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required minLength={8} />
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit">
            {mode === "signin" ? "Sign in" : "Create account"} <Zap size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
