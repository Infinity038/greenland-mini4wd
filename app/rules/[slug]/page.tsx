import { notFound } from 'next/navigation';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import KnowledgeTabs from '@/components/knowledge/KnowledgeTabs';
import { getRuleClass, RULE_CLASSES, RULEBOOK_VERSION } from '@/lib/rulesGuidesContent';

const headingFont = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const bodyFont = { fontFamily: "'DM Sans', sans-serif" } as const;

export function generateStaticParams() {
  return RULE_CLASSES.map((entry) => ({ slug: entry.slug }));
}

function RuleList({ title, icon, color, items }: { title: string; icon: string; color: string; items: string[] }) {
  return (
    <section style={{ background: '#071426', border: `1px solid ${color}44`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: '24px' }}>
        <h2 style={{ ...headingFont, fontSize: 24, margin: '0 0 16px', color }}>{icon} {title}</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <li key={item} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{ color, fontWeight: 900, flexShrink: 0 }}>→</span>
              <span style={{ ...bodyFont, fontSize: 13.5, lineHeight: 1.65, color: '#B8C1CC' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function ClassRulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getRuleClass(slug);

  if (!entry) notFound();

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, minHeight: '100vh' }}>
        <section
          style={{
            background: `linear-gradient(180deg, ${entry.color}18 0%, #071426 46%, #050505 100%)`,
            borderBottom: `1px solid ${entry.color}33`,
            padding: '56px 24px 48px',
          }}
        >
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <a href="/rules" style={{ ...headingFont, color: '#B8C1CC', textDecoration: 'none', fontSize: 13, letterSpacing: 2 }}>← ALL RULES</a>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 54 }}>{entry.icon}</span>
              <div>
                <div style={{ ...headingFont, color: entry.color, fontSize: 12, letterSpacing: 4 }}>{entry.skillLevel.toUpperCase()} CLASS</div>
                <h1 style={{ ...headingFont, fontSize: 'clamp(48px, 9vw, 86px)', lineHeight: 0.95, margin: '4px 0 10px', color: '#F5F5F5' }}>
                  {entry.name.toUpperCase()}
                </h1>
              </div>
            </div>
            <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 16, lineHeight: 1.7, maxWidth: 760, margin: '20px 0 0' }}>{entry.summary}</p>
            <KnowledgeTabs active="rules" />
          </div>
        </section>

        <div style={{ maxWidth: 980, margin: '0 auto', padding: '48px 24px 72px' }}>
          <section
            style={{
              background: '#0A0F1C',
              border: `1px solid ${entry.color}44`,
              borderRadius: 14,
              padding: '24px 26px',
              marginBottom: 32,
            }}
          >
            <div style={{ ...headingFont, fontSize: 11, letterSpacing: 3, color: entry.color, marginBottom: 8 }}>CLASS PHILOSOPHY</div>
            <p style={{ ...bodyFont, fontSize: 15, lineHeight: 1.7, color: '#F5F5F5', margin: 0 }}>{entry.philosophy}</p>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 42 }}>
            <RuleList title="ALLOWED" icon="✅" color="#22C55E" items={entry.allowed} />
            <RuleList title="ALLOWED WITH CONDITIONS" icon="⚠️" color="#FACC15" items={entry.conditional} />
            <RuleList title="NOT ALLOWED" icon="❌" color="#DC2626" items={entry.prohibited} />
          </div>

          <section style={{ marginBottom: 42 }}>
            <div style={{ ...headingFont, fontSize: 11, letterSpacing: 4, color: entry.color, marginBottom: 8 }}>SCRUTINEERING</div>
            <h2 style={{ ...headingFont, fontSize: 'clamp(30px, 6vw, 48px)', margin: '0 0 22px' }}>CLASS INSPECTION</h2>
            <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '8px 22px' }}>
              {entry.inspection.map((item, index) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '15px 0',
                    borderBottom: index === entry.inspection.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ ...headingFont, color: entry.color, fontWeight: 900, minWidth: 24 }}>{index + 1}</span>
                  <span style={{ ...bodyFont, color: '#B8C1CC', fontSize: 14, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.12), #071426)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 14,
              padding: '24px 26px',
              marginBottom: 42,
            }}
          >
            <div style={{ ...headingFont, fontSize: 11, letterSpacing: 3, color: '#FACC15', marginBottom: 8 }}>OFFICIAL DECISION</div>
            <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
              Rulebook v{RULEBOOK_VERSION.version} applies from {RULEBOOK_VERSION.effectiveDate}. A configuration not explicitly described must be shown to the race director before inspection. Approval at one event does not automatically create a permanent rule.
            </p>
          </section>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="/rules#motor-matrix"
              style={{
                ...headingFont,
                background: '#DC2626',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '12px 20px',
                textDecoration: 'none',
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              VIEW MOTOR MATRIX
            </a>
            <a
              href="/guides"
              style={{
                ...headingFont,
                background: 'transparent',
                color: '#F5F5F5',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 8,
                padding: '12px 20px',
                textDecoration: 'none',
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              OPEN BUILD GUIDES
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
