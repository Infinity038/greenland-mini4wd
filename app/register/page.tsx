"use client";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  city: string;
  experience: string;
  agreeTerms: boolean;
}

type FormState = "idle" | "loading" | "success" | "error";

const INITIAL: FormData = {
  firstName: "", lastName: "", email: "", phone: "",
  nationality: "", city: "", experience: "", agreeTerms: false,
};

const inputClass = "w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D01B1B] text-white placeholder-gray-700 rounded px-4 py-3 text-sm outline-none transition-colors duration-200";

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function update(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.nationality) e.nationality = "Required";
    if (!form.city) e.city = "Required";
    if (!form.experience) e.experience = "Please select your level";
    if (!form.agreeTerms) e.agreeTerms = "You must agree to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setState("loading");
    await new Promise((r) => setTimeout(r, 800));
    setState("success");
  }

  if (state === "success") {
    return (
      <>
        <Navbar />
        <main className="bg-[#0d0d0d] min-h-screen pt-16 flex items-center justify-center px-5">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🏁</div>
            <h2 className="font-black text-[#F4F4F0] mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 48 }}>
              YOU'RE IN!
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Welcome to Greenland Mini 4WD Club, {form.firstName}! We'll send your confirmation to <strong className="text-white">{form.email}</strong> shortly.
            </p>
            <a href="/"
              className="inline-block bg-[#D01B1B] hover:bg-red-700 text-white px-8 py-3.5 rounded font-bold text-sm tracking-widest transition-colors duration-200"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              BACK TO HOME
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-[#0d0d0d] min-h-screen pt-16">
        {/* Hero */}
        <div className="relative bg-[#0F1923] px-5 py-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(208,27,27,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(208,27,27,0.05) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <p className="text-xs font-semibold text-[#D01B1B] tracking-[0.3em] mb-3"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>FREE MEMBERSHIP</p>
            <h1 className="font-black text-[#F4F4F0] leading-none mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(42px, 8vw, 72px)" }}>
              JOIN THE CLUB
            </h1>
            <p className="text-gray-500 text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Fill in the form below to become a member. It's completely free.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto px-5 py-12">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>

            {/* Name */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  FIRST NAME <span className="text-[#D01B1B]">*</span>
                </label>
                <input type="text" placeholder="Juan" value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className={inputClass} style={{ fontFamily: "'DM Sans', sans-serif" }} />
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  LAST NAME <span className="text-[#D01B1B]">*</span>
                </label>
                <input type="text" placeholder="dela Cruz" value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className={inputClass} style={{ fontFamily: "'DM Sans', sans-serif" }} />
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                EMAIL <span className="text-[#D01B1B]">*</span>
              </label>
              <input type="email" placeholder="juan@example.com" value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass} style={{ fontFamily: "'DM Sans', sans-serif" }} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>PHONE (OPTIONAL)</label>
              <input type="tel" placeholder="+299 12 34 56" value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass} style={{ fontFamily: "'DM Sans', sans-serif" }} />
            </div>

            {/* Nationality + City */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  NATIONALITY <span className="text-[#D01B1B]">*</span>
                </label>
                <select value={form.nationality} onChange={(e) => update("nationality", e.target.value)}
                  className={`${inputClass} ${!form.nationality ? "text-gray-700" : ""}`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <option value="">Select</option>
                  <option>Filipino</option>
                  <option>Greenlandic</option>
                  <option>Danish</option>
                  <option>Other</option>
                </select>
                {errors.nationality && <p className="mt-1 text-xs text-red-500">{errors.nationality}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  CITY <span className="text-[#D01B1B]">*</span>
                </label>
                <select value={form.city} onChange={(e) => update("city", e.target.value)}
                  className={`${inputClass} ${!form.city ? "text-gray-700" : ""}`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <option value="">Select</option>
                  <option>Nuuk</option>
                  <option>Sisimiut</option>
                  <option>Ilulissat</option>
                  <option>Qaqortoq</option>
                  <option>Aasiaat</option>
                  <option>Other</option>
                </select>
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-widest mb-3"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                EXPERIENCE LEVEL <span className="text-[#D01B1B]">*</span>
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { value: "beginner", label: "🟢 Beginner", sub: "Never built one" },
                  { value: "intermediate", label: "🟡 Intermediate", sub: "Built a few cars" },
                  { value: "experienced", label: "🔴 Experienced", sub: "Regular racer" },
                ].map((opt) => (
                  <button type="button" key={opt.value}
                    onClick={() => update("experience", opt.value)}
                    className={`p-4 rounded-lg border text-left transition-all duration-200 cursor-pointer
                      ${form.experience === opt.value
                        ? "border-[#D01B1B] bg-red-900/10"
                        : "border-white/10 bg-transparent hover:border-white/30"}`}>
                    <div className="font-bold text-sm text-[#F4F4F0] mb-0.5"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{opt.label}</div>
                    <div className="text-xs text-gray-600">{opt.sub}</div>
                  </button>
                ))}
              </div>
              {errors.experience && <p className="mt-2 text-xs text-red-500">{errors.experience}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div onClick={() => update("agreeTerms", !form.agreeTerms)}
                  className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors duration-200 cursor-pointer
                    ${form.agreeTerms ? "bg-[#D01B1B] border-[#D01B1B]" : "border-white/20"}`}>
                  {form.agreeTerms && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  I agree to the club's community guidelines. Membership is free and I may receive event updates by email.
                </span>
              </label>
              {errors.agreeTerms && <p className="mt-1 text-xs text-red-500 ml-8">{errors.agreeTerms}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={state === "loading"}
              className="w-full bg-[#D01B1B] hover:bg-red-700 disabled:opacity-60 text-white py-4 rounded font-black text-lg tracking-widest transition-colors duration-200 border-none cursor-pointer"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {state === "loading" ? "SUBMITTING..." : "JOIN THE CLUB — IT'S FREE"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}