"use client";
import { useState } from "react";
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
      setErrorMsg("Please fill in your first name, last name, and email.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    try {
      const { error } = await supabase.from("members").insert([{
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
        nationality: form.nationality || null,
        city: form.city || null,
        experience: form.experience || null,
      }]);

      if (error) {
        console.error("Supabase error:", error);
        setStatus("error");
        setErrorMsg(`Error: ${error.message}`);
      } else {
        document.cookie = "gm4wd_registered=1; path=/; max-age=31536000; SameSite=Lax";
        setStatus("success");
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setStatus("error");
      setErrorMsg("Unexpected error. Check console.");
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
        style={{ width: "100%", background: "#0D1B2A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "14px 16px", color: "#F5F5F5", fontSize: 16, outline: "none", boxSizing: "border-box" as const }}
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
          Welcome to Greenland Mini 4WD Club.<br />You now have full access to the site.
        </p>
        <p style={{ color: "#B8C1CC", fontSize: 14, maxWidth: 400, margin: "0 auto 32px", fontFamily: "'DM Sans', sans-serif" }}>
          Join our Facebook Group for race announcements and community discussions.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, margin: "0 auto" }}>
          <a href="/" style={{ display: "block", background: "#DC2626", color: "#fff", padding: "14px