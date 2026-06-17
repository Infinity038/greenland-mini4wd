"use client";
import { useState, useEffect } from "react";
import { isRegistered, getMemberData, logout } from "@/lib/member";

const NAV_LINKS = [{ label: "Leaderboard", href: "/leaderboard" },
  { label: "Cars", href: "/cars" },
  { label: "Tournament", href: "/tournament" },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

const MEMBER_LINKS = [
  { label: "👤 Profile", href: "/profile" },
  { label: "📦 My Orders", href: "/profile?tab=orders" },
  { label: "🎟️ Race Tickets", href: "/profile?tab=tickets" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    setRegistered(isRegistered());
    setMember(getMemberData());
  }, []);

  const firstName = member?.first_name || "Member";

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(5,5,5,0.97)", borderBottom: "1px solid rgba(220,38,38,0.3)" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 16px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 34, height: 34, background: "#DC2626", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#fff", fontSize: 14 }}>4W</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#F5F5F5", fontSize: 15, lineHeight: 1, letterSpacing: 2 }}>GREENLAND</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, color: "#FACC15", fontSize: 9, letterSpacing: 4, lineHeight: 1, marginTop: 2 }}>MINI 4WD CLUB</div>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 24 }}>
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: "#B8C1CC", letterSpacing: 3, textDecoration: "none" }}>
              {link.label}
            </a>
          ))}

          {registered ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen(!menuOpen)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#071426", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6, padding: "7px 14px", cursor: "pointer", color: "#F5F5F5" }}>
                <div style={{ width: 24, height: 24, background: "#DC2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 11, color: "#fff" }}>
                  {firstName[0].toUpperCase()}
                </div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: 2 }}>{firstName.toUpperCase()}</span>
                <span style={{ fontSize: 10, color: "#B8C1CC" }}>▼</span>
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#071426", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, minWidth: 180, overflow: "hidden", zIndex: 100 }}>
                  {MEMBER_LINKS.map(item => (
                    <a key={item.label} href={item.href}
                      style={{ display: "block", padding: "12px 18px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: "#F5F5F5", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", letterSpacing: 1 }}>
                      {item.label}
                    </a>
                  ))}
                  <button onClick={logout}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 18px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: "#DC2626", background: "none", border: "none", cursor: "pointer", letterSpacing: 1 }}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="/register"
              style={{ background: "#DC2626", color: "#fff", padding: "8px 18px", borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, textDecoration: "none" }}>
              JOIN FREE
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden"
          style={{ display: "flex", flexDirection: "column", gap: 5, padding: 8, background: "transparent", border: "none", cursor: "pointer" }}>
          <span style={{ display: "block", height: 3, width: 26, background: open ? "#DC2626" : "#F5F5F5", borderRadius: 2, transition: "all 0.2s", transform: open ? "rotate(45deg) translate(5px, 8px)" : "none" }} />
          <span style={{ display: "block", height: 3, width: 26, background: "#F5F5F5", borderRadius: 2, opacity: open ? 0 : 1, transition: "all 0.2s" }} />
          <span style={{ display: "block", height: 3, width: 26, background: open ? "#DC2626" : "#F5F5F5", borderRadius: 2, transition: "all 0.2s", transform: open ? "rotate(-45deg) translate(5px, -8px)" : "none" }} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 16px 24px" }}>
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href} onClick={() => setOpen(false)}
              style={{ display: "block", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: "#F5F5F5", letterSpacing: 3, textDecoration: "none" }}>
              {link.label}
            </a>
          ))}
          {registered ? (
            <>
              {MEMBER_LINKS.map(item => (
                <a key={item.label} href={item.href} onClick={() => setOpen(false)}
                  style={{ display: "block", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: "#FACC15", letterSpacing: 3, textDecoration: "none" }}>
                  {item.label}
                </a>
              ))}
              <button onClick={logout}
                style={{ display: "block", width: "100%", textAlign: "left", marginTop: 8, background: "transparent", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 3, cursor: "pointer" }}>
                🚪 LOGOUT
              </button>
            </>
          ) : (
            <a href="/register" onClick={() => setOpen(false)}
              style={{ display: "block", marginTop: 16, background: "#DC2626", color: "#fff", textAlign: "center", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 3, textDecoration: "none" }}>
              JOIN FREE — REGISTER NOW
            </a>
          )}
        </div>
      )}
    </nav>
  );
}