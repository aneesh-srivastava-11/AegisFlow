/**
 * Universal Security Analysis Prompt for Gemini
 * Works across ALL programming languages
 */

/**
 * Build the security analysis prompt for Gemini
 * @param {string} diff - The code diff to analyze
 * @param {string} detectedLanguage - Primary detected language
 * @param {string[]} allLanguages - All languages found in the diff
 * @param {Object} languageConfig - Language-specific vulnerability patterns
 * @returns {string}
 */
export function buildSecurityPrompt(diff, detectedLanguage, allLanguages, languageConfig) {
  const languagePatterns = allLanguages
    .map(lang => {
      const config = languageConfig[lang];
      if (!config) return '';
      return `- ${lang}: Watch for ${config.dangerousPatterns.join(', ')}`;
    })
    .filter(Boolean)
    .join('\n');

  return `You are an elite software engineer and application security auditor performing an automated code review. Analyze the following code diff for potential bugs, security vulnerabilities, code smells, and performance bottlenecks.

## ANALYSIS SCOPE
Primary Language: ${detectedLanguage}
All Languages Detected: ${allLanguages.join(', ')}

## LANGUAGE-SPECIFIC PATTERNS TO CHECK
${languagePatterns || 'Use general patterns for all detected languages.'}

## ANALYSIS CATEGORIES TO CHECK

### CRITICAL - Must Block PR
1. **Hardcoded Secrets**: API keys, passwords, tokens, private keys, connection strings (e.g., sk-, pk-, ghp_, AKIA, passwords, secrets in config)
2. **Critical Security Vulnerabilities**: SQL/NoSQL injections, OS command injections, template injections, XML External Entity (XXE)
3. **Remote Code Execution (RCE)**: Unsafe deserialization, use of eval(), exec(), system() calls on untrusted input
4. **Authentication Bypass**: Missing auth checks on sensitive endpoints, broken access control
5. **Cryptographic Failures**: Weak algorithms (MD5, SHA1 for passwords), hardcoded keys or IVs

### HIGH - Request Changes
1. **High Security Risks**: XSS (Cross-Site Scripting), Path Traversal, SSRF, CSRF issues, Insecure CORS
2. **Major Performance Bottlenecks**: Memory leaks, high complexity algorithms, blocking event loops, unbounded loops, massive resource allocations
3. **Severe Logic Bugs**: Race conditions, unhandled exceptions in critical paths, deadlocks, incorrect async/await handling, wrong return values
4. **Insecure Dependencies**: Using packages with known severe vulnerabilities

### MEDIUM - Warn
1. **Code Smells**: Deep nesting, overly long methods, duplicate code, circular dependencies, poor naming conventions, magic numbers
2. **Best Practice Violations**: Deprecated API usage, inconsistent variable scopes, mutating props/state directly
3. **Information Disclosure**: Stack traces or debugging info printed to client or production logs
4. **Incorrect Configuration**: Permissive access rules, debug mode enabled in prod environment

### LOW - Informational
1. **Minor Code Smells**: Unused imports/variables, redundant code, style guide deviations
2. **Minor Performance Issues**: Inefficient string concatenation, lack of simple caching, non-optimal query filters
3. **Documentation**: Missing comments on complex logic, undocumented API changes

## CODE DIFF TO ANALYZE
\`\`\`diff
${diff}
\`\`\`

## OUTPUT FORMAT
Return ONLY a valid JSON object with this exact structure. No markdown, no code fences, no explanation text.

{
  "critical": [
    {
      "type": "Issue Type / Vulnerability Name",
      "severity": "CRITICAL",
      "file": "filename.ext",
      "line": 0,
      "code_snippet": "the problematic line of code",
      "description": "Clear explanation of the bug, security flaw, or bottleneck",
      "impact": "What can go wrong, real-world consequences",
      "fix": "Specific fix code or correction in the same language",
      "cve_reference": "CVE-XXXX-XXXXX or null",
      "confidence": 0.95
    }
  ],
  "high": [],
  "medium": [],
  "low": [],
  "summary": "Human-readable summary: Found X critical, Y high, Z medium, W low issues",
  "recommendation": "BLOCK or REQUEST_CHANGES or APPROVE",
  "language_detected": "${detectedLanguage}",
  "scan_time_ms": 0
}

## RULES
1. ONLY report issues found in ADDED lines (lines starting with +)
2. Do NOT report issues in removed lines (lines starting with -)
3. Be specific - include the exact file, line number, and code snippet
4. Provide actionable fixes in the SAME programming language
5. Set confidence between 0.0 and 1.0 based on certainty
6. Use BLOCK only for critical issues, REQUEST_CHANGES for high, APPROVE if clean
7. Reference real CVEs when the pattern matches a known vulnerability
8. Return ONLY valid JSON - no markdown formatting, no backticks around the JSON
9. If no issues found, return empty arrays and recommendation "APPROVE"
10. Analyze ALL files in the diff, not just the primary language`;
}

/**
 * Build a focused prompt for manual/demo analysis (not a diff)
 * @param {string} code - Raw code to analyze
 * @param {string} language - The programming language
 * @returns {string}
 */
export function buildDemoAnalysisPrompt(code, language) {
  return `You are an elite software engineer and application security auditor. Analyze this ${language} code for potential bugs, security vulnerabilities, code smells, and performance bottlenecks.

## CODE TO ANALYZE
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

## OUTPUT FORMAT
Return ONLY a valid JSON object with this exact structure. No markdown, no code fences, no explanation.

{
  "critical": [
    {
      "type": "Issue Name",
      "severity": "CRITICAL",
      "file": "analyzed_code",
      "line": 0,
      "code_snippet": "the line of code with the issue",
      "description": "Clear explanation",
      "impact": "Real-world consequences",
      "fix": "Specific fix or improvement in ${language}",
      "cve_reference": null,
      "confidence": 0.95
    }
  ],
  "high": [],
  "medium": [],
  "low": [],
  "summary": "Human-readable summary",
  "recommendation": "BLOCK or REQUEST_CHANGES or APPROVE",
  "language_detected": "${language}",
  "scan_time_ms": 0
}

Check for: hardcoded secrets, injection attacks, XSS, CSRF, path traversal, RCE, insecure deserialization, auth bypass, cryptographic failures, race conditions, memory leaks, code smells, performance bottlenecks, and missing error handling.

Return ONLY valid JSON.`;
}
