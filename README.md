# Code Review AI — AI-Powered Security Analysis

> Automatically detect vulnerabilities, hardcoded secrets, and security issues in every pull request using Gemini 2.0 Flash AI. Works with **any programming language**.

## 🚀 Features

- **Real GitHub Integration** — Receives webhooks, posts PR review comments automatically
- **AI-Powered Analysis** — Gemini 2.0 Flash detects 50+ vulnerability types
- **Language Agnostic** — JavaScript, Python, Java, Go, Rust, PHP, Ruby, C++, and 20+ more
- **Real CVE Detection** — Matches code against known CVEs (Log4Shell, prototype pollution, etc.)
- **Live Dashboard** — Real-time analytics from MongoDB
- **Famous Breach Showcase** — Interactive demos of real-world breaches
- **Serverless** — Deploys to Vercel, scales automatically

## 📋 Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [MongoDB Atlas](https://www.mongodb.com/atlas) free tier account
- [Google AI Studio](https://aistudio.google.com/) Gemini API key
- [GitHub Account](https://github.com/) for GitHub App creation
- [Vercel Account](https://vercel.com/) for deployment

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/code-review-ai.git
cd code-review-ai
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `MONGODB_URI` | MongoDB Atlas connection string | [MongoDB Atlas](https://www.mongodb.com/atlas) |
| `GEMINI_API_KEY` | Google Gemini API key | [AI Studio](https://aistudio.google.com/apikey) |
| `GITHUB_APP_ID` | GitHub App ID | GitHub Settings → Developer Settings → GitHub Apps |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key (PEM) | Download when creating the GitHub App |
| `WEBHOOK_SECRET` | Webhook signature secret | `openssl rand -hex 32` |
| `GITHUB_TOKEN` | Personal access token (optional) | GitHub Settings → Developer Settings → PAT |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL | Your Vercel URL |

### 3. Create a GitHub App

1. Go to **GitHub Settings → Developer Settings → GitHub Apps → New GitHub App**
2. Set the webhook URL to `https://your-app.vercel.app/api/github/webhook`
3. Permissions needed:
   - **Pull requests**: Read & Write
   - **Contents**: Read
   - **Metadata**: Read
4. Subscribe to events: **Pull request**
5. Generate a private key and download it
6. Install the app on your repositories

### 4. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

### 5. Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

Set all environment variables in Vercel Dashboard → Settings → Environment Variables.

### 6. Initialize Database

After deploying, visit `/install` and click "Initialize Database" to create MongoDB indexes.

## 🏗️ Project Structure

```
code-review-ai/
├── app/
│   ├── api/
│   │   ├── github/webhook/route.js   # GitHub webhook handler
│   │   ├── analyze/route.js          # Manual analysis endpoint
│   │   ├── stats/route.js            # Dashboard analytics
│   │   └── setup/route.js            # DB initialization
│   ├── dashboard/page.jsx            # Analytics dashboard
│   ├── demo/page.jsx                 # Live demo page
│   ├── install/page.jsx              # Installation guide
│   ├── layout.jsx                    # Root layout
│   ├── page.jsx                      # Landing page
│   └── globals.css                   # Design system
├── components/
│   ├── AnalysisResults.jsx           # Results display
│   ├── BreachShowcase.jsx            # Famous breaches
│   ├── CodeDiffViewer.jsx            # Code diff display
│   ├── InstallButton.jsx             # GitHub App install
│   └── VulnerabilityCard.jsx         # Vulnerability details
├── lib/
│   ├── mongodb.js                    # Database connection
│   ├── gemini.js                     # AI analysis engine
│   ├── github.js                     # GitHub API wrapper
│   ├── webhook-handler.js            # Webhook processing
│   ├── vulnerability-detector.js     # Detection logic
│   └── prompts/
│       ├── security-analysis.js      # Gemini prompts
│       ├── language-configs.js       # Language patterns
│       └── cve-database.js           # CVE patterns
├── data/
│   ├── famous-breaches.json          # Real breach examples
│   └── cve-patterns.json             # Vulnerability patterns
├── vercel.json                       # Vercel config
└── .env.example                      # Environment template
```

## 🔒 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/github/webhook` | Receives GitHub webhook events |
| GET | `/api/github/webhook` | Health check |
| POST | `/api/analyze` | Manual code/PR analysis |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/setup` | GitHub App manifest |
| POST | `/api/setup` | Initialize DB indexes |

## 🧪 Testing

### Test the webhook locally

Use [smee.io](https://smee.io/) to forward GitHub webhooks to localhost:

```bash
npx smee-client --url https://smee.io/YOUR_CHANNEL --target http://localhost:3000/api/github/webhook
```

### Test manual analysis

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "const password = \"admin123\";", "language": "JavaScript"}'
```

### Test PR analysis

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"prUrl": "https://github.com/owner/repo/pull/1"}'
```

## 📊 MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `analyses` | Every PR analysis result with risk scores |
| `repositories` | Tracked repos with aggregate stats |
| `vulnerabilities` | Individual vulnerability records |
| `breach_database` | Famous breach examples |

## 🛡️ Supported Vulnerability Types

- Hardcoded Secrets (API keys, passwords, tokens)
- SQL / NoSQL / Command Injection
- Cross-Site Scripting (XSS)
- Path Traversal
- Insecure Deserialization
- SSRF (Server-Side Request Forgery)
- CSRF Issues
- Authentication Bypass
- Weak Cryptography
- Race Conditions
- Prototype Pollution
- Memory Safety Issues
- Insecure Dependencies
- Supply Chain Attacks
- And 30+ more...

## 📄 License

MIT
