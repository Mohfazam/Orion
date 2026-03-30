"use client";

import { motion } from "framer-motion";
import { Cpu, PieChart as PieIcon, BarChart2 as BarIcon } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Finding, AgentInfo, Run } from "../../../../types/orion";
import { ChartTooltip } from "./shared";

export interface FindingsChartsProps {
  findings: Finding[];
  agents: AgentInfo[];
  run?: Run;
}

const AGENT_COLORS: Record<string, string> = {
  discovery: "#2563EB",
  performance: "#7C3AED",
  scoring: "#0891B2",
  visualization: "#059669",
};

const SEV_COLORS = [
  { name: "Critical", color: "#EF4444" },
  { name: "High", color: "#F97316" },
  { name: "Medium", color: "#EAB308" },
  { name: "Low", color: "#3B82F6" },
  { name: "Info", color: "#6B7280" },
];

export function FindingsCharts({ findings, agents, run }: FindingsChartsProps) {
  const agentBreakdown = agents.map((agent) => {
    const fills = {
      discovery: "var(--primary)",
      performance: "#7C3AED",
      scoring: "#0891B2",
      visualization: "var(--success-dark)",
    };
    return {
      agent: agent.name || agent.agent || agent.type,
      findings: findings.filter((f) => (f.agent || f.agentType) === (agent.agent || agent.type)).length,
      fill: (fills as any)[agent.agent || agent.type as keyof typeof fills] || "var(--primary)",
    };
  });

  const svMap = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  if (run?.summary?.bySeverity) {
    svMap.critical = run.summary.bySeverity.critical || 0;
    svMap.high = run.summary.bySeverity.high || 0;
    svMap.medium = run.summary.bySeverity.medium || 0;
    svMap.low = run.summary.bySeverity.low || 0;
    svMap.info = run.summary.bySeverity.info || 0;
  } else {
    findings.forEach((f) => {
      if (svMap[f.severity] !== undefined) svMap[f.severity]++;
    });
  }

  const totalFindings =
    svMap.critical + svMap.high + svMap.medium + svMap.low + svMap.info;

  const sevBreakdown = [
    { name: "Critical", value: svMap.critical, color: "var(--danger)" },
    { name: "High", value: svMap.high, color: "#f97316" },
    { name: "Medium", value: svMap.medium, color: "#eab308" },
    { name: "Low", value: svMap.low, color: "var(--primary-light)" },
    { name: "Info", value: svMap.info, color: "#6b7280" },
  ];

  return (
    <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Agent breakdown */}
      <motion.div
        style={{
          background: "var(--bg-card)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.33 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--primary-bg)",
            }}
          >
            <Cpu size={14} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-main)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Findings by Agent
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
              Which agent found the most
            </p>
          </div>
        </div>

        <div style={{ width: "100%", minHeight: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={agentBreakdown}
              margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-light)"
                vertical={false}
              />
              <XAxis
                dataKey="agent"
                tick={{ fontSize: 11, fill: "var(--text-dim)", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-dim)", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={ChartTooltip} cursor={{ fill: "var(--primary-bg-alt)" }} />
              <Bar dataKey="findings" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {agentBreakdown.map((d, index) => (
                  <Cell key={`${d.agent}-${index}`} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Severity Distribution ── */}
      <motion.div
        style={{
          background: "var(--bg-card)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-muted)",
            }}
          >
            <BarIcon size={14} style={{ color: "#475569" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-main)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Score Breakdown
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
              Severity distribution
            </p>
          </div>
        </div>

        <div style={{ width: "100%", minHeight: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={sevBreakdown}
              margin={{ top: 10, right: 8, left: -24, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-light)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--text-dim)", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-dim)", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: "var(--primary-bg-alt)" }} content={ChartTooltip} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {sevBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Severity donut */}
      <motion.div
        style={{
          background: "var(--bg-card)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--danger-bg)",
            }}
          >
            <PieIcon size={14} style={{ color: "var(--danger-dark)" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-main)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Total Distribution
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
              {totalFindings} total findings
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 140, height: 140, flexShrink: 0, minHeight: 140 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={sevBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90} endAngle={-270}
                  stroke="none"
                >
                  {sevBreakdown.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={ChartTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {sevBreakdown.map((d) => (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: d.color,
                    }}
                  />
                  <span
                    style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}
                  >
                    {d.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      width: Math.max(
                        8,
                        totalFindings ? (d.value / totalFindings) * 60 : 0
                      ),
                      background: d.color + "55",
                      border: `1px solid ${d.color}88`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      width: 20,
                      textAlign: "right",
                      color: "var(--text-main)",
                    }}
                  >
                    {d.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}