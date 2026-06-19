const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function About() {
  return (
    <>
      {/* MISSION */}
      <section style={{ background: "#050505", padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 8 }}>WHY WE EXIST</div>
          <h2 style={{ ...F, fontWeight: 900, fontSize: "clamp(28px,5vw,48px)", color: "#F5F5F5", margin: 0 }}>OUR MISSION</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 24 }}>
          {[
            { icon: "🏁", title: "Our Mission", img: "/IMG_5376.png", text: "To create a welcoming racing community in Greenland where Filipinos, locals, and hobbyists can connect, compete, and grow together." },
            { icon: "🤝", title: "Community First", img: "/IMG_5377.png", text: "We are more than a racing club. We are a family. Every member — beginner or veteran — is valued and supported on and off the track." },
            { icon: "🌍", title: "Why Greenland", img: "/IMG_5378.png", text: "Nuuk is home to a growing Filipino community. We wanted to give everyone a positive, fun hobby outside of work and everyday life." },
          ].map(item => (
            <div key={item.title} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ height: 180, overflow: "hidden", position: "relative" }}>
                <img src={item.img} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.85 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, #071426 100%)" }} />
              </div>
              <div style={{ padding: "24px 24px 28px" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ ...F, fontSize: 22, fontWeight: 700, marginBottom: 10, color: "#F5F5F5" }}>{item.title}</h3>
                <p style={{ ...FB, color: "#B8C1CC", lineHeight: 1.7, fontSize: 14, margin: 0 }}>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER STORY */}
      <section style={{ background: "#071426", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 12 }}>FOUNDER</div>
            <h2 style={{ ...F, fontWeight: 900, fontSize: "clamp(28px,5vw,48px)", color: "#F5F5F5", marginBottom: 20, lineHeight: 1 }}>THE ARCTIC HUSTLE</h2>
            <p style={{ ...FB, color: "#B8C1CC", lineHeight: 1.8, fontSize: 15, marginBottom: 16 }}>
              Started by a Filipino entrepreneur living in Nuuk, Greenland Mini 4WD Club is part of The Arctic Hustle — a content and community brand documenting life, business, and culture in the world's most remote capital.
            </p>
            <p style={{ ...FB, color: "#B8C1CC", lineHeight: 1.8, fontSize: 15, marginBottom: 24 }}>
              The idea was simple: create something real and fun for the community. Mini 4WD is the perfect hobby — affordable, exciting, and something you can build with your hands.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Instagram", href: "https://www.instagram.com/thearctichustle" },
                { label: "TikTok", href: "https://www.tiktok.com/@the.arctic.hustle" },
                { label: "YouTube", href: "https://youtube.com/@thearctichustle-038" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 16px", ...F, fontSize: 12, color: "#F5F5F5", textDecoration: "none", letterSpacing: 1 }}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(220,38,38,0.2)", aspectRatio: "4/3" }}>
            <img src="/IMG_5374.png" alt="The Arctic Hustle" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section style={{ background: "#050505", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ ...F, fontSize: 11, letterSpacing: 5, color: "#DC2626", marginBottom: 12 }}>THE TEAM</div>
            <h2 style={{ ...F, fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "#F5F5F5", margin: 0 }}>WHO WE ARE</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 16 }}>
            {[
              { name: "Jovannie", role: "Founder & Club President", flag: "🇵🇭" },
              { name: "TBA", role: "Race Director", flag: "🏁" },
              { name: "TBA", role: "Events Coordinator", flag: "🎯" },
              { name: "TBA", role: "Social Media", flag: "📱" },
            ].map(member => (
              <div key={member.name} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{member.flag}</div>
                <div style={{ ...F, fontSize: 20, fontWeight: 700, color: "#F5F5F5" }}>{member.name}</div>
                <div style={{ ...FB, fontSize: 12, color: "#DC2626", marginTop: 6 }}>{member.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: "#071426", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 16, textAlign: "center" }}>
          {[
            { number: "2026", label: "Year Founded" },
            { number: "Nuuk", label: "Based In" },
            { number: "🇵🇭🇬🇱", label: "Community" },
            { number: "∞", label: "Fun Ahead" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#050505", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 16px" }}>
              <div style={{ ...F, fontSize: 36, fontWeight: 900, color: "#DC2626" }}>{stat.number}</div>
              <div style={{ ...F, fontSize: 10, color: "#B8C1CC", marginTop: 8, letterSpacing: 3 }}>{stat.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}