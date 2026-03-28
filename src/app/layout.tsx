import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IPL Picks 2026',
  description: 'Predict IPL 2026 match winners, compete with friends, and climb the leaderboard!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f7fafc] min-h-screen">
        {children}
      </body>
    </html>
  );
}
