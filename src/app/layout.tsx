import type { Metadata } from "next";
import { Montserrat, Outfit, Urbanist } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "IA_Cosmetic | Análisis Dermo-Cosmético de Precisión",
  description: "Analiza tu piel con tecnología de visión computacional avanzada y recibe una recomendación dermo-cosmética personalizada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${urbanist.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#FDFBF7] text-[#1A1A1A] font-sans flex flex-col">
        {children}
      </body>
    </html>
  );
}
