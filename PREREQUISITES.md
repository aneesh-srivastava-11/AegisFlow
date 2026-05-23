# Prerequisites Checklist — AI Code Review Tool

> Complete this checklist **before** the hackathon starts. Every minute saved on setup = more time building.

---

## 1. Accounts & API Keys (CRITICAL — Get These NOW)

### 🟣 Google Gemini API
| Detail | Value |
|--------|-------|
| **URL** | https://aistudio.google.com/apikey |
| **What you need** | API key (free tier) |
| **Free tier** | 1,500 requests/day |
| **Setup time** | 2 minutes |
| **Cost** | $0 |

**Steps:**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click **"Get API Key"**
3. Create new API key
4. Copy it → save in `.env.local` as `GEMINI_API_KEY=...`

---

### 🟢 MongoDB Atlas
| Detail | Value |
|--------|-------|
| **URL** | https://www.mongodb.com/cloud/atlas/register |
| **What you need** | Database connection string |
| **Free tier** | 512MB storage |
| **Setup time** | 5 minutes |
| **Cost** | $0 |

**Steps:**
1. Sign up for MongoDB Atlas
2. Create a new cluster (**M0 Free tier**)
3. Create database user (username + password)
4. Add IP whitelist: `0.0.0.0/0` (allow all — for hackathon only!)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/`
6. Replace `<password>` with your actual password
7. Add database name: `.../code-review-ai?retryWrites=true&w=majority`

---

### ⚫ GitHub Account
| Detail | Value |
|--------|-------|
| **URL** | https://github.com |
| **What you need** | Account + Personal Access Token |
| **Setup time** | 2 minutes |
| **Cost** | $0 |

**For Testing — Personal Access Token:**
1. GitHub Settings → Developer Settings → Personal Access Tokens → **Tokens (classic)**
2. Generate new token
3. Scopes needed: `repo`, `write:discussion`
4. Copy token → save as `GITHUB_TOKEN=ghp_...`

**For Production — GitHub App:** (do this after building, during deployment)

---

### ▲ Vercel Account
| Detail | Value |
|--------|-------|
| **URL** | https://vercel.com/signup |
| **What you need** | Deployment platform |
| **Free tier** | Unlimited deploys, 100GB bandwidth/month |
| **Setup time** | 3 minutes |
| **Cost** | $0 |

**Steps:**
1. Sign up with GitHub account (easiest)
2. Install Vercel CLI: `npm i -g vercel`
3. Login: `vercel login`

---

## 2. Local Development Environment

### Required Software

| Software | Version | Check | Install |
|----------|---------|-------|---------|
| **Node.js** | 18.17+ (20.x recommended) | `node --version` | https://nodejs.org/ |
| **npm** | Comes with Node.js | `npm --version` | — |
| **Git** | Any recent | `git --version` | https://git-scm.com/ |
| **VS Code** | Latest | — | https://code.visualstudio.com/ |

### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Prettier
- ESLint
- MongoDB for VS Code (helpful for debugging)

---

## 3. Knowledge Prerequisites

### Must Have ✅
- **JavaScript basics**: Variables, functions, async/await, promises
- **React basics**: Components, props, hooks (useState, useEffect)
- **REST APIs**: HTTP requests, JSON structure
- **Git**: Commit, push, pull, basic GitHub usage
- **Command line**: Navigate directories, run npm commands

### Nice to Have 👍
- Next.js App Router
- MongoDB queries
- GitHub webhooks
- CSS styling

### Don't Need ❌
- Advanced backend architecture
- DevOps / Infrastructure knowledge
- Deep security expertise (the AI handles this)
- Database design expertise

---

## 4. Quick Start Commands

```bash
# 1. Clone the project
cd code-review-ai

# 2. Install dependencies
npm install

# 3. Create env file from template
cp .env.example .env.local
# Then edit .env.local with your actual keys

# 4. Test API connections
npm install -D dotenv
node test-apis.js

# 5. Run dev server
npm run dev

# 6. Deploy when ready
vercel --prod
```

---

## 5. Verify API Keys Work

Run the test script included in this project:

```bash
node test-apis.js
```

**Expected output:**
```
🧪 Testing API connections...

✅ Gemini API: API works!
✅ MongoDB connected
✅ GitHub API: your-username

✨ Setup complete!
```

---

## 6. Environment Variables Template

Create `.env.local` in project root (copy from `.env.example`):

```bash
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/code-review-ai?retryWrites=true&w=majority

# GitHub (for testing)
GITHUB_TOKEN=ghp_your_token_here

# GitHub App (fill after creating GitHub App)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
WEBHOOK_SECRET=

# App URL (change after deploying to Vercel)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 7. Time Allocation (24-hour hackathon)

| Hours | Task | Prerequisites Needed |
|-------|------|---------------------|
| 0–1 | Setup accounts, get API keys | All accounts created |
| 1–3 | Build Next.js app structure | Node.js, VS Code ready |
| 3–6 | Implement Gemini analysis engine | Gemini API key working |
| 6–10 | GitHub webhook handler | GitHub token, test repo |
| 10–14 | MongoDB integration & schemas | MongoDB URI working |
| 14–18 | UI components & dashboard | Basic React knowledge |
| 18–20 | Deploy to Vercel | Vercel account ready |
| 20–22 | Create GitHub App & test live | All APIs working |
| 22–24 | Polish, rehearse demo | Everything deployed |

---

## 8. Pre-Hackathon Checklist ✓

### Accounts & Keys
- [ ] Google account created
- [ ] Gemini API key obtained and tested
- [ ] MongoDB Atlas cluster created
- [ ] MongoDB connection string working
- [ ] GitHub account ready
- [ ] GitHub personal access token created
- [ ] Vercel account created
- [ ] Vercel CLI installed and logged in

### Software Installed
- [ ] Node.js 18+ installed
- [ ] npm working
- [ ] Git installed
- [ ] VS Code (or editor) ready

### Project Setup
- [ ] Next.js project created
- [ ] Dependencies installed
- [ ] `.env.local` file created with all values
- [ ] `node test-apis.js` shows all green ✅
- [ ] `npm run dev` opens localhost:3000 successfully

### Knowledge
- [ ] Know basic JavaScript
- [ ] Understand async/await
- [ ] Can use Git commands
- [ ] Know how to read API documentation

### Resources Ready
- [ ] Hackathon WiFi/internet confirmed
- [ ] Laptop charged + charger packed
- [ ] Energy drinks acquired ☕

---

## 9. Common Setup Issues & Fixes

| Issue | Fix |
|-------|-----|
| Gemini API returns 403 | Check API key is correct, no extra spaces. Regenerate in AI Studio if needed. |
| MongoDB connection timeout | Check IP whitelist in Atlas → add `0.0.0.0/0`. Verify username/password in connection string. |
| GitHub API rate limited | Use personal access token (increases limit to 5,000/hour). |
| Vercel deployment fails | Check environment variables are set in Vercel Dashboard → Settings → Environment Variables. |
| Port 3000 already in use | Windows: `netstat -ano \| findstr :3000` then kill PID. Or use `npm run dev -- -p 3001`. |

---

## 10. What You DON'T Need

| ❌ Not Needed | Why |
|--------------|-----|
| Docker | We're using serverless (Vercel) |
| Kubernetes | Overkill for hackathon |
| Redis | MongoDB is enough |
| AWS account | Vercel handles everything |
| Domain name | Vercel gives you one free |
| SSL certificate | Vercel includes HTTPS |
| CI/CD pipelines | Vercel auto-deploys from GitHub |
| Advanced security knowledge | The AI does the analysis |

---

## You're Ready When

✅ `node test-apis.js` shows all green checkmarks  
✅ `npm run dev` opens localhost:3000 successfully  
✅ You can commit and push to GitHub  
✅ `vercel` command deploys without errors  
✅ All API keys saved in `.env.local`  
