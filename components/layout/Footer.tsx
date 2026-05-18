const FOOTER_LINKS = {
  Club: ["About", "Events", "Gallery", "Blog"],
  Join: ["Register", "Membership", "Shop", "Contact"],
};

const SOCIAL = [
  { name: "Facebook", icon: "📘", href: "#" },
  { name: "Instagram", icon: "📷", href: "#" },
  { name: "TikTok", icon: "🎵", href: "#" },
  { name: "YouTube", icon: "▶️", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-[#0B1220] border-t border-white/5 px-5 pt-12 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="font-black text-white text-xl tracking-wide leading-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>GREENLAND</div>
            <div className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mt-0.5 mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>MINI 4WD CLUB</div>
            <p className="text-sm text-blue-300 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Greenland's premier Tamiya racing community. Race. Connect. Build.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([col, links]) => (
            <div key={col}>
              <div className="text-xs font-bold text-blue-300 tracking-[0.2em] mb-4"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{col.toUpperCase()}</div>
              {links.map((link) => (
                <a key={link} href="#"
                  className="block text-sm text-blue-300 hover:text-white no-underline mb-2.5 transition-colors duration-200"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>{link}</a>
              ))}
            </div>
          ))}

          <div>
            <div className="text-xs font-bold text-blue-300 tracking-[0.2em] mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>FOLLOW US</div>
            {SOCIAL.map((s) => (
              <a key={s.name} href={s.href}
                className="flex items-center gap-2.5 text-sm text-blue-300 hover:text-white no-underline mb-2.5 transition-colors duration-200"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <span>{s.icon}</span>{s.name}
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between gap-3">
          <p className="text-xs text-blue-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            © 2026 Greenland Mini 4WD Club. All rights reserved.
          </p>
          <p className="text-xs text-blue-300" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Made with ❤️ for the community in Nuuk, Greenland
          </p>
        </div>
      </div>
    </footer>
  );
}
