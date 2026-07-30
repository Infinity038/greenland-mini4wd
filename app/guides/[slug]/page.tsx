import { notFound } from 'next/navigation';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import KnowledgeTabs from '@/components/knowledge/KnowledgeTabs';
import { getGuideTopic, GUIDE_TOPICS } from '@/lib/rulesGuidesContent';

const headingFont = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const bodyFont = { fontFamily: "'DM Sans', sans-serif" } as const;

export function generateStaticParams() {
  return GUIDE_TOPICS.map((entry) => ({ slug: entry.slug }));
}

function GuideTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginTop: 18 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, background: '#071426' }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  ...headingFont,
                  textAlign: 'left',
                  padding: '13px 14px',
                  fontSize: 12,
                  letterSpacing: 1,
                  color: '#F5F5F5',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  background: '#0A0F1C',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  style={{
                    ...bodyFont,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: cellIndex === 0 ? '#F5F5F5' : '#B8C1CC',
                    fontWeight: cellIndex === 0 ? 600 : 400,
                    lineHeight: 1.55,
                    borderBottom: rowIndex === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideTopic(slug);

  if (!guide) notFound();

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', color: '#F5F5F5', paddingTop: 60, minHeight: '100vh' }}>
        <section
          style={{
            background: `linear-gradient(180deg, ${guide.color}1F 0%, #071426 48%, #050505 100%)`,
            borderBottom: `1px solid ${guide.color}33`,
            padding: '56px 24px 48px',
          }}
        >
          <div style={{ maxWidth: 920, margin: '0 auto' }}>
            <a href="/guides" style={{ ...headingFont, color: '#B8C1CC', textDecoration: 'none', fontSize: 13, letterSpacing: 2 }}>← ALL GUIDES</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 28 }}>
              <span style={{ fontSize: 52 }}>{guide.icon}</span>
              <div>
                <div style={{ ...headingFont, color: guide.color, fontSize: 12, letterSpacing: 4 }}>{guide.audience.toUpperCase()}</div>
                <h1 style={{ ...headingFont, fontSize: 'clamp(46px, 9vw, 82px)', lineHeight: 0.95, margin: '4px 0 10px' }}>{guide.title.toUpperCase()}</h1>
              </div>
            </div>
            <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 16, lineHeight: 1.7, maxWidth: 760, margin: '20px 0 0' }}>{guide.summary}</p>
            <KnowledgeTabs active="guides" />
          </div>
        </section>

        <div style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px 72px' }}>
          {guide.sections.map((section, index) => (
            <section
              key={section.title}
              style={{
                background: '#071426',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: '26px',
                marginBottom: 20,
              }}
            >
              <div style={{ ...headingFont, fontSize: 11, letterSpacing: 3, color: guide.color, marginBottom: 7 }}>
                SECTION {String(index + 1).padStart(2, '0')}
              </div>
              <h2 style={{ ...headingFont, fontSize: 'clamp(28px, 5vw, 40px)', margin: '0 0 12px' }}>{section.title}</h2>
              {section.intro && (
                <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>{section.intro}</p>
              )}
              {section.bullets && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {section.bullets.map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                      <span style={{ color: guide.color, fontWeight: 900, flexShrink: 0 }}>→</span>
                      <span style={{ ...bodyFont, color: '#B8C1CC', fontSize: 13.5, lineHeight: 1.65 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.table && <GuideTable headers={section.table.headers} rows={section.table.rows} />}
              {section.callout && (
                <div
                  style={{
                    marginTop: 20,
                    background: `${guide.color}14`,
                    border: `1px solid ${guide.color}44`,
                    borderRadius: 10,
                    padding: '15px 17px',
                    ...bodyFont,
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: '#F5F5F5',
                  }}
                >
                  ⚠️ {section.callout}
                </div>
              )}
            </section>
          ))}

          <section
            style={{
              marginTop: 42,
              background: 'linear-gradient(135deg, rgba(220,38,38,0.14), #071426)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 14,
              padding: '28px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ ...headingFont, fontSize: 11, letterSpacing: 3, color: '#DC2626' }}>BEFORE RACE DAY</div>
            <h2 style={{ ...headingFont, fontSize: 34, margin: '8px 0 10px' }}>VERIFY YOUR CLASS</h2>
            <p style={{ ...bodyFont, color: '#B8C1CC', fontSize: 13.5, lineHeight: 1.65, maxWidth: 600, margin: '0 auto 20px' }}>
              Setup advice does not override the rulebook. Check the detailed class page and present uncertain configurations before official inspection.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="/rules"
                style={{
                  ...headingFont,
                  background: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '11px 20px',
                  textDecoration: 'none',
                  fontWeight: 900,
                  letterSpacing: 1.5,
                }}
              >
                OPEN RULEBOOK
              </a>
              <a
                href="/shop"
                style={{
                  ...headingFont,
                  background: 'transparent',
                  color: '#F5F5F5',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  padding: '11px 20px',
                  textDecoration: 'none',
                  fontWeight: 900,
                  letterSpacing: 1.5,
                }}
              >
                BROWSE SHOP
              </a>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
