const POSTS = [
  { id: 1, tag: "NEWS",  date: "May 10, 2026", emoji: "📢", bg: "linear-gradient(135deg,#3b0000,#1a0000)", title: "Club Membership Now Open for 2026 Season", excerpt: "We're officially opening registration for our growing Nuuk community. First 50 members get a free starter kit and club sticker." },
  { id: 2, tag: "GUIDE", date: "May 3, 2026",  emoji: "🔧", bg: "linear-gradient(135deg,#001a3b,#00082b)", title: "Choosing Your First Mini 4WD: A Beginner's Guide", excerpt: "Not sure where to start? We break down the best entry-level Tamiya kits for new racers joining us here in Greenland." },
];

export default function Blog() {
  return (
    <section id="blog" style={{ background: "#F3F4F6", padding: "80px 20px" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 48 }}>
          <div>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 600, color: "#D01B1B", letterSpacing: "0.3em", marginBottom: 8 }}>LATEST</p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#111827", lineHeight: 1, margin: 0, fontSize: "clamp(38px, 6vw, 58px)" }}>NEWS &amp;<br />UPDATES</h2>
          </div>
          <a href="/blog" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "#D01B1B", letterSpacing: "0.2em", textDecoration: "none" }}>ALL POSTS →</a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {POSTS.map(post => (
            <article key={post.id} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
              <div style={{ height: 160, background: post.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                {post.emoji}
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#FACC15", background: "rgba(250,204,21,0.1)", padding: "2px 10px", borderRadius: 20 }}>{post.tag}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6B7280" }}>{post.date}</span>
                </div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: "#111827", lineHeight: 1.2, marginBottom: 12 }}>{post.title}</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#4B5563", lineHeight: 1.6, marginBottom: 16 }}>{post.excerpt}</p>
                <a href="/blog" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, color: "#D01B1B", letterSpacing: "0.2em", textDecoration: "none" }}>READ MORE →</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}