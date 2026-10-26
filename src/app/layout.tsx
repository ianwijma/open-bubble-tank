import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Open Bubble Tank · Bubble Tanks 3',
  description:
    'A modular, local-first recreation of Bubble Tanks 3. Load your original Flash artwork, or play with mock assets.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
