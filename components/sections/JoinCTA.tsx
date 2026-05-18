"use client";
import { useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export default function JoinCTA() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    await new Promise((r) => setTimeout(r, 800));
    setState("success");
  }

  return (
    <section id="register" className="relative bg-[#D01B1B] px-5 py-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <p className="text-xs font-semibold text-white/70 tracking-[0.3em] mb-4"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>FREE TO JOIN</p>
        <h2 className="font-black text-white leading-[0.95] mb-6"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(42px, 9vw, 76px)" }}>
          START YOUR<br />RACING JOURNEY
        </h2>
        <p className="text-[#CBD5E1] leading-relaxed mb-10 text-base md:text-lg max-w-md mx-auto"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Join the Greenland Mini 4WD Club today. Get event updates, connect with members, and be part of something fast, fun, and real.
        </p>

        {state === "success" ? (
          <div className="bg-black/20 rounded-lg px-8 py-6 inline-block">
            <p className="font-bold text-2xl text-white"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              🏁 You're in! We'll be in touch soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input type="email" placeholder="Enter your email address"
              value={email} onChange={(e) => setEmail(e.target.value)} required
              className="flex-1 px-5 py-4 rounded bg-black/20 border border-white/20 text-white placeholder-white/40 text-base outline-none focus:border-white/60 transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }} />
            <button type="submit" disabled={state === "loading"}
              className="bg-[#0d0d0d] hover:bg-[#1a1a1a] disabled:opacity-60 text-white px-7 py-4 rounded font-bold text-sm tracking-widest transition-colors duration-200 whitespace-nowrap cursor-pointer border-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {state === "loading" ? "JOINING..." : "JOIN NOW"}
            </button>
          </form>
        )}

        <p className="mt-5 text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Free membership · No spam · Unsubscribe anytime
        </p>
      </div>
    </section>
  );
}
