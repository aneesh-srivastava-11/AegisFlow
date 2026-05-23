import './globals.css';
import { AuthContextProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Code Review AI — AI-Powered Security Analysis',
  description: 'Detect vulnerabilities, secrets, and security issues in your pull requests automatically using Gemini 2.0 Flash AI. Works with any programming language.',
  keywords: 'code review, security, AI, vulnerability detection, GitHub, Gemini',
  openGraph: {
    title: 'Code Review AI',
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
              <p>Code Review AI — Powered by Gemini 2.0 Flash • Built for production security</p>
            </div>
          </footer>
        </AuthContextProvider>
      </body>
    </html>
  );
}
