import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { StoreProvider } from '@/store/StoreProvider';
import { Toasts } from '@/components/Toasts';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', weight: ['500', '700'] });

export const metadata: Metadata = {
  title: { default: 'GameHub', template: '%s · GameHub' },
  description: 'Play Lucky Wheel with friends in live rooms. Demo coins only, no real money.',
};
export const viewport: Viewport = { themeColor: '#0a0a12', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>
        <StoreProvider>
          {children}
          <Toasts />
        </StoreProvider>
      </body>
    </html>
  );
}
