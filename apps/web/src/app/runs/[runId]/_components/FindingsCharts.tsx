"use client";

import { motion } from "framer-motion";
import { Cpu, PieChart as PieIcon } from "lucide-react";
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
    const key = agent.type.replace("_agent", "");
    return {
      agent: agent.name || key,
      findings: findings.filter(f => f.agentType?.replace("_agent", "") === key).length,
      fill: AGENT_COLORS[key] || "#2563EB",
    };
  });

  const svMap = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  if (run?.summary?.bySeverity) {
    Object.assign(svMap, run.summary.bySeverity);
  } else {
    findings.forEach(f => { if (svMap[f.severity] !== undefined) svMap[f.severity]++; });
  }

  const totalFindings = Object.values(svMap).reduce((a, b) => a + b, 0);
  const sevBreakdown = SEV_COLORS.map((s, i) => ({
    ...s,
    value: Object.values(svMap)[i],
  }));

  return (
    <div className="flex flex-col gap-4">

      <motion.div
        className="card p-5 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.33 }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-light)", border: "1px solid var(--accent-mid)" }}
          >
            <Cpu size={14} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Findings by Agent
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Which agent found the most</p>
          </div>
        </div>

        <div style={{ height: 144 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agentBreakdown} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF8" vertical={false} />
              <XAxis
                dataKey="agent"
                tick={{ fontSize: 10, fill: "#8B97B5", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8B97B5", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={ChartTooltip} cursor={{ fill: "#EEF3FF" }} />
              <Bar dataKey="findings" radius={[8, 8, 0, 0]} maxBarSize={36}>
                {agentBreakdown.map((d) => (
                  <Cell key={d.agent} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Severity Distribution ── */}
      <motion.div
        className="card p-5 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}
          >
            <PieIcon size={14} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Severity Distribution
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {totalFindings} total findings recorded
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Donut */}
          <div style={{ width: 108, height: 108, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sevBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={30} outerRadius={50}
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

          {/* Legend */}
          <div className="flex flex-col gap-2 flex-1 pt-2">
            {sevBreakdown.filter(d => (d.value ?? 0) > 0).map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
                    {d.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: Math.max(8, totalFindings ? ((d.value ?? 0) / totalFindings) * 50 : 0),
                      background: d.color + "33",
                    }}
                  />
                  <span className="text-xs font-bold w-4 text-right" style={{ color: "#0F172A" }}>
                    {d.value ?? 0}
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