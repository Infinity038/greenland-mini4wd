'use client';
import { useEffect, useState } from 'react';
import { isRegistered } from '@/lib/member';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function EventsPage() {
  const [registered, setRegistered] = useState(false);
  useEffect(() => { setRegistered(isRegistered()); }, []);

  return (
    <>
      <Navbar />
      <main style={{ background: '#0D0D0D', color: '#fff', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px' }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🏁</div>
          <div style={{ fontSize: 13, letterSpacing: 4, color: '#D01B1B', marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif" }}>
            COMING SOON
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 900, marginBottom: 16 }}>
            RACE EVENTS &<br /><span style={{ color: '#D01B1B' }}>SCHEDULES</span>
          </h1>
          <p style={{ color: '#aaa', fontSize: 18, maxWidth: 480, margin: '0 auto 32px' }}>
            We're organizing our first race events in Nuuk. Stay tuned — it's going to be epic.
          </p>
          {registered ? (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '16px 32px', display: 'inline-block' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: '#22C55E', letterSpacing: 2 }}>✓ YOU'RE ON THE LIST</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>We'll notify you when events are announced.</div>
            </div>
          ) : (
            <a href="/register" style={{ background: '#D01B1B', color: '#fff', padding: '16px 40px', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, textDecoration: 'none', letterSpacing: 2 }}>
              JOIN TO GET NOTIFIED
            </a>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}