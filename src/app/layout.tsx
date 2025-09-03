import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header, Footer } from "@/components/Header";

export const metadata: Metadata = {
  title: "ResumeRadar - The Ultimate ATS Resume Checker",
  description: "Optimize your resume for Applicant Tracking Systems with intelligent analysis and actionable feedback.",
  keywords: "resume checker, ATS optimization, job search, resume analysis, applicant tracking system",
  authors: [{ name: "Your Name" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col antialiased">
        <AuthProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
