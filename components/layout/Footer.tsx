const LINKS = {
  Club: [
    { label: "About", href: "/about" },
    { label: "Events", href: "/events" },
    { label: "Gallery", href: "/gallery" },
    { label: "Blog", href: "/blog" },
  ],
  Join: [
    { label: "How to Join", href: "/how-to-join" },
    { label: "Register", href: "/register" },
    { label: "Membership", href: "/register" },
    { label: "Shop", href: "/shop" },
  ],
};

const SOCIAL = [
  { name: "Facebook", icon: "📘", href: "https://www.facebook.com/share/188c7YeqHT/?mibextid=wwXIfr" },
  { name: "Instagram", icon: "📷", href: "https://www.instagram.com/thearctichustle" },
  { name: "TikTok", icon: "🎵", href: "https://www.tiktok.com/@the.arctic.hustle" },
  { name: "YouTube", icon: "▶️", href: "https://youtube.com/@thearctichustle-038" },
];

export default function Footer() {
  return (
    <footer style={{ background: "#071426", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "48px 20px 28px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, marginBottom: 40 }}>
          <div style={{ gridColumn: "span 1" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#F5F5F5", fontSize: 18, letterSpacing: 2 }}>GREENLAND</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, color: "#DC2626", fontSize: 10, letterSpacing: 4, marginTop: 2, marginBottom: 12 }}>MINI 4WD CLUB</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", lineHeight: 1.6 }}>Greenland's premier Tamiya racing community. Race. Connect. Build.</p>
          </div>

          {Object.entries(LINKS).map(([col, links]) => (
            <div key={col}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: "#B8C1CC", letterSpacing: 3, marginBottom: 14 }}>{col.toUpperCase()}</div>
              {links.map((link) => (
                <a key={link.label} href={link.href} style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", marginBottom: 10 }}>{link.label}</a>
              ))}
            </div>
          ))}

          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: "#B8C1CC", letterSpacing: 3, marginBottom: 14 }}>FOLLOW US</div>
            {SOCIAL.map((s) => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#B8C1CC", marginBottom: 10 }}>
                <span>{s.icon}</span>{s.name}
              </a>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B8C1CC" }}>© 2026 Greenland Mini 4WD Club. All rights reserved.</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B8C1CC" }}>Made with ❤️ for the community in Nuuk, Greenland</p>
        </div>
      </div>
    </footer>
  );
}