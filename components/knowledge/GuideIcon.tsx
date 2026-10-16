/** The wheel emoji (🛞) lacks glyph support on some Windows browser fonts.
 * Render a real SVG on Tires & Wheels across both guide index and detail.
 */
export default function GuideIcon({ slug, icon, size = 32 }: { slug: string; icon: string; size?: number }) {
  if (slug !== 'tires-wheels') return <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
  return (
    <svg role="img" aria-label="Tire and wheel" width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#111827" stroke="#A855F7" strokeWidth="5"/>
      <circle cx="32" cy="32" r="19" fill="#253145" stroke="#D8B4FE" strokeWidth="3"/>
      <circle cx="32" cy="32" r="5" fill="#A855F7"/>
      <path d="M32 13V27M32 37V51M13 32H27M37 32H51M19 19L28 28M36 36L45 45M45 19L36 28M28 36L19 45" stroke="#D8B4FE" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
