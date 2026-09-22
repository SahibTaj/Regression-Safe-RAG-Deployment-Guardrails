"use client";

import Sidebar from "@/components/Sidebar";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const scoreHistory = [
  {
    version: "V1",
    date: "14 Sep",
    faithfulness: 95.2,
    coverage: 92.1,
    finalScore: 94.3,
  },
  {
    version: "V2",
    date: "15 Sep",
    faithfulness: 94.8,
    coverage: 91.7,
    finalScore: 93.9,
  },
  {
    version: "V3",
    date: "16 Sep",
    faithfulness: 94.1,
    coverage: 92.8,
    finalScore: 93.7,
  },
  {
    version: "V4",
    date: "17 Sep",
    faithfulness: 93.5,
    coverage: 93.4,
    finalScore: 93.2,
  },
  {
    version: "V5",
    date: "18 Sep",
    faithfulness: 91.4,
    coverage: 94.8,
    finalScore: 92.4,
  },
];

const deploymentData = [
  {
    name: "Promoted",
    value: 20,
  },
  {
    name: "Blocked",
    value: 4,
  },
];

const regressionData = [
  {
    metric: "Faithfulness",
    regressions: 4,
  },
  {
    metric: "Coverage",
    regressions: 1,
  },
  {
    metric: "Final Score",
    regressions: 3,
  },
];

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "8px",
  color: "#ffffff",
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="ml-64 min-h-screen p-8">
        {/* Header */}

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <BarChart3 size={16} />

            LLMOps / Analytics
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Evaluation Analytics
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Track RAG quality, deployment decisions, and evaluation
            regressions across candidate versions.
          </p>
        </header>

        {/* Top metrics */}

        <section className="grid grid-cols-4 gap-4">
          <AnalyticsCard
            label="Average Faithfulness"
            value="94.0%"
            change="-1.2%"
            negative
            icon={ShieldAlert}
          />

          <AnalyticsCard
            label="Average Coverage"
            value="92.9%"
            change="+0.6%"
            icon={Activity}
          />

          <AnalyticsCard
            label="Promotion Rate"
            value="83.3%"
            change="20 / 24 runs"
            icon={CheckCircle2}
          />

          <AnalyticsCard
            label="Blocked Runs"
            value="4"
            change="16.7% of runs"
            negative
            icon={AlertTriangle}
          />
        </section>

        {/* Main chart */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Quality Trend
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Evaluation Scores Over Time
              </h2>

              <p className="mt-1 text-xs text-zinc-600">
                Historical scores across accepted and candidate runs.
              </p>
            </div>

            <div className="flex gap-5 text-xs">
              <Legend
                label="Faithfulness"
                className="bg-zinc-300"
              />

              <Legend
                label="Coverage"
                className="bg-zinc-500"
              />

              <Legend
                label="Final Score"
                className="bg-zinc-700"
              />
            </div>
          </div>

          <div className="mt-8 h-[330px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={scoreHistory}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fill: "#71717a",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[88, 100]}
                  tick={{
                    fill: "#71717a",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{
                    stroke: "#52525b",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="faithfulness"
                  stroke="#d4d4d8"
                  fill="#d4d4d8"
                  fillOpacity={0.05}
                  strokeWidth={2}
                  name="Faithfulness"
                />

                <Area
                  type="monotone"
                  dataKey="coverage"
                  stroke="#71717a"
                  fill="#71717a"
                  fillOpacity={0.03}
                  strokeWidth={2}
                  name="Coverage"
                />

                <Area
                  type="monotone"
                  dataKey="finalScore"
                  stroke="#52525b"
                  fill="#52525b"
                  fillOpacity={0.02}
                  strokeWidth={2}
                  name="Final Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Second row */}

        <section className="mt-6 grid grid-cols-2 gap-6">
          {/* Deployment distribution */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Deployment Outcomes
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Promotion vs Blocked
              </h2>
            </div>

            <div className="mt-6 flex items-center">
              <div className="h-[230px] w-1/2">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={deploymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      <Cell fill="#22c55e" />

                      <Cell fill="#ef4444" />
                    </Pie>

                    <Tooltip
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-1/2 space-y-5">
                <Outcome
                  label="Promoted"
                  value="20"
                  percentage="83.3%"
                  positive
                />

                <Outcome
                  label="Blocked"
                  value="4"
                  percentage="16.7%"
                  negative
                />
              </div>
            </div>
          </div>

          {/* Regression causes */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Regression Analysis
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Failed Evaluation Signals
              </h2>
            </div>

            <div className="mt-8 h-[230px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={regressionData}
                  margin={{
                    top: 5,
                    right: 5,
                    left: -20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                  />

                  <XAxis
                    dataKey="metric"
                    tick={{
                      fill: "#71717a",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fill: "#71717a",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                  />

                  <Bar
                    dataKey="regressions"
                    fill="#71717a"
                    radius={[5, 5, 0, 0]}
                    name="Regressions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Current baseline health */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Baseline Health
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Current Evaluation Baseline
              </h2>
            </div>

            <span className="flex items-center gap-1.5 rounded-full bg-green-950 px-3 py-1 text-xs font-medium text-green-400">
              <CheckCircle2 size={13} />

              ACTIVE
            </span>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-4">
            <BaselineMetric
              label="Faithfulness"
              value="93.5%"
              target="≥ 92.0%"
              healthy
            />

            <BaselineMetric
              label="Coverage"
              value="93.4%"
              target="≥ 90.0%"
              healthy
            />

            <BaselineMetric
              label="Final Score"
              value="93.2%"
              target="≥ 90.0%"
              healthy
            />

            <BaselineMetric
              label="Version"
              value="baseline"
              target="Accepted"
              healthy
            />
          </div>
        </section>

        {/* Recent trend */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Latest Change
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Candidate Quality Shift
              </h2>
            </div>

            <TrendingDown
              size={19}
              className="text-red-400"
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <TrendMetric
              label="Faithfulness"
              before="93.5%"
              after="91.4%"
              change="-2.1%"
              negative
            />

            <TrendMetric
              label="Coverage"
              before="93.4%"
              after="94.8%"
              change="+1.4%"
            />

            <TrendMetric
              label="Final Score"
              before="93.2%"
              after="92.4%"
              change="-0.8%"
              negative
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  change,
  negative = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  negative?: boolean;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {label}
        </p>

        <Icon
          size={17}
          className={
            negative
              ? "text-red-400"
              : "text-zinc-500"
          }
        />
      </div>

      <p className="mt-4 text-2xl font-semibold">
        {value}
      </p>

      <p
        className={`mt-2 flex items-center gap-1 text-xs ${
          negative
            ? "text-red-400"
            : "text-zinc-500"
        }`}
      >
        {negative ? (
          <TrendingDown size={12} />
        ) : (
          <TrendingUp size={12} />
        )}

        {change}
      </p>
    </div>
  );
}

function Legend({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2 text-zinc-500">
      <span
        className={`h-2 w-2 rounded-full ${className}`}
      />

      {label}
    </div>
  );
}

function Outcome({
  label,
  value,
  percentage,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  percentage: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            positive
              ? "bg-green-500"
              : negative
                ? "bg-red-500"
                : "bg-zinc-500"
          }`}
        />

        <span className="text-sm text-zinc-400">
          {label}
        </span>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold">
          {value}
        </p>

        <p className="text-xs text-zinc-600">
          {percentage}
        </p>
      </div>
    </div>
  );
}

function BaselineMetric({
  label,
  value,
  target,
  healthy = false,
}: {
  label: string;
  value: string;
  target: string;
  healthy?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {label}
        </p>

        {healthy && (
          <CheckCircle2
            size={14}
            className="text-green-400"
          />
        )}
      </div>

      <p className="mt-3 text-lg font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        Target: {target}
      </p>
    </div>
  );
}

function TrendMetric({
  label,
  before,
  after,
  change,
  negative = false,
}: {
  label: string;
  before: string;
  after: string;
  change: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-zinc-600">
          {before}
        </span>

        <span className="text-zinc-700">
          →
        </span>

        <span className="text-sm font-semibold text-zinc-200">
          {after}
        </span>
      </div>

      <p
        className={`mt-3 flex items-center gap-1 text-xs ${
          negative
            ? "text-red-400"
            : "text-green-400"
        }`}
      >
        {negative ? (
          <TrendingDown size={12} />
        ) : (
          <TrendingUp size={12} />
        )}

        {change}
      </p>
    </div>
  );
}