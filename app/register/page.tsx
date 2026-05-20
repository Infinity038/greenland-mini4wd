"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { saveMemberData } from "@/lib/member";

const IMAGES = [
  "/IMG_5374.png",
  "/IMG_5375.png",
  "/IMG_5376.png",
  "/IMG_5377.png",
  "/IMG_5378.png",
];

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

  // Register form
  const [reg, setReg] = useState({
    name: "", phone: "", email: "", nationality: "", city: "", password: "",
  });
  const [pwScore, setPwScore] = useState(0);

  // Login form
  const [login, setLogin] = useState({ email: "", password: "" });

  const setSession = (data: any) => {
    saveMemberData(data);
    document.cookie = "gm4wd_registered=1; path=/; max-age=31536000";
    router.push("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (reg.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const bcrypt = await import("bcryptjs");
      const password_hash = await bcrypt.hash(reg.password, 10);

      const { data: existing } = await supabase
        .from("members")
        .select("id, email")
        .eq("email", reg.email.trim().toLowerCase())
        .single();

      if (existing) {
        // Already registered — let them in
        setSession(existing);
        return;
      }

      const payload = {
        name: reg.name.trim(),
        email: reg.email.trim().toLowerCase(),
        phone: reg.phone.trim() || null,
        nationality: reg.nationality || null,
        city: reg.city.trim() || null,
        password_hash,
      };

      const { data, error: insertError } = await supabase
        .from("members")
        .insert([payload])
        .select()
        .single();

      if (insertError) throw insertError;
      setSession(data);
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
      const { data, error: fetchError } = await supabase
        .from("members")
        .select("*")
        .eq("email", login.email.trim().toLowerCase())
        .single();

      if (fetchError || !data) {
        setError("No account found with that email.");
        return;
      }

      if (!data.password_hash) {
        // Legacy member with no password — let them in and prompt to set one later
        setSession(data);
        return;
      }

      const bcrypt = await import("bcryptjs");
      const match = await bcrypt.compare(login.password, data.password_hash);
      if (!match) { setError("Incorrect password."); return; }

      setSession(data);
    } catch (err: any) {
      setError(err.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    color: "#fff",
    fontFamily: "'Barlow', sans-serif",
    fontSize: 14,
    padding: "11px 14px",
    outline: "none",
    width: "100%",
  };

  const label: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080A0F", color: "#fff", fontFamily: "'Barlow', sans-serif", display: "grid", gridTemplateColumns: "1fr 1fr" }}
      className="register-grid">

      {/* Top red bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#E8192C", zIndex: 100 }} />

      {/* LEFT: Scrolling car strip */}
      <div style={{ position: "relative", overflow: "hidden" }} className="car-col">
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", animation: "scrollUp 30s linear infinite" }}>
            {[...IMAGES, ...IMAGES].map((src, i) => (
              <img key={i} src={src} alt="Mini 4WD"
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", flexShrink: 0 }} />
            ))}
          </div>
        </div>
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, #080A0F 100%), linear-gradient(to bottom, #080A0F 0%, transparent 15%, transparent 85%, #080A0F 100%)", zIndex: 2, pointerEvents: "none" }} />
        {/* Red slash */}
        <div style={{ position: "absolute", top: 0, bottom: 0, right: -2, width: 80, background: "#E8192C", clipPath: "polygon(60% 0, 100% 0, 40% 100%, 0% 100%)", zIndex: 3, opacity: 0.9 }} className="slash" />
        {/* Tag */}
        <div style={{ position: "absolute", bottom: 32, left: 24, zIndex: 10, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }} className="featured-tag">
          Greenland Mini 4WD Club · Est. 2025
        </div>
      </div>

      {/* RIGHT: Form */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 52px 60px 64px", background: "linear-gradient(135deg, rgba(8,10,15,0.98) 0%, rgba(12,16,26,0.98) 100%)", overflowY: "auto" }}
        className="form-col">

        {/* Brand */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", color: "#E8192C", textTransform: "uppercase", marginBottom: 8 }}>Members Only · Join Free</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, color: "#fff" }}>
            Greenland<br />Mini <span style={{ color: "#E8192C" }}>4WD</span><br />Club
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 10, fontWeight: 300, letterSpacing: "0.05em" }}>Race. Tune. Compete.</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 32 }}>
          {(["register", "login"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "12px 24px", cursor: "pointer", color: tab === t ? "#fff" : "rgba(255,255,255,0.45)", borderBottom: `2px solid ${tab === t ? "#E8192C" : "transparent"}`, marginBottom: -1, background: "none", borderTop: "none", borderLeft: "none", borderRight: "none" }}>
              {t === "register" ? "Register" : "Member Login"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.3)", borderRadius: 4, padding: "10px 14px", fontFamily: "'Barlow', sans-serif", fontSize: 13, color: "#E8192C", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* REGISTER FORM */}
        {tab === "register" && (
          <form onSubmit={handleRegister}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>Create Your Account</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="form-grid">
              <div>
                <label style={label}>Full Name</label>
                <input style={inp} type="text" placeholder="Takeshi Nagano" value={reg.name} onChange={e => setReg({ ...reg, name: e.target.value })} required />
              </div>
              <div>
                <label style={label}>Phone</label>
                <input style={inp} type="tel" placeholder="+299 00 00 00" value={reg.phone} onChange={e => setReg({ ...reg, phone: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>Email</label>
                <input style={inp} type="email" placeholder="you@example.com" value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} required />
              </div>
              <div>
                <label style={label}>Nationality</label>
                <select style={{ ...inp, WebkitAppearance: "none" }} value={reg.nationality} onChange={e => setReg({ ...reg, nationality: e.target.value })}>
                  <option value="">Select...</option>
                  <option>Greenlandic</option>
                  <option>Danish</option>
                  <option>Japanese</option>
                  <option>Filipino</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={label}>City</label>
                <input style={inp} type="text" placeholder="Nuuk" value={reg.city} onChange={e => setReg({ ...reg, city: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>Password</label>
                <input style={inp} type="password" placeholder="Create a password" value={reg.password}
                  onChange={e => { setReg({ ...reg, password: e.target.value }); setPwScore(getPasswordStrength(e.target.value)); }} required />
                <div style={{ height: 2, borderRadius: 2, background: "rgba(255,255,255,0.1)", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pwScore}%`, background: strengthColor(pwScore), transition: "width 0.3s, background 0.3s", borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: "100%", marginTop: 8, padding: "15px", background: "#E8192C", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", border: "none", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "JOINING..." : "JOIN THE CLUB — FREE"}
            </button>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 12 }}>No fees. No spam. Pure racing.</div>
          </form>
        )}

        {/* LOGIN FORM */}
        {tab === "login" && (
          <form onSubmit={handleLogin}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>Welcome Back</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 8 }}>
              <div>
                <label style={label}>Email</label>
                <input style={inp} type="email" placeholder="you@example.com" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} required />
              </div>
              <div>
                <label style={label}>Password</label>
                <input style={inp} type="password" placeholder="Your password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required />
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: "100%", marginTop: 16, padding: "15px", background: "#E8192C", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", border: "none", borderRadius: 4, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "LOGGING IN..." : "LOGIN TO DASHBOARD"}
            </button>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 12 }}>
              No account yet?{" "}
              <button type="button" onClick={() => setTab("register")} style={{ color: "#E8192C", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Register free</button>
            </div>
          </form>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 32, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { value: "120+", label: "Members" },
            { value: "48", label: "Races Held" },
            { value: "Free", label: "To Join" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @media (max-width: 768px) {
          .register-grid {
            grid-template-columns: 1fr !important;
          }
          .car-col {
            height: 220px !important;
          }
          .slash { display: none !important; }
          .featured-tag { display: none !important; }
          .form-col {
            padding: 40px 24px 48px !important;
          }
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
        select option { background: #12161f; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}