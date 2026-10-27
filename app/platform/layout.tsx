import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Food Platform — leads internos',
  robots: { index: false, follow: false, noarchive: true },
};

export default function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
