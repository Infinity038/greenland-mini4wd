import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greenland Mini 4WD Club",
  description: "Greenland's premier Tamiya Mini 4WD racing community. Race. Connect. Build.",
  keywords: ["Tamiya", "Mini 4WD", "Greenland", "Nuuk", "Racing", "Filipino community"],
  openGraph: {
    title: "Greenland Mini 4WD Club",
    description: "Race. Connect. Build. — Nuuk's Tamiya Mini 4WD community.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0d0d0d] antialiased">{children}</body>
    </html>
  );
}
