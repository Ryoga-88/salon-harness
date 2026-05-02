import { Inter, JetBrains_Mono, Noto_Sans_JP } from 'next/font/google';
import './globals.css';

export const metadata = {
  title: 'Salon Harness',
  description: 'Salon booking and retention dashboard'
};

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto',
  display: 'swap'
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap'
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${notoSansJp.variable} ${inter.variable} ${jetbrainsMono.variable}`;
  return (
    <html lang="ja" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
