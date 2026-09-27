"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import {
  getRunResult,
  getRuns,
  RunListItem,
  RunResultResponse,
} from "@/lib/api";

import {
  getRunStatus,
  isBlocked,
  isPromoted,
  summarizeResults,
  formatDate,
  formatPercentage,
} from "@/lib/metrics";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsRun {
  run: RunListItem;
  result: RunResultResponse;
  faithfulness: number;
  coverage: number;
  finalScore: number;
}

export default function AnalyticsPage() {
  const [analyticsRuns, setAnalyticsRuns] = useState<AnalyticsRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const runsResponse = await getRuns();

      const completedRuns = (runsResponse.runs || []).filter((run) => {
        const status = getRunStatus(run);

        return [
          "approved",
          "approved_with_warnings",
          "blocked",
          "failed",
          "promoted",
        ].includes(status);
      });

      const results = await Promise.all(
        completedRuns.map(async (run) => {
          try {
            const result = await getRunResult(run.run_id);

            if (!result?.results) {
              return null;
            }

            const metrics = summarizeResults(result.results);

            return {
              run,
              result,
              faithfulness: metrics.faithfulness,
              coverage: metrics.coverage,
              finalScore: metrics.finalScore,
            };
          } catch (err) {
            console.warn(
              `Could not load run ${run.run_id}:`,
              err
            );

            return null;
          }
        })
      );

      setAnalyticsRuns(
        results.filter(
          (item): item is AnalyticsRun => item !== null
        )
      );
    } catch (err) {
      console.error("Failed to load analytics:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
   * Sort runs chronologically.
   *
   * This is important because the quality chart is a time-series chart.
   */
  const sortedRuns = useMemo(() => {
    return [...analyticsRuns].sort((a, b) => {
      const dateA =
        a.run.created_at ||
        a.run.metadata?.created_at ||
        "";

      const dateB =
        b.run.created_at ||
        b.run.metadata?.created_at ||
        "";

      return (
        new Date(dateA).getTime() -
        new Date(dateB).getTime()
      );
    });
  }, [analyticsRuns]);

  /*
   * Summary statistics.
   */
  const summary = useMemo(() => {
    const total = analyticsRuns.length;

    const average = (values: number[]) => {
      if (values.length === 0) {
        return 0;
      }

      return (
        values.reduce((sum, value) => sum + value, 0) /
        values.length
      );
    };

    const promoted = analyticsRuns.filter((item) =>
      isPromoted(getRunStatus(item.result))
    ).length;

    const blocked = analyticsRuns.filter((item) =>
      isBlocked(getRunStatus(item.result))
    ).length;

    const warnings = analyticsRuns.filter((item) => {
      const status = getRunStatus(item.result);

      return (
        status === "approved_with_warnings" ||
        status === "warnings"
      );
    }).length;

    return {
      total,
      promoted,
      blocked,
      warnings,

      promotionRate:
        total === 0
          ? 0
          : (promoted / total) * 100,

      blockedRate:
        total === 0
          ? 0
          : (blocked / total) * 100,

      averageFaithfulness: average(
        analyticsRuns.map(
          (item) => item.faithfulness
        )
      ),

      averageCoverage: average(
        analyticsRuns.map(
          (item) => item.coverage
        )
      ),

      averageFinalScore: average(
        analyticsRuns.map(
          (item) => item.finalScore
        )
      ),
    };
  }, [analyticsRuns]);

  /*
   * Data for the quality trend chart.
   *
   * Values are converted to percentages because
   * summarizeResults() returns metric values in the
   * same format used by the dashboard.
   */
  const qualityHistory = useMemo(() => {
    return sortedRuns.map((item, index) => {
      const createdAt =
        item.run.created_at ||
        item.run.metadata?.created_at ||
        "";

      const date = createdAt
        ? new Date(createdAt)
        : null;

      return {
        run: `Run ${index + 1}`,
        date:
          date && !Number.isNaN(date.getTime())
            ? date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })
            : `Run ${index + 1}`,

        faithfulness:
          item.faithfulness,

        coverage:
          item.coverage,

        finalScore:
          item.finalScore,
      };
    });
  }, [sortedRuns]);

  /*
   * Deployment outcome chart.
   */
  const deploymentData = useMemo(() => {
    return [
      {
        status: "Promoted",
        count: summary.promoted,
      },
      {
        status: "Warnings",
        count: summary.warnings,
      },
      {
        status: "Blocked",
        count: summary.blocked,
      },
    ];
  }, [summary]);

  /*
   * Average quality metrics.
   */
  const qualityMetrics = useMemo(() => {
    return [
      {
        metric: "Faithfulness",
        score: summary.averageFaithfulness,
      },
      {
        metric: "Coverage",
        score: summary.averageCoverage,
      },
      {
        metric: "Final Score",
        score: summary.averageFinalScore,
      },
    ];
  }, [summary]);

  /*
   * Shared tooltip styling.
   */
  const tooltipStyle = {
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
    color: "#ffffff",
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <RefreshCw
              size={24}
              className="mx-auto mb-3 animate-spin text-zinc-500"
            />

            <p className="text-sm text-zinc-500">
              Loading analytics...
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle
              size={20}
              className="text-red-400"
            />

            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>

          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* HEADER */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <BarChart3 size={16} />

          <span>LLMOps / Analytics</span>
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Evaluation Analytics
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Track RAG quality, deployment decisions, and
          evaluation regressions across candidate versions.
        </p>
      </header>

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard
          label="Average Faithfulness"
          value={formatPercentage(
            summary.averageFaithfulness
          )}
          description={`${summary.total} evaluated runs`}
          icon={ShieldAlert}
        />

        <AnalyticsCard
          label="Average Coverage"
          value={formatPercentage(
            summary.averageCoverage
          )}
          description={`${summary.total} evaluated runs`}
          icon={Activity}
        />

        <AnalyticsCard
          label="Promotion Rate"
          value={formatPercentage(
            summary.promotionRate
          )}
          description={`${summary.promoted} / ${summary.total} runs`}
          icon={CheckCircle2}
        />

        <AnalyticsCard
          label="Blocked Runs"
          value={String(summary.blocked)}
          description={`${formatPercentage(
            summary.blockedRate
          )} of runs`}
          icon={AlertTriangle}
        />
      </section>

      {/* QUALITY TREND */}
      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Quality Trend
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Evaluation Scores Over Time
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Historical scores from completed backend runs.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {qualityHistory.length > 0 ? (
          <div className="mt-8 h-[360px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={qualityHistory}
                margin={{
                  top: 10,
                  right: 10,
                  left: -10,
                  bottom: 10,
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
                  domain={[0, 100]}
                  tick={{
                    fill: "#71717a",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    `${value}%`
                  }
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => {
                    if (typeof value === "number") {
                      return `${value.toFixed(1)}%`;
                    }

                    return String(value ?? "");
                  }}
                />

                <Legend
                  wrapperStyle={{
                    color: "#a1a1aa",
                    fontSize: "12px",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="faithfulness"
                  name="Faithfulness"
                  stroke="#e4e4e7"
                  fill="#e4e4e7"
                  fillOpacity={0.05}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#e4e4e7",
                  }}
                  activeDot={{
                    r: 5,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="coverage"
                  name="Coverage"
                  stroke="#a1a1aa"
                  fill="#a1a1aa"
                  fillOpacity={0.04}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#a1a1aa",
                  }}
                  activeDot={{
                    r: 5,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="finalScore"
                  name="Final Score"
                  stroke="#71717a"
                  fill="#71717a"
                  fillOpacity={0.03}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#71717a",
                  }}
                  activeDot={{
                    r: 5,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No completed runs available for the quality trend." />
        )}
      </section>

      {/* SECOND ROW OF CHARTS */}
      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* DEPLOYMENT OUTCOMES */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Deployment Decisions
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Deployment Outcomes
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Distribution of decisions across completed evaluation runs.
            </p>
          </div>

          <div className="mt-8 h-[300px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={deploymentData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -10,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                />

                <XAxis
                  dataKey="status"
                  tick={{
                    fill: "#71717a",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fill: "#71717a",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                />

                <Bar
                  dataKey="count"
                  name="Runs"
                  fill="#a1a1aa"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* QUALITY METRICS */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Quality Overview
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Average Quality Metrics
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Average evaluation quality across all completed runs.
            </p>
          </div>

          <div className="mt-8 h-[300px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={qualityMetrics}
                margin={{
                  top: 10,
                  right: 10,
                  left: -10,
                  bottom: 10,
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
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fill: "#71717a",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    `${value}%`
                  }
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => {
                    if (typeof value === "number") {
                      return `${value.toFixed(1)}%`;
                    }

                    return String(value ?? "");
                  }}
                />

                <Bar
                  dataKey="score"
                  name="Average Score"
                  fill="#d4d4d8"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* RUN HISTORY TABLE */}
      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Run History
          </p>

          <h2 className="mt-1 text-lg font-semibold">
            Historical Evaluation Runs
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            Metrics calculated directly from completed backend evaluation runs.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-3">
                  Run
                </th>

                <th className="px-3 py-3">
                  Date
                </th>

                <th className="px-3 py-3">
                  Faithfulness
                </th>

                <th className="px-3 py-3">
                  Coverage
                </th>

                <th className="px-3 py-3">
                  Final Score
                </th>

                <th className="px-3 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {[...sortedRuns]
                .reverse()
                .map((item) => {
                  const status = getRunStatus(
                    item.result
                  );

                  return (
                    <tr
                      key={item.run.run_id}
                      className="transition hover:bg-zinc-900/60"
                    >
                      <td className="px-3 py-4 font-mono text-xs text-zinc-300">
                        {item.run.run_id}
                      </td>

                      <td className="px-3 py-4 text-xs text-zinc-500">
                        {formatDate(
                          item.run.created_at ||
                          item.run.metadata?.created_at
                        )}
                      </td>

                      <td className="px-3 py-4 text-zinc-300">
                        {formatPercentage(
                          item.faithfulness
                        )}
                      </td>

                      <td className="px-3 py-4 text-zinc-300">
                        {formatPercentage(
                          item.coverage
                        )}
                      </td>

                      <td className="px-3 py-4 text-zinc-300">
                        {formatPercentage(
                          item.finalScore
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge
                          status={status}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {sortedRuns.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            No completed evaluation runs available.
          </p>
        )}
      </section>

      {/* FOOTER INFO */}
      <footer className="mt-8 flex items-center justify-between border-t border-zinc-900 pt-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />

          <span className="text-xs text-zinc-500">
            Analytics connected to local evaluation API
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <TrendingUp size={14} />

          <span>
            RAG Guardrails
          </span>
        </div>
      </footer>
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE SHELL                                                                  */
/* -------------------------------------------------------------------------- */

function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="ml-64 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ANALYTICS CARD                                                              */
/* -------------------------------------------------------------------------- */

function AnalyticsCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {label}
        </p>

        <Icon
          size={18}
          className="text-zinc-500"
        />
      </div>

      <p className="mt-4 text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                                                */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const blocked = isBlocked(status);

  const warning =
    status === "approved_with_warnings" ||
    status === "warnings";

  const label = status
    .replaceAll("_", " ")
    .toUpperCase();

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs ${blocked
        ? "bg-red-950 text-red-400"
        : warning
          ? "bg-yellow-950 text-yellow-400"
          : "bg-green-950 text-green-400"
        }`}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY CHART                                                                 */
/* -------------------------------------------------------------------------- */

function EmptyChart({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div className="text-center">
        <BarChart3
          size={28}
          className="mx-auto mb-3 text-zinc-700"
        />

        <p className="text-sm text-zinc-500">
          {message}
        </p>
      </div>
    </div>
  );
}