"use client";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(13,13,13,0.97)", borderBottom: "1px solid rgba(208,27,27,0.3)", backdropFilter: "blur(10px)" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        
        {/* Logo */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, background: "#D01B1B", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#fff", fontSize: 16 }}>4W</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, color: "#fff", fontSize: 16, lineHeight: 1, letterSpacing: 2 }}>GREENLAND</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, color: "#FACC15", fontSize: 10, letterSpacing: 4, lineHeight: 1, marginTop: 2 }}>MINI 4WD CLUB</div>
          </div>
        </a>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: "#9ca3af", letterSpacing: 3, textDecoration: "none" }}>{link.label}</a>
          ))}
          <a href="/register" style={{ background: "#D01B1B", color: "#fff", padding: "8px 20px", borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 2, textDecoration: "none" }}>JOIN CLUB</a>
        </div>

        {/* Hamburger */}
        <button onClick={() => setOpen(!open)} style={{ display: "flex", flexDirection: "column", gap: 5, padding: 8, background: "transparent", border: "none", cursor: "pointer" }} className="md:hidden">
          <span style={{ display: "block", height: 3, width: 26, background: open ? "#D01B1B" : "#fff", borderRadius: 2, transition: "all 0.2s", transform: open ? "rotate(45deg) translate(5px, 8px)" : "none" }} />
          <span style={{ display: "block", height: 3, width: 26, background: "#fff", borderRadius: 2, transition: "all 0.2s", opacity: open ? 0 : 1 }} />
          <span style={{ display: "block", height: 3, width: 26, background: open ? "#D01B1B" : "#fff", borderRadius: 2, transition: "all 0.2s", transform: open ? "rotate(-45deg) translate(5px, -8px)" : "none" }} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: "#0d0d0d", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 20px 24px" }}>
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setOpen(false)}
              style={{ display: "block", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", textDecoration: "none", letterSpacing: 3 }}>
              {link.label}
            </a>
          ))}
          <a href="/register" onClick={() => setOpen(false)}
            style={{ display: "block", marginTop: 16, background: "#D01B1B", color: "#fff", textAlign: "center", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 3, textDecoration: "none" }}>
            JOIN THE CLUB
          </a>
        </div>
      )}
    </nav>
  );
}
