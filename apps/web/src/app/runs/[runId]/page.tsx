"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Target, ChevronRight } from "lucide-react";

import { Run, AgentInfo, Finding, RunDiff } from "../../../types/orion";
import { runsService } from "../../../services/runs.service";
import { findingsService } from "../../../services/findings.service";
import { agentsService } from "../../../services/agents.service";
import { useRunSocket } from "../../../hooks/useRunSocket";
import { usePolling } from "../../../hooks/usePolling";

import { FontStyle, StatusBadge } from "./_components/shared";
import { RunHero } from "./_components/RunHero";
import { PipelineStepper } from "./_components/PipelineStepper";
import { FindingsTable, SevFilter } from "./_components/FindingsTable";
import { FindingsCharts } from "./_components/FindingsCharts";
import { DiffPanel } from "./_components/DiffPanel";
import { LiveLogFeed, LogEntry } from "./_components/LiveLogFeed";
import { FindingDrawer } from "./_components/FindingDrawer";

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();

  // Core State
  const [run, setRun] = useState<Run | null>(null);
  const [isLoadingRun, setIsLoadingRun] = useState(true);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [diffData, setDiffData] = useState<RunDiff | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Findings State
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingsTotal, setFindingsTotal] = useState(0);
  const [findingsPage, setFindingsPage] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [sevFilter, setSevFilter] = useState<SevFilter>("All");
  
  // Drawer State
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);

  // Hooks
  const { lastEvent, isConnected } = useRunSocket(runId);
  const { status: polledStatus } = usePolling(runId, run?.status);

  // 1. Initial Load (Run + Agents)
  useEffect(() => {
    setIsLoadingRun(true);
    
    Promise.all([
      runsService.getRunById(runId).catch(e => { console.error(e); return null; }),
      agentsService.getRunAgents(runId).catch(e => { console.error(e); return []; })
    ]).then(([rData, aData]) => {
      setRun(rData);
      setAgents(aData || []);
      
      if (rData?.prevRunId) {
        runsService.getRunDiff(rData.runId, rData.prevRunId)
          .then(setDiffData)
          .catch(console.error);
      }
    }).finally(() => {
      setIsLoadingRun(false);
    });
  }, [runId]);

  // 2. Findings Load
  useEffect(() => {
    const fetchFindings = async () => {
      try {
        const params: any = { limit: 20, page: findingsPage };
        if (sevFilter !== "All") params.severity = sevFilter.toLowerCase();
        
        const res = await findingsService.getRunFindings(runId, params);
        setFindings(res.data || []);
        setFindingsTotal(res.total || 0);
        setHasPrev(res.hasPrev || false);
        setHasNext(res.hasNext || false);
      } catch (err) {
        console.error("Failed fetching findings", err);
      }
    };
    fetchFindings();
  }, [runId, findingsPage, sevFilter]);

  // 3. Socket Event Handling
  useEffect(() => {
    if (!lastEvent) return;
    
    if (lastEvent.type === 'agent_started') {
      setAgents(prev => prev.map(a => 
        a.type === lastEvent.payload?.agent ? { ...a, status: 'running' } : a
      ));
    } 
    else if (lastEvent.type === 'agent_completed') {
      setAgents(prev => prev.map(a => 
        a.type === lastEvent.payload?.agent 
          ? { ...a, status: 'complete', durationMs: lastEvent.payload?.durationMs, score: lastEvent.payload?.score } 
          : a
      ));
    } 
    else if (lastEvent.type === 'score_updated') {
      setRun(prev => prev ? { ...prev, overallScore: lastEvent.payload?.score } : prev);
    } 
    else if (lastEvent.type === 'run.complete' || lastEvent.type === 'run.failed') {
      runsService.getRunById(runId).then(r => {
        setRun(r);
        if (r.prevRunId) {
          runsService.getRunDiff(r.runId, r.prevRunId).then(setDiffData).catch(console.error);
        }
      });
      agentsService.getRunAgents(runId).then(setAgents);
    } 
    else if (lastEvent.type === 'node.log') {
      setLogs(prev => [...prev, lastEvent.payload as LogEntry]);
    }
  }, [lastEvent, runId]);

  // 4. Polling Fallback Action
  useEffect(() => {
    if (!isConnected && (polledStatus === 'complete' || polledStatus === 'failed')) {
      if (run?.status === 'queued' || run?.status === 'running') {
        runsService.getRunById(runId).then(setRun);
        agentsService.getRunAgents(runId).then(setAgents);
      }
    }
  }, [polledStatus, isConnected, run?.status, runId]);

  // Action Handlers
  const handleCancel = () => {
    runsService.cancelRun(runId).then(() => {
      setRun(prev => prev ? { ...prev, status: 'failed' } : prev);
    }).catch(console.error);
  };

  const handleRowClick = (findingId: string) => {
    findingsService.getFindingById(findingId)
      .then(setActiveFinding)
      .catch(console.error);
  };

  if (isLoadingRun) {
    return (
      <div className="min-h-screen bg-[#F7F9FF] flex items-center justify-center font-semibold text-slate-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading Run Profile...
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-[#F7F9FF] flex items-center justify-center font-semibold text-slate-500">
        Run Profile {runId} not found.
      </div>
    );
  }

  const isLive = run.status === 'queued' || run.status === 'running';

  return (
    <>
      <FontStyle />
      <div className="min-h-screen" style={{ background: "#F7F9FF" }}>
        
        <nav
          className="sticky top-0 z-50 flex items-center justify-between px-5 py-3"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderBottom: "1px solid #EFF3FB",
            height: 56,
          }}
        >
          <div className="flex items-center gap-4">
            <motion.a
              href="/"
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: "#64748B", textDecoration: "none" }}
              whileHover={{ color: "#1D4ED8" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "#F0F5FF", border: "1px solid #DBEAFE" }}
              >
                <ArrowLeft size={13} style={{ color: "#2563EB" }} />
              </div>
              <span className="hidden sm:inline">All runs</span>
            </motion.a>

            <div style={{ width: 1, height: 20, background: "#E2E8F0" }} />

            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "#2563EB" }}
              >
                <Target size={13} style={{ color: "#fff" }} />
              </div>
              <span className="bricolage font-bold text-lg tracking-tight" style={{ color: "#0F172A" }}>
                Orion
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1 text-xs" style={{ color: "#94A3B8" }}>
              <ChevronRight size={13} />
              <span className="font-medium" style={{ color: "#64748B" }}>Runs</span>
              <ChevronRight size={13} />
              <span
                className="font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "#F0F5FF", color: "#2563EB", fontSize: 11 }}
              >
                {run.runId || run.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={run.status} />
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)" }}
            >
              T
            </div>
          </div>
        </nav>

        <RunHero run={run} onCancel={handleCancel} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <PipelineStepper agents={agents} />

          <div className="flex flex-col xl:flex-row gap-6">
            <FindingsTable 
              findings={findings}
              totalFindings={findingsTotal}
              sevFilter={sevFilter}
              onSevFilterChange={setSevFilter}
              onRowClick={handleRowClick}
              page={findingsPage}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onPageChange={setFindingsPage}
            />
            
            <FindingsCharts findings={findings} agents={agents} />
          </div>

          {diffData && (
            <DiffPanel diff={diffData} />
          )}

          {isLive && (
            <LiveLogFeed logs={logs} />
          )}

          <div style={{ height: 32 }} />
        </div>
      </div>

      <FindingDrawer finding={activeFinding} onClose={() => setActiveFinding(null)} />
    </>
  );
}
