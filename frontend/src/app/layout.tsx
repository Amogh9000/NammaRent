import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Namma Tenant Navigator | Bengaluru Legal Aid & Tenant Rights',
  description: 'Deterministic, privacy-first legal aid and demand notice generator for urban renters in Bengaluru grounded in Karnataka housing regulations.',
  keywords: 'Bengaluru tenants, Karnataka Rent Act, security deposit refund, rent increase notice 90 days, legal demand notice, BBMP tenant rights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0A0A0A] text-[#F5F5F7] font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
