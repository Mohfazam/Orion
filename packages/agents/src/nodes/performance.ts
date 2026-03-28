import { OrionState, Finding } from "../types";
import { updateRunNode, saveFindings, saveAgentResult } from "../db";
import { ask } from "../llm";

const THRESHOLDS = {
  performance: { critical: 30, high: 50, medium: 70 },
  lcp:  { critical: 6000, high: 4000, medium: 2500 },
  fcp:  { critical: 4000, high: 3000, medium: 1800 },
  tbt:  { critical: 600,  high: 300,  medium: 200  },
  cls:  { critical: 0.25, high: 0.1,  medium: 0.05 },
};

const getSeverity = (
  value: number,
  thresholds: { critical: number; high: number; medium: number },
  invert = false
): "critical" | "high" | "medium" | null => {
  const exceeds = (a: number, b: number) => (invert ? a < b : a > b);
  if (exceeds(value, thresholds.critical)) return "critical";
  if (exceeds(value, thresholds.high))     return "high";
  if (exceeds(value, thresholds.medium))   return "medium";
  return null;
};

const getAIFixSuggestion = async (
  url: string,
  metric: string,
  value: string
): Promise<string> => {
  return await ask(
    `You are a web performance expert. Give a specific, actionable fix suggestion in 2 sentences max.`,
    `Page: ${url}\nIssue: ${metric} is ${value}\nWhat is the most impactful fix?`
  );
};

export async function performanceAgent(
  state: OrionState,
  focus?: string
): Promise<OrionState> {
  const { runUUID, sitemap } = state;
  const startedAt = new Date();
  await updateRunNode(runUUID, "performance_agent", "running");

  const findings: Finding[] = [];
  const pageResults: Record<string, unknown>[] = [];

  const pagesToTest = sitemap
    .filter((p) => p.status === 200)
    .slice(0, 3); // cap for demo speed

  console.log(`[performance] testing ${pagesToTest.length} pages${focus ? ` | focus: ${focus}` : ""}`);

  for (const page of pagesToTest) {
    try {
      const { default: lighthouse } = await import("lighthouse");
      const { chromium } = await import("playwright");

      const browser = await chromium.launch({
        headless: true,
        args: ["--remote-debugging-port=9222"],
      });

      const result = await lighthouse(page.url, {
        port: 9222,
        output: "json",
        onlyCategories: ["performance"],
        logLevel: "error",
      });

      await browser.close();

      if (!result?.lhr) continue;

      const lhr    = result.lhr;
      const score  = Math.round((lhr.categories["performance"]?.score ?? 0) * 100);
      const audits = lhr.audits;
      const lcp    = audits["largest-contentful-paint"]?.numericValue ?? 0;
      const fcp    = audits["first-contentful-paint"]?.numericValue   ?? 0;
      const tbt    = audits["total-blocking-time"]?.numericValue      ?? 0;
      const cls    = audits["cumulative-layout-shift"]?.numericValue  ?? 0;

      pageResults.push({ url: page.url, score, lcp, fcp, tbt, cls });
      console.log(`[performance] ${page.url} → score: ${score} lcp: ${lcp}ms`);

      // Performance score
      const perfSev = getSeverity(score, THRESHOLDS.performance, true);
      if (perfSev) {
        const fix = await getAIFixSuggestion(
          page.url,
          "Lighthouse performance score",
          `${score}/100`
        );
        findings.push({
          agent: "performance",
          severity: perfSev,
          confidence: "high",
          title: `Low performance score on ${new URL(page.url).pathname}`,
          detail: `Lighthouse score is ${score}/100. Target: > 70.`,
          file: page.url,
          fixSuggestion: fix,
        });
      }

      // LCP
      const lcpSev = getSeverity(lcp, THRESHOLDS.lcp);
      if (lcpSev) {
        const fix = await getAIFixSuggestion(
          page.url,
          "Largest Contentful Paint",
          `${(lcp / 1000).toFixed(2)}s`
        );
        findings.push({
          agent: "performance",
          severity: lcpSev,
          confidence: "high",
          title: `Slow LCP on ${new URL(page.url).pathname}`,
          detail: `LCP is ${(lcp / 1000).toFixed(2)}s. Target: < 2.5s.`,
          file: page.url,
          fixSuggestion: fix,
        });
      }

      // CLS
      const clsSev = getSeverity(cls, THRESHOLDS.cls);
      if (clsSev) {
        const fix = await getAIFixSuggestion(
          page.url,
          "Cumulative Layout Shift",
          cls.toFixed(3)
        );
        findings.push({
          agent: "performance",
          severity: clsSev,
          confidence: "high",
          title: `High CLS on ${new URL(page.url).pathname}`,
          detail: `CLS is ${cls.toFixed(3)}. Target: < 0.1.`,
          file: page.url,
          fixSuggestion: fix,
        });
      }

      // TBT
      const tbtSev = getSeverity(tbt, THRESHOLDS.tbt);
      if (tbtSev) {
        const fix = await getAIFixSuggestion(
          page.url,
          "Total Blocking Time",
          `${tbt}ms`
        );
        findings.push({
          agent: "performance",
          severity: tbtSev,
          confidence: "high",
          title: `High TBT on ${new URL(page.url).pathname}`,
          detail: `TBT is ${tbt}ms. Target: < 200ms.`,
          file: page.url,
          fixSuggestion: fix,
        });
      }

    } catch (err) {
      console.warn(`[performance] lighthouse failed for ${page.url}:`, err);
    }
  }

  await saveFindings(runUUID, findings);
  await saveAgentResult(runUUID, "performance", { pagesDiscovered: sitemap.length, sitemap }, undefined, startedAt);
  await updateRunNode(runUUID, "performance_agent", "complete");

  console.log(`[performance] done — ${findings.length} findings`);

  return {
    ...state,
    findings: [...state.findings, ...findings],
    currentNode: "scoring_agent",
    error: undefined,
  };
}