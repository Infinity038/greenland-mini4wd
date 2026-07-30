type KnowledgeTabsProps = {
  active: 'rules' | 'guides';
};

const links = [
  { key: 'rules', label: '📋 RULEBOOK', href: '/rules' },
  { key: 'guides', label: '🧭 BUILD GUIDES', href: '/guides' },
] as const;

export default function KnowledgeTabs({ active }: KnowledgeTabsProps) {
  return (
    <nav
      aria-label="Rules and guides"
      style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 28,
      }}
    >
      {links.map((link) => {
        const selected = link.key === active;
        return (
          <a
            key={link.key}
            href={link.href}
            aria-current={selected ? 'page' : undefined}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 2,
              color: selected ? '#FFFFFF' : '#B8C1CC',
              background: selected ? '#DC2626' : 'rgba(255,255,255,0.04)',
              border: selected ? '1px solid #DC2626' : '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '10px 18px',
              textDecoration: 'none',
            }}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
