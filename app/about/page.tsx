import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "About — Greenland Mini 4WD Club",
  description: "Learn about Greenland's first Tamiya Mini 4WD racing community.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: "#0D0D0D", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>

        {/* HERO */}
        <section style={{ background: "#111", borderBottom: "3px solid #D01B1B", padding: "80px 24px 60px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: 13, letterSpacing: 4, color: "#D01B1B", marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif" }}>
              OUR STORY
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(40px, 8vw, 72px)", fontWeight: 900, lineHeight: 1, marginBottom: 24 }}>
              BUILT FOR THE<br /><span style={{ color: "#D01B1B" }}>LOVE OF RACING</span>
            </h1>
            <p style={{ fontSize: 18, color: "#aaa", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
              Greenland Mini 4WD Club was born from a simple idea — bring people together through the thrill of Tamiya racing in the Arctic.
            </p>
          </div>
        </section>

        {/* MISSION */}
        <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32 }}>
            {[
              { icon: "🏁", title: "Our Mission", text: "To create a welcoming racing community in Greenland where Filipinos, locals, and hobbyists can connect, compete, and grow together." },
              { icon: "🤝", title: "Community First", text: "We are more than a racing club. We are a family. Every member — beginner or veteran — is valued and supported." },
              { icon: "🌍", title: "Why Greenland", text: "Nuuk is home to a growing Filipino community. We wanted to give everyone a positive, fun hobby outside of work and everyday life." },
            ].map((item) => (
              <div key={item.title} style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 32 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{item.title}</h3>
                <p style={{ color: "#aaa", lineHeight: 1.7 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOUNDERS */}
        <section style={{ background: "#111", padding: "80px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 13, letterSpacing: 4, color: "#D01B1B", marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>THE TEAM</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900 }}>WHO WE ARE</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
              {[
                { name: "Jovannie", role: "Founder & Club President", flag: "🇵🇭" },
                { name: "TBA", role: "Race Director", flag: "🏁" },
                { name: "TBA", role: "Events Coordinator", flag: "🎯" },
                { name: "TBA", role: "Social Media", flag: "📱" },
              ].map((member) => (
                <div key={member.name} style={{ background: "#0D0D0D", border: "1px solid #222", borderRadius: 12, padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>{member.flag}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700 }}>{member.name}</div>
                  <div style={{ fontSize: 13, color: "#D01B1B", marginTop: 4 }}>{member.role}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ padding: "80px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24, textAlign: "center" }}>
            {[
              { number: "2026", label: "Year Founded" },
              { number: "Nuuk", label: "Based In" },
              { number: "🇵🇭🇬🇱", label: "Community" },
              { number: "∞", label: "Fun Ahead" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 32 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 40, fontWeight: 900, color: "#D01B1B" }}>{stat.number}</div>
                <div style={{ fontSize: 13, color: "#aaa", marginTop: 8, letterSpacing: 2 }}>{stat.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: "#D01B1B", padding: "60px 24px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900, marginBottom: 16 }}>
            READY TO JOIN THE CLUB?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: 32, fontSize: 18 }}>
            Become a founding member of Greenland's first Mini 4WD racing community.
          </p>
          <a href="/register" style={{ background: "#fff", color: "#D01B1B", padding: "16px 40px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, textDecoration: "none", letterSpacing: 2 }}>
            JOIN NOW
          </a>
        </section>

      </main>
      <Footer />
    </>
  );
}