"use client";
import { useEffect, useState } from "react";
import { isRegistered } from "@/lib/member";

const STATS = [
  { value: "42+", label: "Members", red: true },
  { value: "8", label: "Races Run", red: false },
  { value: "3", label: "Cities", red: false },
  { value: "2026", label: "Season", red: false },
];

export default function Hero() {
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    setRegistered(isRegistered());
  }, []);

  return (
    <section style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60, overflow: "hidden", position: "relative" }}>

      {/* Real background image */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('/IMG_5374.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: 0.18,
      }} />

      {/* Dark overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0.4) 50%, rgba(5,5,5,0.95) 100%)" }} />

      {/* Grid pattern */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(220,38,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Red glow */}
      <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 20px", maxWidth: 700, width: "100%" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, background: "#DC2626", borderRadius: "50%", display: "inline-block" }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 10, color: "#FACC15", letterSpacing: 4 }}>GREENLAND'S PREMIER TAMIYA COMMUNITY</span>
        </div>

        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(64px, 14vw, 120px)", lineHeight: 0.9, color: "#F5F5F5", marginBottom: 20 }}>
          RACE.<br /><span style={{ color: "#DC2626" }}>CONNECT.</span><br />BUILD.
        </h1>

        <p style={{ color: "#B8C1CC", fontSize: 16, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 28px", fontFamily: "'DM Sans', sans-serif" }}>
          Greenland Mini 4WD Club — a passionate Tamiya racing community for Filipinos and locals in Nuuk, built for speed, craft, and real connection.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto 40px" }}>
          {registered ? (
            <>
              <a href="/shop" style={{ display: "block", background: "#DC2626", color: "#fff", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 3, textAlign: "center", textDecoration: "none" }}>GO TO SHOP →</a>
              <a href="/tournament" style={{ display: "block", border: "1px solid rgba(220,38,38,0.4)", color: "#F5F5F5", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 3, textAlign: "center", textDecoration: "none" }}>VIEW TOURNAMENTS →</a>
              <a href="/profile" style={{ display: "block", border: "1px solid rgba(255,255,255,0.15)", color: "#B8C1CC", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 3, textAlign: "center", textDecoration: "none" }}>MY PROFILE →</a>
            </>
          ) : (
            <>
              <a href="/register" style={{ display: "block", background: "#DC2626", color: "#fff", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 3, textAlign: "center", textDecoration: "none" }}>JOIN THE CLUB FREE →</a>
              <a href="#events" style={{ display: "block", border: "1px solid rgba(255,255,255,0.2)", color: "#F5F5F5", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 3, textAlign: "center", textDecoration: "none" }}>SEE EVENTS →</a>
            </>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", padding: "16px 8px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, lineHeight: 1, color: s.red ? "#DC2626" : "#F5F5F5" }}>{s.value}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#B8C1CC", letterSpacing: 3, marginTop: 4, textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}