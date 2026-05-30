# AegisFlow — AI-Powered Security Analysis

AegisFlow is a premium, real-time, automated AI code reviewer built to inspect GitHub pull requests for security vulnerabilities, hardcoded credentials, and CVE pattern matches before code merges. Powered by Google Gemini 2.0 Flash and optimized using a high-performance Neon PostgreSQL serverless backend.

---

## 🚀 Features & Capabilities

- **Automated GitHub App Integration** — Subscribes to webhook events, processes pull requests in the background, and comments suggestions back on the PR.
- **PR Summary & Auto-Changelog** — Generates a concise summary, title proposal, and code changelog for every scanned pull request to assist code reviewers.
- **Enterprise Policy Gate Engine** — Customize quality thresholds (e.g., Block Merge on Critical/High vulnerabilities), toggle auto-approvals for clean code, and configure file paths to exclude from analysis.
- **Token Cache Pipeline** — Implements an encrypted, short-lived cache store in Neon DB for GitHub App installation access tokens, protecting pipelines from API rate limits.
- **Vulnerability Scanner Engine** — Recognizes over 50 vulnerability types (SQL injection, XSS, SSRF, memory leaks, RCEs, etc.) across 20+ programming languages.
- **Universal CVE Regex Pre-Screening** — Runs sub-millisecond local pattern matching for known CVE footprints (Log4Shell, Prototype Pollution, NPM supply chain malware) to augment AI results.
- **Manual PR Scan & Sandbox Editor** — Developers can scan direct PR links or run live code inside a browser-based Sandbox editor with instant diagnostic ratings.
- **Analytics & History Console** — Real-time analytics dashboards presenting daily scans, severity metrics, language stats, and webhook diagnostics history.
- **Breach Showcase Library** — Interactive educational catalog detailing famous real-world breaches, showing their vulnerable source code and how AegisFlow detects them.

---

## 🛠️ Tech Stack & Database Architecture

AegisFlow utilizes a modern serverless stack:
- **Frontend/Backend Routing**: Next.js (App Router)
- **AI Model**: Google Gemini 2.0 Flash (`@google/generative-ai`)
- **Database Engine**: **Neon serverless PostgreSQL** (`@neondatabase/serverless`)
- **Authentication**: Firebase Authentication (Client/Admin SDK - Email & Password signup only)

### Neon Database Schema

To support high-performance serverless storage, the schema is structured into 9 PostgreSQL tables with optimal indexes:

| Table | Columns | Indexes |
|-------|---------|---------|
| **`users`** | `uid` (PK), `email`, `gemini_api_key`, `github_owner`, `policy_severity_threshold`, `policy_auto_approve`, `policy_ignored_dirs`, `updated_at` | Primary Key |
| **`installation_token_cache`** | `installation_id` (PK), `token`, `expires_at`, `updated_at` | Primary Key |
| **`analyses`** | `id` (Serial PK), `repository_id`, `pull_request_number`, `pull_request_title`, `pull_request_author`, `pull_request_url`, `pull_request_head_sha`, `results_critical` (JSONB), `results_high` (JSONB), `results_medium` (JSONB), `results_low` (JSONB), `results_summary`, `results_recommendation`, `metadata_language_detected`, `metadata_languages_found` (JSONB), `metadata_scan_time_ms`, `metadata_files_analyzed`, `risk_score`, `risk_level`, `risk_total_issues`, `risk_breakdown` (JSONB), `status`, `source`, `error`, `created_at`, `updated_at` | `repo_date_idx`, `pr_repo_idx`, `status_idx`, `date_idx` |
| **`repositories`** | `full_name` (PK), `owner`, `repo`, `installation_id` (BigInt), `last_analyzed_at`, `stats_total_analyses`, `stats_total_vulnerabilities`, `stats_critical_count`, `stats_high_count`, `stats_medium_count`, `stats_low_count`, `stats_breaches_prevented`, `stats_languages_analyzed` (JSONB), `created_at`, `updated_at` | Primary Key |
| **`vulnerabilities`** | `id` (Serial PK), `type`, `severity`, `language`, `repository_id`, `pull_number`, `file`, `line`, `description`, `impact`, `fix`, `cve_reference`, `confidence`, `detected_at` | `type_severity_idx`, `language_idx`, `vuln_repo_idx`, `vuln_date_idx` |
| **`breach_database`** | `slug` (PK), `name`, `category`, `year`, `description`, `affected_users`, `financial_impact`, `severity`, `vulnerable_code`, `language`, `detection_points` (JSONB), `cve`, `lessons` (JSONB), `what_happened`, `our_detection`, `created_at` | `breach_year_idx` |
| **`cve_patterns`** | `id` (PK), `name`, `severity`, `description`, `languages` (JSONB), `examples` (JSONB), `cwe` | Primary Key |
| **`webhook_logs`** | `id` (Serial PK), `delivery_id`, `event`, `source`, `status`, `repository_id`, `pull_number`, `recommendation`, `scan_time_ms`, `error`, `reason`, `received_at`, `completed_at` | `wlog_date_idx`, `wlog_source_status_idx`, `wlog_repo_idx` |
| **`rate_limits`** | `id` (PK), `timestamps` (JSONB), `allowed`, `created_at`, `updated_at` | Primary Key |

---

## 🐞 Identified & Resolved Bugs

1. **GitHub App Token Caching**: Webhooks originally requested installation tokens on every trigger. High commit volumes hit API rate limits. Token values are now securely stored and reused from Neon DB until expiration.
2. **Serverless Interval Memory Leak**: Replaced background `setInterval` timers in the rate limiter with inline timestamp pruning (triggered statistically on checks) to prevent memory resource leaks in frozen serverless runs.
3. **Missing Config Crash Protection**: Ensured invalid or missing GITHUB_APP_PRIVATE_KEY configurations output meaningful logs instead of crashing standard Node.js signature processes.
4. **GitLab Webhook Project Namespace Bug**: Fixed incorrect payload reference mappings that recorded repository owner namespace values as `[object Object]` strings.
5. **Firebase Client SDK Emulator Fallbacks**: Corrected missing mock definitions in firebase auth context classes for local development settings.

---

## ⚡ Prerequisites & Setup

1. **Google Gemini API Key**: Generate a free-tier key in [Google AI Studio](https://aistudio.google.com/).
2. **Neon Database URL**: Create a free PostgreSQL cluster in [Neon Console](https://neon.tech/) and grab the connection URL.
3. **Firebase Credentials**: Set up email & password provider auth inside your Firebase project.
4. **GitHub App Details**: Create a GitHub App mapping events to your AegisFlow webhook route.

### Clone & Dependencies Installation

```bash
git clone https://github.com/your-username/code-review-ai.git
cd code-review-ai
npm install
```

### Environment Configuration

Copy `.env.example` into `.env.local` and populate the fields:

```bash
# Database connection (Neon Postgres)
DATABASE_URL=postgresql://user:password@ep-cool-snowflake-a5xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# AI Configuration
GEMINI_API_KEY=AIzaSyD-xxx...

# Local Development Overrides
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: GitHub Personal Access Token (for manual local tests)
GITHUB_TOKEN=ghp_xxx...
```

### Database Initialization & Seeding

Deploy schemas and seed datasets automatically:

1. Start development server:
   ```bash
   npm run dev
   ```
2. Run connection tests:
   ```bash
   node scripts/test-db.js
   ```
3. Seeding mock user (for local testing credentials: `test1@test.com` / `test1234`):
   ```bash
   node scripts/seed-test-user.js
   ```
4. Perform one-click database tables setup by logging in as Admin and triggering `/api/setup` (or visit the `/install` page).

---

## 🛡️ API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/api/github/webhook` | Receives, verifies signatures, and processes GitHub pull request reviews |
| **POST** | `/api/analyze` | Triggers a manual GitHub PR link review or a sandbox editor code review |
| **GET** | `/api/stats` | Returns real-time metrics, severities, daily scan trends, and performance metrics |
| **GET** | `/api/analyses` | Retrieves paginated listing of completed PR reviews |
| **GET** | `/api/webhook-logs` | Provides diagnostic tracking history for webhooks |
| **POST** | `/api/setup` | Initializes Neon tables, custom indexes, and seeds famous breaches and CVE patterns |

---

## 📄 License

MIT License.
