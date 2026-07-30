import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import KnowledgeTabs from '@/components/knowledge/KnowledgeTabs';
import { GUIDE_TOPICS } from '@/lib/rulesGuidesContent';

const headingFont = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const bodyFont = { fontFamily: "'DM Sans', sans-serif" } as const;

export default function GuidesPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, minHeight: '100vh' }}>
        <section
          style={{
            background: 'linear-gradient(180deg, rgba(59,130,246,0.18) 0%, #071426 46%, #050505 100%)',
            borderBottom: '1px solid rgba(59,130,246,0.25)',
            padding: '64px 24px 56px',
            textAlign: 'center',
          }}
        >
          <div style={{ ...headingFont, fontSize: 11, letterSpacing: 5, color: '#3B82F6', marginBottom: 12 }}>GREENLAND MINI 4WD CLUB</div>
          <h1 style={{ ...headingFont, fontWeight: 900, fontSize: 'clamp(48px, 10vw, 92px)', lineHeight: 0.9, margin: '0 0 20px' }}>
            BUILD <span style={{ color: '#3B82F6' }}>GUIDES</span>
          </h1>
          <p style={{ ...bodyFont, fontSize: 16, color: '#B8C1CC', maxWidth: 650, margin: '0 auto', lineHeight: 1.7 }}>
            Practical setup knowledge for new and experienced racers. Every guide separates performance advice from class legality.
          </p>
          <KnowledgeTabs active="guides" />
        </section>

        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '52px 24px 72px' }}>
          <section
            style={{
              background: '#071426',
              border: '1px solid rgba(250,204,21,0.25)',
              borderRadius: 14,
              padding: '22px 24px',
              marginBottom: 42,
            }}
          >
            <div style={{ ...headingFont, fontSize: 12, letterSpacing: 3, color: '#FACC15', marginBottom: 6 }}>IMPORTANT</div>
            <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
              A part can fit your chassis and still be illegal in your race class. Check the Rulebook before cutting, drilling, sanding, changing motors or installing moving systems.
            </p>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18 }}>
            {GUIDE_TOPICS.map((guide, index) => (
              <a
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                style={{
                  display: 'block',
                  background: '#071426',
                  border: `1px solid ${guide.color}44`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  color: '#F5F5F5',
                  textDecoration: 'none',
                }}
              >
                <div style={{ height: 4, background: guide.color }} />
                <div style={{ padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>{guide.icon}</span>
                    <span style={{ ...headingFont, fontSize: 11, letterSpacing: 2, color: '#6B7280' }}>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h2 style={{ ...headingFont, fontSize: 27, margin: '14px 0 8px', color: guide.color }}>{guide.title}</h2>
                  <p style={{ ...bodyFont, fontSize: 13, color: '#B8C1CC', lineHeight: 1.65, minHeight: 64, margin: 0 }}>{guide.summary}</p>
                  <div style={{ ...headingFont, fontSize: 11, color: '#6B7280', letterSpacing: 1.5, marginTop: 14 }}>{guide.audience.toUpperCase()}</div>
                  <div style={{ ...headingFont, fontWeight: 900, letterSpacing: 1.5, fontSize: 13, marginTop: 16 }}>READ GUIDE →</div>
                </div>
              </a>
            ))}
          </div>

          <section
            style={{
              marginTop: 52,
              background: 'linear-gradient(135deg, rgba(220,38,38,0.14), #071426)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 16,
              padding: '32px 26px',
              textAlign: 'center',
            }}
          >
            <div style={{ ...headingFont, fontSize: 11, letterSpacing: 4, color: '#DC2626' }}>RACE LEGALITY</div>
            <h2 style={{ ...headingFont, fontSize: 'clamp(30px, 6vw, 46px)', margin: '8px 0 10px' }}>CHECK BEFORE YOU MODIFY</h2>
            <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 14, lineHeight: 1.65, maxWidth: 620, margin: '0 auto 22px' }}>
              Use the class comparison, motor matrix and detailed allowed/not-allowed pages before committing to a build.
            </p>
            <a
              href="/rules"
              style={{
                ...headingFont,
                display: 'inline-block',
                background: '#DC2626',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '12px 24px',
                textDecoration: 'none',
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              OPEN RULEBOOK →
            </a>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
