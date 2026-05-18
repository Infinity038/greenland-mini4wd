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
      <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#aaa", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {label.toUpperCase()}
      </label>
      <input
        type={type} name={name} placeholder={placeholder}
        value={(form as any)[name]} onChange={handle}
        style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "14px 16px", color: "#fff", fontSize: 16, outline: "none" }}
      />
    </div>
  );

  if (status === "success") return (
    <>
      <Navbar />
      <main style={{ background: "#0D0D0D", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🏁</div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 56, fontWeight: 900, color: "#fff", marginBottom: 16 }}>
            YOU'RE <span style={{ color: "#D01B1B" }}>IN!</span>
          </h1>
          <p style={{ color: "#aaa", fontSize: 18 }}>Welcome to Greenland Mini 4WD Club. We'll be in touch soon.</p>
        </div>
      </main>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar />
      <main style={{ background: "#0D0D0D", color: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 13, letterSpacing: 4, color: "#D01B1B", marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
              JOIN THE CLUB
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(40px, 8vw, 64px)", fontWeight: 900 }}>
              BECOME A<br /><span style={{ color: "#D01B1B" }}>MEMBER</span>
            </h1>
          </div>

          {field("First Name", "first_name", "text", "Juan")}
          {field("Last Name", "last_name", "text", "dela Cruz")}
          {field("Email", "email", "email", "juan@email.com")}
          {field("Phone", "phone", "tel", "+299 000 000")}
          {field("Nationality", "nationality", "text", "Filipino")}
          {field("City", "city", "text", "Nuuk")}

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#aaa", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>
              EXPERIENCE LEVEL
            </label>
            <select
              name="experience" value={form.experience} onChange={handle}
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "14px 16px", color: "#fff", fontSize: 16 }}
            >
              <option value="">Select your level</option>
              <option value="beginner">Beginner — Never built one</option>
              <option value="intermediate">Intermediate — Built a few</option>
              <option value="advanced">Advanced — Regular racer</option>
            </select>
          </div>

          {status === "error" && (
            <p style={{ color: "#ff4444", marginBottom: 16, textAlign: "center" }}>Something went wrong. Try again.</p>
          )}

          <button
            onClick={submit} disabled={status === "loading"}
            style={{ width: "100%", background: "#D01B1B", color: "#fff", border: "none", borderRadius: 8, padding: "18px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}
          >
            {status === "loading" ? "SUBMITTING..." : "JOIN NOW →"}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}