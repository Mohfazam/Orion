import { OrionState, Finding } from "../types";
import { updateRunNode, saveFindings, saveAgentResult } from "../db";

// Thresholds based on Google Core Web Vitals
const THRESHOLDS = {
  performance: { critical: 30, high: 50, medium: 70 },
  lcp:         { critical: 6000, high: 4000, medium: 2500 },   // ms
  fcp:         { critical: 4000, high: 3000, medium: 1800 },   // ms
  tbt:         { critical: 600,  high: 300,  medium: 200 },    // ms
  cls:         { critical: 0.25, high: 0.1,  medium: 0.05 },
};

const severity = (value: number, thresholds: { critical: number; high: number; medium: number }, invert = false) => {
  const exceeds = (a: number, b: number) => invert ? a < b : a > b;
  if (exceeds(value, thresholds.critical)) return "critical" as const;
  if (exceeds(value, thresholds.high))     return "high" as const;
  if (exceeds(value, thresholds.medium))   return "medium" as const;
  return null;
};

export async function performanceAgent(state: OrionState): Promise<OrionState> {
  const { runUUID, sitemap } = state;
  await updateRunNode(runUUID, "performance_agent", "running");

  const findings: Finding[] = [];
  const pageResults: Record<string, unknown>[] = [];

  // Run Lighthouse on root + first 3 pages (keep demo fast)
  // TODO: run on all pages and parallelise
  const pagesToTest = sitemap.filter((p) => p.status === 200).slice(0, 3);

  for (const page of pagesToTest) {
    try {
      // Dynamic import — lighthouse is ESM
      const { default: lighthouse } = await import("lighthouse");
      const { chromium } = await import("playwright");

      const browser = await chromium.launch({ headless: true, args: ["--remote-debugging-port=9222"] });

      const result = await lighthouse(page.url, {
        port: 9222,
        output: "json",
        onlyCategories: ["performance"],
        logLevel: "error",
      });

      await browser.close();

      if (!result?.lhr) continue;

      const lhr = result.lhr;
      const score = Math.round((lhr.categories["performance"]?.score ?? 0) * 100);
      const audits = lhr.audits;

      const lcp = (audits["largest-contentful-paint"]?.numericValue ?? 0);
      const fcp = (audits["first-contentful-paint"]?.numericValue ?? 0);
      const tbt = (audits["total-blocking-time"]?.numericValue ?? 0);
      const cls = (audits["cumulative-layout-shift"]?.numericValue ?? 0);

      pageResults.push({ url: page.url, score, lcp, fcp, tbt, cls });

      // Performance score finding
      const perfSev = severity(score, THRESHOLDS.performance, true);
      if (perfSev) {
        findings.push({
          agent: "performance",
          severity: perfSev,
          confidence: "high",
          title: `Low performance score on ${new URL(page.url).pathname}`,
          detail: `Lighthouse performance score is ${score}/100.`,
          file: page.url,
        });
      }

      // LCP finding
      const lcpSev = severity(lcp, THRESHOLDS.lcp);
      if (lcpSev) {
        findings.push({
          agent: "performance",
          severity: lcpSev,
          confidence: "high",
          title: `Slow LCP on ${new URL(page.url).pathname}`,
          detail: `Largest Contentful Paint is ${(lcp / 1000).toFixed(2)}s. Target: < 2.5s.`,
          file: page.url,
        });
      }

      // CLS finding
      const clsSev = severity(cls, THRESHOLDS.cls);
      if (clsSev) {
        findings.push({
          agent: "performance",
          severity: clsSev,
          confidence: "high",
          title: `High CLS on ${new URL(page.url).pathname}`,
          detail: `Cumulative Layout Shift is ${cls.toFixed(3)}. Target: < 0.1.`,
          file: page.url,
        });
      }

      // TODO: add TBT, FCP, TTI findings here

    } catch (err) {
      console.warn(`[performance] lighthouse failed for ${page.url}:`, err);
    }
  }

  await saveFindings(runUUID, findings);
  await saveAgentResult(runUUID, "performance", { pages: pageResults });
  await updateRunNode(runUUID, "performance_agent", "complete");

  return {
    ...state,
    findings: [...state.findings, ...findings],
    currentNode: "scoring_agent",
  };
}