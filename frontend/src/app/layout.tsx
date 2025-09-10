import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Port Digital Twin',
  description: 'Digital twin for port energy management and simulation',
  icons: {
    icon: [
      { url: '/smallLogo.png', sizes: '32x32', type: 'image/png' },
      { url: '/smallLogo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/smallLogo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
