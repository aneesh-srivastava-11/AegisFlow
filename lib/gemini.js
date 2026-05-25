import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSecurityPrompt, buildDemoAnalysisPrompt, buildPRDescriptionPrompt } from './prompts/security-analysis.js';
import { detectLanguages, LANGUAGE_CONFIGS } from './prompts/language-configs.js';
import { checkCVEPatterns } from './prompts/cve-database.js';
import { preScreenVulnerabilities } from './vulnerability-detector.js';

/**
 * Lazy-initialized Gemini model instance.
 * Avoids module-level initialization with a potentially empty API key,
 * which would silently create a broken client.
 */
let _model = null;

function getModel(customApiKey) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to your .env.local file or configure it in your Settings.'
    );
  }

  const generationConfig = {
    temperature: 0.1,       // Low temperature for consistent, precise analysis
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
  };

  // If custom key provided, instantiate dynamically to avoid caching a user key
  if (customApiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig });
  }

  if (_model) return _model;

  const genAI = new GoogleGenerativeAI(apiKey);
  _model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig,
  });

  return _model;
}

/**
 * Parse a Gemini response into JSON, with fallback extraction
 * @param {string} text - Raw text response from Gemini
 * @returns {Object} Parsed JSON object
 */
function parseGeminiResponse(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract JSON object from response text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse Gemini response as JSON');
  }
}

/**
 * Call Gemini with retry logic for transient failures
 * @param {string} prompt - The prompt to send
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} Raw text response
 */
async function callGeminiWithRetry(prompt, maxRetries = 2, customApiKey = null) {
  const model = getModel(customApiKey);
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      console.warn(`[Gemini] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on auth errors or invalid requests
      if (error.status === 401 || error.status === 403 || error.status === 400) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Analyze a code diff for security vulnerabilities
 * @param {string} diff - The unified diff content
 * @param {string[]} files - Array of changed file paths
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeCode(diff, files = [], customApiKey = null) {
  const startTime = Date.now();

  try {
    // Detect languages from file paths
    const { primary, all, configs } = detectLanguages(files);

    // Bug #1 fix: Run the pre-screen pipeline first (secrets + dangerous patterns + CVEs)
    // This also deduplicates against Gemini results below.
    const preScreen = preScreenVulnerabilities(diff, files, primary);
    // checkCVEPatterns already called inside preScreen with the correct language
    const cveMatches = preScreen.cveMatches;

    // Truncate diff if too large (Gemini context limit)
    const maxDiffLength = 30000;
    const truncatedDiff = diff.length > maxDiffLength
      ? diff.slice(0, maxDiffLength) + '\n\n[... diff truncated for analysis ...]'
      : diff;

    // Build prompt with (potentially truncated) diff
    const prompt = buildSecurityPrompt(truncatedDiff, primary, all, configs);

    // Call Gemini with retry
    const text = await callGeminiWithRetry(prompt, 2, customApiKey);
    let analysis = parseGeminiResponse(text);

    // Merge CVE pre-screening results
    if (cveMatches.length > 0) {
      for (const cve of cveMatches) {
        const severity = cve.severity.toLowerCase();
        const existingTypes = (analysis[severity] || []).map(v => v.type);
        
        if (!existingTypes.includes(cve.name)) {
          if (!analysis[severity]) analysis[severity] = [];
          analysis[severity].push({
            type: cve.name,
            severity: cve.severity,
            file: 'detected by pattern matching',
            line: 0,
            code_snippet: 'See CVE details',
            description: cve.description,
            impact: cve.impact,
            fix: cve.fix,
            cve_reference: cve.cve_id,
            confidence: 0.9,
          });
        }
      }
    }

    // Recalculate summary
    const criticalCount = (analysis.critical || []).length;
    const highCount = (analysis.high || []).length;
    const mediumCount = (analysis.medium || []).length;
    const lowCount = (analysis.low || []).length;

    analysis.summary = `Found ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low issues`;
    analysis.language_detected = primary;
    analysis.languages_found = all;
    analysis.scan_time_ms = Date.now() - startTime;
    analysis.files_analyzed = files.length;

    // Determine recommendation
    if (criticalCount > 0) {
      analysis.recommendation = 'BLOCK';
    } else if (highCount > 0) {
      analysis.recommendation = 'REQUEST_CHANGES';
    } else {
      analysis.recommendation = 'APPROVE';
    }

    return analysis;
  } catch (error) {
    console.error('[Gemini] Analysis error:', error);
    
    return {
      critical: [],
      high: [],
      medium: [],
      low: [],
      summary: `Analysis error: ${error.message}`,
      recommendation: 'APPROVE',
      language_detected: 'Unknown',
      languages_found: [],
      scan_time_ms: Date.now() - startTime,
      files_analyzed: files.length,
      error: error.message,
    };
  }
}

/**
 * Analyze raw code (not a diff) - for demo/manual analysis
 * @param {string} code - Raw code content
 * @param {string} language - Programming language
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeRawCode(code, language = 'JavaScript', customApiKey = null) {
  const startTime = Date.now();

  try {
    const prompt = buildDemoAnalysisPrompt(code, language);
    const text = await callGeminiWithRetry(prompt, 2, customApiKey);
    let analysis = parseGeminiResponse(text);

    analysis.scan_time_ms = Date.now() - startTime;
    analysis.language_detected = language;
    return analysis;
  } catch (error) {
    console.error('[Gemini] Raw analysis error:', error);
    return {
      critical: [],
      high: [],
      medium: [],
      low: [],
      summary: `Analysis error: ${error.message}`,
      recommendation: 'APPROVE',
      language_detected: language,
      scan_time_ms: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Feature A: Generate a PR description & changelog from a code diff
 * @param {string} diff - Unified diff content
 * @param {string[]} files - Changed file paths
 * @returns {Promise<{title: string, description: string, changelog: string}>}
 */
export async function generatePRDescription(diff, files = [], customApiKey = null) {
  try {
    const { primary } = detectLanguages(files);
    const maxDiffLength = 20000;
    const truncatedDiff = diff.length > maxDiffLength
      ? diff.slice(0, maxDiffLength) + '\n\n[... diff truncated ...]'
      : diff;
    const prompt = buildPRDescriptionPrompt(truncatedDiff, primary, files);
    const text = await callGeminiWithRetry(prompt, 2, customApiKey);
    return parseGeminiResponse(text);
  } catch (error) {
    console.error('[Gemini] PR description error:', error);
    return {
      title: 'Code changes',
      description: 'An error occurred while generating the PR description.',
      changelog: '',
      error: error.message,
    };
  }
}
