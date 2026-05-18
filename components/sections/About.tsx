const VALUES = [
  { icon: "🏎️", title: "Race Together", desc: "Monthly races and open track days for all skill levels in Nuuk." },
  { icon: "🔧", title: "Build & Learn", desc: "Hands-on workshops on tuning, building, and upgrading your car." },
  { icon: "🤝", title: "Real Community", desc: "A welcoming space for OFWs and Greenlandic locals to connect." },
  { icon: "🏆", title: "Compete & Grow", desc: "Season rankings, leaderboards, and championship events." },
];

export default function About() {
  return (
    <section id="about" style={{ background: "#071426", padding: "80px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 12, fontWeight: 600 }}>OUR STORY</div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(36px, 6vw, 58px)", lineHeight: 0.95, color: "#F5F5F5", marginBottom: 20 }}>
            MORE THAN<br /><span style={{ color: "#DC2626" }}>JUST RACING</span>
          </h2>
          <p style={{ color: "#B8C1CC", lineHeight: 1.7, marginBottom: 16, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            Far from home, we found something unexpected: community. Greenland Mini 4WD Club started as a small gathering of Filipinos in Nuuk who wanted a clean, fun hobby outside of work — and it grew into something much bigger.
          </p>
          <p style={{ color: "#B8C1CC", lineHeight: 1.7, marginBottom: 28, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            We welcome everyone — OFWs, Greenlandic locals, beginners, and seasoned racers alike. If you love Tamiya cars or just want to try something new, you belong here.
          </p>
          <a href="/register" style={{ display: "inline-block", background: "#DC2626", color: "#fff", padding: "12px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 3 }}>
            BECOME A MEMBER
          </a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {VALUES.map((v) => (
            <div key={v.title} style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 20px" }}>
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{v.icon}</span>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: "#F5F5F5", marginBottom: 4 }}>{v.title}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", lineHeight: 1.6 }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}