export default function RegisterFirst() {
  return (
    <section style={{ background: "#071426", padding: "80px 24px", borderTop: "1px solid rgba(220,38,38,0.2)", borderBottom: "1px solid rgba(220,38,38,0.2)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 5, color: "#DC2626", marginBottom: 12 }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(36px, 6vw, 64px)", color: "#F5F5F5", lineHeight: 1 }}>
            REGISTER FIRST.<br /><span style={{ color: "#DC2626" }}>RACE AFTER.</span>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#B8C1CC", marginTop: 16, maxWidth: 560, margin: "16px auto 0" }}>
            Registration is free and required before anyone can use the track, join tournaments, or buy race tickets. One-time sign-up, lifetime community access.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginBottom: 48 }}>
          {[
            { step: "01", title: "Register Free", desc: "Sign up once. No payment needed. Instant community membership.", color: "#DC2626" },
            { step: "02", title: "Join the Community", desc: "Access track sessions, club discussions, beginner guides, and events.", color: "#FACC15" },
            { step: "03", title: "Buy Race Tickets", desc: "Enter tournaments by purchasing race tickets. Separate from registration.", color: "#DC2626" },
            { step: "04", title: "Race & Win", desc: "Compete, earn rankings, and win from the prize pool. Registered members only.", color: "#FACC15" },
          ].map((s) => (
            <div key={s.step} style={{ background: "#050505", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 24px" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 40, color: s.color, opacity: 0.3, lineHeight: 1, marginBottom: 8 }}>{s.step}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: "#F5F5F5", letterSpacing: 1, marginBottom: 10 }}>{s.title}</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { icon: "✅", text: "Registration is 100% free" },
            { icon: "🏁", text: "Required before track use or race entry" },
            { icon: "🎟️", text: "Race tickets sold separately per tournament" },
            { icon: "🏠", text: "House cars available for demo/first-try sessions" },
            { icon: "📋", text: "Members must follow club rules and announcements" },
            { icon: "🌍", text: "Open to Filipinos, locals, and all nationalities" },
          ].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "14px 18px" }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC" }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <a href="/register" style={{ display: "inline-block", background: "#DC2626", color: "#fff", padding: "16px 48px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: 3, textDecoration: "none" }}>
            REGISTER FREE NOW →
          </a>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", marginTop: 12 }}>No payment required. Takes less than 2 minutes.</p>
        </div>
      </div>
    </section>
  );
}