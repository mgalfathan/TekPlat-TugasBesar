import type { Metadata } from 'next';
import { Anton, Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});

const archivo = Archivo({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'THE GAFFER — Football Data & Analytics Platform',
  description: 'Explore football results, standings and stats, build custom metrics, and simulate full seasons — football analytics made simple.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${anton.variable} ${archivo.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg text-ink min-h-screen font-sans antialiased">
        <Navbar />
        <main className="max-w-page mx-auto px-7 pt-9 pb-24">{children}</main>
      </body>
    </html>
  );
}
