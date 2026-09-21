import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickyCTA from "@/components/StickyCTA";
import HeadingFontToggle from "@/components/HeadingFontToggle";

export const metadata: Metadata = {
  title: "De Impact Club — Small Group Training in Schiedam",
  description:
    "Boutique Small Group PT in Schiedam. Start met het Fundament Traject: 4 weken, 4 privésessies, gericht op techniek, bewegingskwaliteit en zelfvertrouwen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Righteous&family=Funnel+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-ink text-paper antialiased">
        <div className="fixed inset-x-0 top-0 z-0 h-1 bg-gradient-to-r from-transparent via-koper-light/60 to-transparent" />
        <Header />
        <main>{children}</main>
        <Footer />
        <StickyCTA />
        <HeadingFontToggle />
      </body>
    </html>
  );
}
