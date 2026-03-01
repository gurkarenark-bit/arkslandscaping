import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Ark's Landscaping MVP",
  description: 'Next.js + Supabase MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
