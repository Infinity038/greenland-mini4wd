"use client";
import { useEffect, useState } from "react";
import { isRegistered } from "@/lib/member";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function JoinCTA() {
  const [registered, setRegistered] = useState(false);
  useEffect(() => { setRegistered(isRegistered()); }, []);

  if (registered) return (
    <section style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "64px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: "#FACC15", marginBottom: 12 }}>YOU'RE A MEMBER</div>
        <h2 style={{ ...F, fontWeight: 900, fontSize: "clamp(32px,6vw,56px)", color: "#F5F5F5", marginBottom: 28, lineHeight: 1 }}>
          WHAT'S<br /><span style={{ color: "#DC2626" }}>NEXT?</span>
        </h2>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/shop" style={{ background: "#DC2626", color: "#fff", padding: "13px 26px", borderRadius: 8, ...F, fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none" }}>SHOP NOW</a>
          <a href="/tickets" style={{ background: "#FACC15", color: "#050505", padding: "13px 26px", borderRadius: 8, ...F, fontWeight: 900, fontSize: 15, letterSpacing: 2, textDecoration: "none" }}>{FEATURE_FLAGS.onlineRaceTicketsEnabled ? "🎟️ BUY TICKETS" : "🏁 RACE DAY"}</a>
          <a href="/tournament" style={{ background: "transparent", color: "#F5F5F5", padding: "13px 26px", borderRadius: 8, ...F, fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)" }}>TOURNAMENTS</a>
          <a href="/profile" style={{ background: "transparent", color: "#FACC15", padding: "13px 26px", borderRadius: 8, ...F, fontWeight: 700, fontSize: 15, letterSpacing: 2, textDecoration: "none", border: "1px solid rgba(250,204,21,0.3)" }}>MY PROFILE</a>
        </div>
      </div>
    </section>
  );

  // Not registered — dark theme CTA, no red footer look
  return (
    <section id="register" style={{ background: "#050505", borderTop: "1px solid rgba(220,38,38,0.2)", padding: "80px 24px", position: "relative", overflow: "hidden" }}>
      {/* Subtle grid overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(220,38,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <p style={{ ...F, fontSize: 12, fontWeight: 600, color: "#DC2626", letterSpacing: 5, marginBottom: 16 }}>FREE TO JOIN</p>
        <h2 style={{ ...F, fontWeight: 900, color: "#F5F5F5", fontSize: "clamp(42px,9vw,76px)", lineHeight: 0.95, marginBottom: 24 }}>
          READY TO JOIN<br /><span style={{ color: "#DC2626" }}>THE CLUB?</span>
        </h2>
        <p style={{ ...FB, color: "#B8C1CC", fontSize: 16, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
          Become a founding member of Greenland's first Mini 4WD racing community.
        </p>
        <a href="/register" style={{ display: "inline-block", background: "#DC2626", color: "#fff", padding: "16px 40px", borderRadius: 8, ...F, fontWeight: 900, fontSize: 18, letterSpacing: 3, textDecoration: "none" }}>
          JOIN NOW →
        </a>
        <p style={{ ...FB, fontSize: 12, color: "#6B7280", marginTop: 16 }}>Free membership · No spam · Unsubscribe anytime</p>
      </div>
    </section>
  );
}