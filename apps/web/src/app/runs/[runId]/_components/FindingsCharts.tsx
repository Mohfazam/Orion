"use client";

import { motion } from "framer-motion";
import { Cpu, PieChart as PieIcon, BarChart as BarIcon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Finding, AgentInfo, Run } from "../../../../types/orion";
import { ChartTooltip } from "./shared";

export interface FindingsChartsProps {
  findings: Finding[];
  agents: AgentInfo[];
  run?: Run;
}

export function FindingsCharts({ findings, agents, run }: FindingsChartsProps) {
  const agentBreakdown = agents.map((agent) => {
    const fills = {
      discovery: "#2563EB",
      performance: "#7C3AED",
      scoring: "#0891B2",
      visualization: "#059669",
    };
    return {
      agent: agent.name || agent.type,
      findings: findings.filter(f => f.agentType === agent.type).length,
      fill: (fills as any)[agent.type] || "#2563EB"
    };
  });

  const svMap = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  if (run?.summary?.bySeverity) {
    svMap.critical = run.summary.bySeverity.critical || 0;
    svMap.high     = run.summary.bySeverity.high || 0;
    svMap.medium   = run.summary.bySeverity.medium || 0;
    svMap.low      = run.summary.bySeverity.low || 0;
    svMap.info     = run.summary.bySeverity.info || 0;
  } else {
    findings.forEach(f => { if (svMap[f.severity] !== undefined) svMap[f.severity]++ });
  }

  const totalFindings = svMap.critical + svMap.high + svMap.medium + svMap.low + svMap.info;

  const sevBreakdown = [
    { name: "Critical", value: svMap.critical,  color: "#ef4444" },
    { name: "High",     value: svMap.high,      color: "#f97316" },
    { name: "Medium",   value: svMap.medium,    color: "#eab308" },
    { name: "Low",      value: svMap.low,       color: "#3b82f6" },
    { name: "Info",     value: svMap.info,      color: "#6b7280" },
  ];

  return (
    <div className="xl:flex-[2] flex flex-col gap-4">
      {/* Agent breakdown */}
      <motion.div
        className="bg-white rounded-2xl p-5"
        style={{ border: "1px solid #EFF3FB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#EFF6FF" }}
          >
            <Cpu size={14} style={{ color: "#2563EB" }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "#0F172A" }}>
              Findings by Agent
            </h3>
            <p className="text-xs" style={{ color: "#94A3B8" }}>Which agent found the most</p>
          </div>
        </div>

        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agentBreakdown} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="agent"
                tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={ChartTooltip} cursor={{ fill: "#F0F5FF" }} />
              <Bar dataKey="findings" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {agentBreakdown.map((d) => (
                  <Cell key={d.agent} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Severity breakdown (Bar Chart) */}
      <motion.div
        className="bg-white rounded-2xl p-5"
        style={{ border: "1px solid #EFF3FB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.40 }}
      >
        <div className="flex items-center gap-2 mb-4">
           <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50" style={{ background: "#F8FAFC" }}>
             <BarIcon size={14} style={{ color: "#475569" }} />
           </div>
           <div>
             <h3 className="font-bold text-sm" style={{ color: "#0F172A" }}>Score Breakdown</h3>
             <p className="text-xs" style={{ color: "#94A3B8" }}>Severity distribution</p>
           </div>
        </div>

        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sevBreakdown} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#F0F5FF" }} content={ChartTooltip} />
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
        className="bg-white rounded-2xl p-5"
        style={{ border: "1px solid #EFF3FB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#FEF2F2" }}
          >
            <PieIcon size={14} style={{ color: "#DC2626" }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "#0F172A" }}>
              Total Distribution
            </h3>
            <p className="text-xs" style={{ color: "#94A3B8" }}>{totalFindings} total findings</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div style={{ width: 120, height: 120, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sevBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
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

          <div className="flex flex-col gap-1.5 flex-1">
            {sevBreakdown.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="text-xs font-medium" style={{ color: "#64748B" }}>
                    {d.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: Math.max(8, totalFindings ? (d.value / totalFindings) * 60 : 0),
                      background: d.color + "55",
                      border: `1px solid ${d.color}88`,
                    }}
                  />
                  <span className="text-xs font-bold w-5 text-right" style={{ color: "#0F172A" }}>
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
