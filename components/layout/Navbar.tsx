"use client";
import { useState } from "react";

const NAV_LINKS = ["Events", "Gallery", "Blog", "Shop", "About"];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-red-900/30">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 bg-[#D01B1B] rounded flex items-center justify-center font-black text-white text-lg"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            4W
          </div>
          <div className="leading-none">
            <div className="font-black text-white tracking-wide text-base leading-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>GREENLAND</div>
            <div className="text-[10px] font-semibold text-yellow-400 tracking-[0.25em] leading-none mt-0.5"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>MINI 4WD CLUB</div>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link} href={`#${link.toLowerCase()}`}
              className="font-semibold text-sm text-gray-400 tracking-widest no-underline hover:text-[#D01B1B] transition-colors duration-200"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{link}</a>
          ))}
          <a href="#register"
            className="bg-[#D01B1B] hover:bg-red-700 text-white px-5 py-2 rounded font-bold text-sm tracking-widest no-underline transition-colors duration-200"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>JOIN CLUB</a>
        </div>

        <button onClick={() => setOpen(!open)}
          className="md:hidden p-2 bg-transparent border-none cursor-pointer flex flex-col justify-center gap-1.5">
          <span className={`block h-0.5 w-6 bg-white transition-all duration-200 ${open ? "rotate-45 translate-y-2 bg-[#D01B1B]" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-all duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-all duration-200 ${open ? "-rotate-45 -translate-y-2 bg-[#D01B1B]" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-white/5 px-5 pb-6">
          {NAV_LINKS.map((link) => (
            <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setOpen(false)}
              className="block py-3 border-b border-white/5 font-bold text-xl text-white no-underline tracking-widest"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{link}</a>
          ))}
          <a href="#register" onClick={() => setOpen(false)}
            className="block mt-4 bg-[#D01B1B] text-white text-center py-3.5 rounded font-bold text-lg tracking-widest no-underline"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>JOIN THE CLUB</a>
        </div>
      )}
    </nav>
  );
}