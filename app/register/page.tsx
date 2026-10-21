"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveMemberData } from "@/lib/member";
import TurnstileWidget, { turnstileConfigured } from "@/components/public/TurnstileWidget";

function getPasswordStrength(val: string) {
  let score = 0;
  if (val.length >= 8) score += 25;
  if (/[A-Z]/.test(val)) score += 25;
  if (/[0-9]/.test(val)) score += 25;
  if (/[^A-Za-z0-9]/.test(val)) score += 25;
  return score;
}

function strengthColor(score: number) {
  if (score <= 25) return "#E8192C";
  if (score <= 50) return "#f59e0b";
  if (score <= 75) return "#10b981";
  return "#22c55e";
}

export default function RegisterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"register" | "login">("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refCode, setRefCode] = useState("");

  const [reg, setReg] = useState({
    name: "", phone: "", email: "", nationality: "", city: "", password: "",
  });
  const [pwScore, setPwScore] = useState(0);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [captcha, setCaptcha] = useState<string | null>(null);     // Turnstile token; verified by the SERVER route
  const [captchaTry, setCaptchaTry] = useState(0);
  const [notice, setNotice] = useState("");
  const [loginCaptcha, setLoginCaptcha] = useState<string | null>(null);
  const [loginCaptchaTry, setLoginCaptchaTry] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setRefCode(ref.trim().toUpperCase());
  }, []);

  const setSession = (data: any) => {
    const safeMemberData = { ...data };
    delete safeMemberData.password_hash;
    saveMemberData(safeMemberData);
    document.cookie = "gm4wd_registered=1; path=/; max-age=31536000";
    router.push("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (reg.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      // Server route: validates, rate-limits, hashes the password on the server and never returns the hash.
      const res = await fetch("/api/public/register", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: reg.name, email: reg.email, phone: reg.phone || undefined, nationality: reg.nationality || undefined,
          city: reg.city || undefined, password: reg.password, refCode: refCode || undefined, website: "",
          turnstileToken: captcha || undefined,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.status === 429) { setError("Too many attempts. Please wait a while and try again."); return; }
      if (res.status === 400 && out?.error === "verification failed") { setError("Please complete the human check and try again."); setCaptcha(null); setCaptchaTry(n => n + 1); return; }
      if (!res.ok || out.ok !== true) throw new Error("Registration failed. Try again.");
      // The answer is identical for a new and an already-registered address, so nothing here reveals whether the email was known.
      // The member signs in explicitly (password checked inside the database) with the address they just used.
      setLogin({ email: reg.email.trim().toLowerCase(), password: "" });
      setReg(r => ({ ...r, password: "" }));
      setNotice("Thanks! If this email address was not already registered, your account is ready. Please log in with your email and password.");
      setCaptcha(null); setCaptchaTry(n => n + 1);
      setTab("login");
    } catch (err: any) {
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Server route -> public.club_member_login: the password is compared inside the database and no hash ever reaches the browser.
      const res = await fetch("/api/public/member-login", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: login.email.trim().toLowerCase(), password: login.password, turnstileToken: loginCaptcha || undefined }),
      });
      const out = await res.json().catch(() => ({}));
      setLoginCaptcha(null); setLoginCaptchaTry(n => n + 1);                 // a Turnstile token is single-use
      if (res.status === 429) { setError("Too many attempts. Please wait a while and try again."); return; }
      if (res.status === 400 && out?.error === "verification failed") { setError("Please complete the human check and try again."); return; }
      if (res.status === 401) { setError("The email or password is not correct."); return; }   // same text whether or not the email is registered
      if (!res.ok || out.ok !== true || !out.member) throw new Error("Login is temporarily unavailable. Please try again.");
      setSession(out.member);
    } catch (err: any) {
      setError(err.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "#fff",
    fontFamily: "'Barlow', sans-serif",
    fontSize: 14,
    padding: "12px 14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080A0F", color: "#fff", fontFamily: "'Barlow', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#E8192C", zIndex: 100 }} />

      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, background: "#E8192C", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#fff", fontSize: 16 }}>4W</div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", color: "#E8192C", textTransform: "uppercase", marginBottom: 10 }}>Members Only · Join Free</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(36px, 8vw, 52px)", fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, color: "#fff" }}>
            Greenland<br />Mini <span style={{ color: "#E8192C" }}>4WD</span><br />Club
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 10, fontWeight: 300, letterSpacing: "0.05em" }}>Race. Tune. Compete.</div>
        </div>

        {/* Referral banner */}
        {refCode && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#22C55E", textAlign: "center", marginBottom: 20, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
            🎟️ REFERRAL CODE APPLIED: <strong>{refCode}</strong>
          </div>
        )}

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "36px 32px" }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 32 }}>
            {(["register", "login"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 20px", cursor: "pointer", color: tab === t ? "#fff" : "rgba(255,255,255,0.45)", borderBottom: `2px solid ${tab === t ? "#E8192C" : "transparent"}`, marginBottom: -1, background: "none", borderTop: "none", borderLeft: "none", borderRight: "none" }}>
                {t === "register" ? "Register" : "Member Login"}
              </button>
            ))}
          </div>

          {notice && !error && (
            <div role="status" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#86efac", marginBottom: 20 }}>
              {notice}
            </div>
          )}
          {error && (
            <div style={{ background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.3)", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#E8192C", marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* REGISTER */}
          {tab === "register" && (
            <form onSubmit={handleRegister}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>Create Your Account</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input style={inp} type="text" placeholder="Takeshi Nagano" value={reg.name} onChange={e => setReg({ ...reg, name: e.target.value })} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inp} type="tel" placeholder="+299 00 00 00" value={reg.phone} onChange={e => setReg({ ...reg, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inp} type="email" placeholder="you@example.com" value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nationality</label>
                    <select style={{ ...inp, WebkitAppearance: "none" } as any} value={reg.nationality} onChange={e => setReg({ ...reg, nationality: e.target.value })}>
                      <option value="">Select...</option>
                      <option>Greenlandic</option>
                      <option>Danish</option>
                      <option>Japanese</option>
                      <option>Filipino</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input style={inp} type="text" placeholder="Nuuk" value={reg.city} onChange={e => setReg({ ...reg, city: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input style={inp} type="password" placeholder="Create a password" value={reg.password}
                    onChange={e => { setReg({ ...reg, password: e.target.value }); setPwScore(getPasswordStrength(e.target.value)); }} required />
                  <div style={{ height: 2, borderRadius: 2, background: "rgba(255,255,255,0.1)", marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pwScore}%`, background: strengthColor(pwScore), transition: "width 0.3s, background 0.3s", borderRadius: 2 }} />
                  </div>
                </div>
              </div>
              <TurnstileWidget onToken={setCaptcha} resetKey={captchaTry} />
              <button type="submit" disabled={loading || (turnstileConfigured() && !captcha)}
                style={{ width: "100%", marginTop: 24, padding: "15px", background: "#E8192C", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", border: "none", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "JOINING..." : "JOIN THE CLUB — FREE"}
              </button>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 12 }}>No fees. No spam. Pure racing.</div>
            </form>
          )}

          {/* LOGIN */}
          {tab === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>Welcome Back</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inp} type="email" placeholder="you@example.com" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} required />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input style={inp} type="password" placeholder="Your password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required />
                </div>
              </div>
              <TurnstileWidget onToken={setLoginCaptcha} resetKey={loginCaptchaTry} />
              <button type="submit" disabled={loading || (turnstileConfigured() && !loginCaptcha)}
                style={{ width: "100%", marginTop: 24, padding: "15px", background: "#E8192C", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", border: "none", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "LOGGING IN..." : "LOGIN TO DASHBOARD"}
              </button>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 12 }}>
                No account yet?{" "}
                <button type="button" onClick={() => setTab("register")} style={{ color: "#E8192C", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
                  Register free
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { value: "120+", label: "Members" },
            { value: "48", label: "Races Held" },
            { value: "Free", label: "To Join" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        select option { background: #12161f; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}