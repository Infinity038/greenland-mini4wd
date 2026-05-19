"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getMemberData, logout } from "@/lib/member";

export default function ProfilePage() {
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    setMember(getMemberData());
  }, []);

  const expLabel: any = {
    beginner: "Beginner — Never built one",
    intermediate: "Intermediate — Built a few",
    advanced: "Advanced — Regular racer",
  };

  const registeredDate = member?.registered_at
    ? new Date(member.registered_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <>
      <Navbar />
      <main style={{ background: "#050505", color: "#F5F5F5", minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 48, paddingBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width: 72, height: 72, background: "#DC2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: "#fff", flexShrink: 0 }}>
              {member?.first_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#DC2626", marginBottom: 4 }}>COMMUNITY MEMBER</div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, color: "#F5F5F5", margin: 0, lineHeight: 1 }}>
                {member ? `${member.first_name} ${member.last_name}` : "Loading..."}
              </h1>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#B8C1CC", marginTop: 4 }}>Member since {registeredDate}</div>
            </div>
          </div>

          {/* Info cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Email", value: member?.email },
              { label: "Phone", value: member?.phone || "Not provided" },
              { label: "Nationality", value: member?.nationality || "Not provided" },
              { label: "City / Town", value: member?.city || "Not provided" },
              { label: "Experience Level", value: expLabel[member?.experience] || "Not provided" },
              { label: "Member Status", value: "✅ Active Member" },
            ].map(item => (
              <div key={item.label} style={{ background: "#071426", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#B8C1CC", marginBottom: 6 }}>{item.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#F5F5F5" }}>{item.value || "—"}</div>
              </div>
            ))}
          </div>

          {/* Social / Follow placeholder */}
          <div style={{ background: "#071426", border: "1px solid rgba(250,204,21,0.15)", borderRadius: 12, padding: "24px", marginBottom: 32 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 4, color: "#FACC15", marginBottom: 12 }}>FOLLOW US</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Facebook Group", href: "https://www.facebook.com/share/g/18gBxyY1Wd/?mibextid=wwXIfr" },
                { label: "Instagram", href: "https://www.instagram.com/thearctichustle" },
                { label: "TikTok", href: "https://www.tiktok.com/@the.arctic.hustle" },
                { label: "YouTube", href: "https://youtube.com/@thearctichustle-038" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 16px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: "#F5F5F5", textDecoration: "none", letterSpacing: 1 }}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 40 }}>
            <a href="/orders" style={{ background: "#DC2626", color: "#fff", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none", textAlign: "center" }}>MY ORDERS →</a>
            <a href="/tournaments" style={{ background: "#071426", color: "#F5F5F5", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>TOURNAMENTS →</a>
            <a href="/shop" style={{ background: "#071426", color: "#F5F5F5", padding: "14px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, textDecoration: "none", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>SHOP →</a>
          </div>

          <button onClick={logout}
            style={{ background: "transparent", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626", padding: "12px 28px", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer" }}>
            LOGOUT
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}