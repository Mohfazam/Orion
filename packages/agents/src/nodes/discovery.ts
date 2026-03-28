import { chromium } from "playwright";
import { OrionState, Finding, PageNode } from "../types";
import { updateRunNode, saveFindings, saveAgentResult } from "../db";

const MAX_PAGES = 20; // TODO: make configurable per run

export async function discoveryAgent(state: OrionState): Promise<OrionState> {
  const { runUUID, url } = state;
  await updateRunNode(runUUID, "discovery_agent", "running");

  const sitemap: PageNode[] = [];
  const findings: Finding[] = [];

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // ── 1. Visit root ──────────────────────────────────────────────────────
    const rootRes = await page.goto(url, { timeout: 30_000, waitUntil: "domcontentloaded" });
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

    // ── 3. Visit each page ─────────────────────────────────────────────────
    for (const link of internalLinks) {
      try {
        const res = await page.goto(link, { timeout: 15_000, waitUntil: "domcontentloaded" });
        const status = res?.status() ?? 0;
        sitemap.push({ url: link, depth: 1, status });

        // Broken link check
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

        // Missing meta description
        const metaDesc = await page.$('meta[name="description"]');
        if (!metaDesc) {
          findings.push({
            agent: "discovery",
            severity: "low",
            confidence: "high",
            title: "Missing meta description",
            detail: `No <meta name="description"> found on ${link}.`,
            file: link,
          });
        }

        // Missing page title
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

        // TODO: add more checks here — missing alt text, console errors, etc.

      } catch (err) {
        console.warn(`[discovery] failed to visit ${link}:`, err);
        sitemap.push({ url: link, depth: 1, status: 0 });
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  // ── 4. Persist ─────────────────────────────────────────────────────────
  await saveFindings(runUUID, findings);
  await saveAgentResult(runUUID, "discovery", {
    pagesDiscovered: sitemap.length,
    sitemap,
  });
  await updateRunNode(runUUID, "discovery_agent", "complete");

  return {
    ...state,
    sitemap,
    findings: [...state.findings, ...findings],
    currentNode: "performance_agent",
  };
}