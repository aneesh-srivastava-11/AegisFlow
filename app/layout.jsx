import './globals.css';
import { AuthContextProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'AegisFlow — AI-Powered Security Analysis',
  description: 'Detect vulnerabilities, secrets, and security issues in your pull requests automatically using Gemini AI. Works with any programming language.',
  keywords: 'code review, security, AI, vulnerability detection, GitHub, Gemini, AegisFlow',
  openGraph: {
    title: 'AegisFlow',
    description: 'AI-powered security code review for every pull request',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthContextProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="footer">
            <div className="container">
              <p>AegisFlow — Powered by Gemini • Built for production security</p>
            </div>
          </footer>
        </AuthContextProvider>
      </body>
    </html>
  );
}
