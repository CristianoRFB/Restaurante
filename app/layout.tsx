import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Baru Gastronomia | Boa comida aproxima pessoas',
  description: 'Experiências gastronômicas, cardápio e reservas do Baru Gastronomia.',
  openGraph: { title: 'Baru Gastronomia', description: 'Boa comida aproxima pessoas.', type: 'website' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#283321' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
