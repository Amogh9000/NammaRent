import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Namma Tenant Navigator | Karnataka Tenancy Defense',
  description: 'Deterministic, privacy-first legal aid and demand notice generator for Bengaluru renters grounded in Karnataka housing regulations.',
  keywords: 'Bengaluru tenants, Karnataka Rent Act, security deposit refund, rent increase notice 90 days, legal demand notice, BBMP tenant rights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F6FB] text-[#475569] font-sans selection:bg-[#DBEAFE] selection:text-[#1D4ED8] antialiased">
        {children}
      </body>
    </html>
  );
}
