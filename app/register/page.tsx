"use client";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", nationality: "", city: "", experience: ""
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setErrorMsg("Please fill in at least your name and email.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const { error } = await supabase.from("members").insert([form]);
    if (error) {
      setStatus("error");
      setErrorMsg("Something went wrong. Try again.");
    } else {
      // Set cookie for 1 year
      document.cookie = "gm4wd_registered=1; path=/; max-age=31536000; SameSite=Lax";
      setStatus("success");
    }
  };

  const field = (label: string, name: string, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#B8C1CC", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {label.toUpperCase()}
      </label>
      <input
        type={type} name={name} placeholder={placeholder}
        value={(form as any)[name]} onChange={handle}
        style={{ width: "100%", background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "14px 16px", color: "#F5F5F5", fontSize: 16, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );

  if (status === "success") return (
    <div style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🏁</div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 56, fontWeight: 900, color: "#F5F5F5", marginBottom: 16, lineHeight: 1 }}>
          YOU'RE <span style={{ color: "#DC2626" }}>IN!</span>
        </h1>
        <p style={{ color: "#B8C1CC", fontSize: 16, marginBottom: 8, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
          Welcome to Greenland Mini 4WD Club.<br />
          You now have full access to the site.
        </p>
        <p style={{ color: "#B8C1CC", fontSize: 14, maxWidth: 400, margin: "0 auto 32px", fontFamily: "'DM Sans', sans-serif" }}>
          Join our Facebook Group for race announcements, event schedules, and community discussions.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, margin: "0 auto" }}>
          <a href="/" style={{ display: "block", background: "#DC2626", color: "#fff", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 2, textDecoration: "none", textAlign: "center" }}>
            ENTER THE SITE →
          </a>
          <a href="https://www.facebook.com/share/g/18gBxyY1Wd/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer"
            style={{ display: "block", background: "transparent", color: "#F5F5F5", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
            JOIN FACEBOOK GROUP
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#050505", minHeight: "100vh", color: "#F5F5F5" }}>
      {/* Hero gate header */}
      <div style={{ background: "#071426", borderBottom: "1px solid rgba(220,38,38,0.2)", padding: "48px 24px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, background: "#DC2626", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#fff", fontSize: 16 }}>4W</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#F5F5F5", fontSize: 18, lineHeight: 1, letterSpacing: 2 }}>GREENLAND</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, color: "#FACC15", fontSize: 10, letterSpacing: 4, lineHeight: 1, marginTop: 2 }}>MINI 4WD CLUB</div>
            </div>
          </div>

          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 12 }}>FREE · REQUIRED · ONE-TIME</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(36px, 8vw, 68px)", fontWeight: 900, color: "#F5F5F5", lineHeight: 1, marginBottom: 16 }}>
            REGISTER TO<br /><span style={{ color: "#DC2626" }}>ACCESS THE SITE</span>
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            Greenland's premier Tamiya Mini 4WD racing community. Registration is free and only takes 2 minutes. Required before accessing any part of the site.
          </p>

          {/* Quick badges */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
            {["✅ Free forever", "🏁 Track access", "🎟️ Race tournaments", "🏆 Win prize pools"].map(b => (
              <span key={b} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "5px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B8C1CC" }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: "48px 24px 80px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          {field("First Name *", "first_name", "text", "Juan")}
          {field("Last Name *", "last_name", "text", "dela Cruz")}
          {field("Email *", "email", "email", "juan@email.com")}
          {field("Phone", "phone", "tel", "+299 000 000")}
          {field("Nationality", "nationality", "text", "Filipino")}
          {field("City / Town", "city", "text", "Nuuk")}

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#B8C1CC", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>
              EXPERIENCE LEVEL
            </label>
            <select
              name="experience" value={form.experience} onChange={handle}
              style={{ width: "100%", background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "14px 16px", color: form.experience ? "#F5F5F5" : "#6B7280", fontSize: 16 }}
            >
              <option value="">Select your level</option>
              <option value="beginner">Beginner — Never built one</option>
              <option value="intermediate">Intermediate — Built a few</option>
              <option value="advanced">Advanced — Regular racer</option>
            </select>
          </div>

          <div style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 8, padding: "14px 18px", marginBottom: 28 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FACC15", margin: 0, lineHeight: 1.6 }}>
              ⚠️ By registering, you agree to follow club rules and announcements. Race tickets are purchased separately per tournament.
            </p>
          </div>

          {errorMsg && (
            <p style={{ color: "#ff4444", marginBottom: 16, textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>{errorMsg}</p>
          )}

          <button
            onClick={submit} disabled={status === "loading"}
            style={{ width: "100%", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "18px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}
          >
            {status === "loading" ? "REGISTERING..." : "REGISTER FREE & ENTER SITE →"}
          </button>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", textAlign: "center", marginTop: 12 }}>
            Already registered?{" "}
            <button onClick={() => { document.cookie = "gm4wd_registered=1; path=/; max-age=31536000; SameSite=Lax"; window.location.href = "/"; }}
              style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, textDecoration: "underline" }}>
              Click here to enter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}