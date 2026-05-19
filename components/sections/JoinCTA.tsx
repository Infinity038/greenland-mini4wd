"use client";
import { useEffect, useState } from "react";
import { isRegistered } from "@/lib/member";

export default function JoinCTA() {
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    setRegistered(isRegistered());
  }, []);

  if (registered) return (
    <section style={{ background: "#071426", borderTop: "1px solid rgba(220,38,38,0.2)", padding: "64px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#FACC15", marginBottom: 12 }}>YOU'RE A MEMBER</div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(32px, 6vw, 56px)", color: "#F5F5F5", marginBottom: 24, lineHeight: 1 }}>
          WHAT'S<br /><span style={{ color: "#DC2626" }}>NEXT?</span>
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/shop" style={{ background: "#DC2626", color: "#fff", padding: "14px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none" }}>SHOP NOW</a>
          <a href="/tournaments" style={{ background: "transparent", color: "#F5F5F5", padding: "14px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>TOURNAMENTS</a>
          <a href="/profile" style={{ background: "transparent", color: "#FACC15", padding: "14px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(250,204,21,0.3)" }}>MY PROFILE</a>
        </div>
      </div>
    </section>
  );

  return (
    <section id="register" style={{ background: "#DC2626", padding: "80px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 5, marginBottom: 16 }}>FREE TO JOIN</p>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#fff", fontSize: "clamp(42px, 9vw, 76px)", lineHeight: 0.95, marginBottom: 24 }}>
          START YOUR<br />RACING JOURNEY
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
          Join the Greenland Mini 4WD Club today. Get event updates, connect with members, and be part of something fast, fun, and real.
        </p>
        <a href="/register" style={{ display: "inline-block", background: "#050505", color: "#fff", padding: "16px 40px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 3, textDecoration: "none" }}>
          JOIN NOW — IT'S FREE →
        </a>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>Free membership · No spam · Unsubscribe anytime</p>
      </div>
    </section>
  );
}