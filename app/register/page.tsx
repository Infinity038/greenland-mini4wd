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
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");

  const handle = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    setStatus("loading");
    const { error } = await supabase.from("members").insert([form]);
    setStatus(error ? "error" : "success");
  };

  const field = (label: string, name: string, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#B8C1CC", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {label.toUpperCase()}
      </label>
      <input
        type={type} name={name} placeholder={placeholder}
        value={(form as any)[name]} onChange={handle}
        style={{ width: "100%", background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "14px 16px", color: "#F5F5F5", fontSize: 16, outline: "none" }}
      />
    </div>
  );

  if (status === "success") return (
    <>
      <Navbar />
      <main style={{ background: "#050505", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🏁</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 56, fontWeight: 900, color: "#F5F5F5", marginBottom: 16 }}>
            YOU'RE <span style={{ color: "#DC2626" }}>IN!</span>
          </h1>
          <p style={{ color: "#B8C1CC", fontSize: 18, marginBottom: 8 }}>Welcome to Greenland Mini 4WD Club.</p>
          <p style={{ color: "#B8C1CC", fontSize: 15, maxWidth: 420, margin: "0 auto 32px" }}>You can now access community track sessions and sign up for tournaments. Watch for announcements in our Facebook Group.</p>
          <a href="https://www.facebook.com/share/g/18gBxyY1Wd/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", background: "#DC2626", color: "#fff", padding: "14px 36px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 2, textDecoration: "none" }}>
            JOIN FACEBOOK GROUP →
          </a>
        </div>
      </main>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", padding: "100px 24px 80px" }}>
        <div style={{ maxWidth: 580, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 12 }}>FREE · REQUIRED · ONE-TIME</div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(40px, 8vw, 64px)", fontWeight: 900, color: "#F5F5F5", lineHeight: 1 }}>
              BECOME A<br /><span style={{ color: "#DC2626" }}>MEMBER</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#B8C1CC", marginTop: 16, lineHeight: 1.6 }}>
              Registration is free and required before you can use the community track, join tournaments, or buy race tickets.
            </p>
          </div>

          {/* What you get */}
          <div style={{ background: "#071426", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 36 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 4, color: "#FACC15", marginBottom: 14 }}>MEMBERSHIP INCLUDES</div>
            {[
              "Access to community track sessions",
              "Eligibility to enter tournaments (tickets sold separately)",
              "Club announcements and race schedules",
              "Access to buy/sell/trade within the community",
              "Rankings and race history tracking",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#DC2626", fontWeight: 700, marginTop: 2 }}>→</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          {field("First Name", "first_name", "text", "Juan")}
          {field("Last Name", "last_name", "text", "dela Cruz")}
          {field("Email", "email", "email", "juan@email.com")}
          {field("Phone", "phone", "tel", "+299 000 000")}
          {field("Nationality", "nationality", "text", "Filipino")}
          {field("City", "city", "text", "Nuuk")}

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#B8C1CC", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>
              EXPERIENCE LEVEL
            </label>
            <select
              name="experience" value={form.experience} onChange={handle}
              style={{ width: "100%", background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "14px 16px", color: "#F5F5F5", fontSize: 16 }}
            >
              <option value="">Select your level</option>
              <option value="beginner">Beginner — Never built one</option>
              <option value="intermediate">Intermediate — Built a few</option>
              <option value="advanced">Advanced — Regular racer</option>
            </select>
          </div>

          <div style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 8, padding: "14px 18px", marginBottom: 28 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FACC15", margin: 0, lineHeight: 1.6 }}>
              ⚠️ By registering, you agree to follow all club rules and official announcements. Race tickets are purchased separately per tournament.
            </p>
          </div>

          {status === "error" && (
            <p style={{ color: "#ff4444", marginBottom: 16, textAlign: "center" }}>Something went wrong. Try again.</p>
          )}

          <button
            onClick={submit} disabled={status === "loading"}
            style={{ width: "100%", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "18px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}
          >
            {status === "loading" ? "SUBMITTING..." : "REGISTER FREE →"}
          </button>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", textAlign: "center", marginTop: 12 }}>Free. No credit card. Takes under 2 minutes.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}