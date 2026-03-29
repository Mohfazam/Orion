import { chromium } from "playwright";
import { OrionState, Finding, PageNode } from "../types";
import { updateRunNode, saveFindings, saveAgentResult } from "../db";
import { askJSON } from "../llm";

const MAX_PAGES = 20;

interface AIPageAnalysis {
  issues: {
    title: string;
    detail: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    confidence: "high" | "medium" | "low";
    fixSuggestion: string;
  }[];
}

const analyzePageWithAI = async (
  url: string,
  pageText: string,
  existingIssues: string[]
): Promise<AIPageAnalysis["issues"]> => {
  const result = await askJSON<AIPageAnalysis>(
    `You are an expert web QA engineer. Analyze this page and find quality issues.
Focus on: accessibility, SEO, UX clarity, content quality, security signals, best practices.
Do NOT repeat these already-detected issues: ${existingIssues.join(", ") || "none"}.
Respond ONLY with valid JSON:
{
  "issues": [
    {
      "title": "short issue title",
      "detail": "clear explanation of the problem",
      "severity": "critical|high|medium|low|info",
      "confidence": "high|medium|low",
      "fixSuggestion": "specific actionable fix in 1-2 sentences"
    }
  ]
}
Return empty issues array if no issues found. Max 5 issues per page.`,
    `URL: ${url}\n\nPage text (truncated to 3000 chars):\n${pageText.slice(0, 3000)}`
  );

  return result?.issues ?? [];
};

export async function discoveryAgent(
  state: OrionState,
  focus?: string
): Promise<OrionState> {
  const { runUUID, url } = state;
  const startedAt = new Date();
  await updateRunNode(runUUID, "discovery_agent", "running");

  console.log(`[discovery] starting crawl of ${url}${focus ? ` | focus: ${focus}` : ""}`);

  const sitemap: PageNode[] = [];
  const findings: Finding[] = [];

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // ── 1. Visit root ──────────────────────────────────────────────────────
    const rootRes = await page.goto(url, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });
    sitemap.push({ url, depth: 0, status: rootRes?.status() ?? 0 });

    // ── 2. Collect internal links ──────────────────────────────────────────
    const baseOrigin = new URL(url).origin;
    const hrefs: string[] = await page.$$eval("a[href]", (els) =>
      els.map((e) => (e as HTMLAnchorElement).href)
    );

    const internalLinks = [
      ...new Set(
        hrefs.filter((h) => {
          try { return new URL(h).origin === baseOrigin; }
          catch { return false; }
        })
      ),
    ].slice(0, MAX_PAGES);

    console.log(`[discovery] found ${internalLinks.length} internal links`);

    // ── 3. Visit + analyse each page ──────────────────────────────────────
    for (const link of internalLinks) {
      try {
        const res = await page.goto(link, {
          timeout: 30_000,
          waitUntil: "domcontentloaded",
        });
        const status = res?.status() ?? 0;
        sitemap.push({ url: link, depth: 1, status });

        // Rule-based checks
        if (status >= 400) {
          findings.push({
            agent: "discovery",
            severity: status >= 500 ? "critical" : "high",
            confidence: "high",
            title: `Broken link — HTTP ${status}`,
            detail: `Page at ${link} returned status ${status}.`,
            file: link,
          });
        }

        const metaDesc = await page.$('meta[name="description"]');
        if (!metaDesc) {
          findings.push({
            agent: "discovery",
            severity: "low",
            confidence: "high",
            title: "Missing meta description",
            detail: `No <meta name="description"> tag found on ${link}.`,
            file: link,
          });
        }

        const title = await page.title();
        if (!title || title.trim() === "") {
          findings.push({
            agent: "discovery",
            severity: "medium",
            confidence: "high",
            title: "Missing page title",
            detail: `No <title> tag found on ${link}.`,
            file: link,
          });
        }

        // AI-powered deep analysis
        const pageText = await page.evaluate(() => document.body?.innerText ?? "");
        const existingTitles = findings.map((f) => f.title);
        const aiIssues = await analyzePageWithAI(link, pageText, existingTitles);

        for (const issue of aiIssues) {
          findings.push({
            agent: "discovery",
            severity: issue.severity,
            confidence: issue.confidence,
            title: issue.title,
            detail: issue.detail,
            file: link,
            fixSuggestion: issue.fixSuggestion,
          });
        }

        console.log(
          `[discovery] ${link} → status: ${status} | ai issues: ${aiIssues.length}`
        );
      } catch (err) {
        console.warn(`[discovery] failed to visit ${link}:`, err);
        sitemap.push({ url: link, depth: 1, status: 0 });
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  await saveFindings(runUUID, findings);
  await saveAgentResult(runUUID, "discovery", { pagesDiscovered: sitemap.length, sitemap }, undefined, startedAt);
  await updateRunNode(runUUID, "discovery_agent", "complete");

  console.log(
    `[discovery] done — ${sitemap.length} pages, ${findings.length} findings`
  );

  return {
    ...state,
    sitemap,
    findings: [...state.findings, ...findings],
    currentNode: "performance_agent",
    error: undefined,
  };
}