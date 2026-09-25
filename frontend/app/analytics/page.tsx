
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
} from "lucide-react";

import {
  getRunResult,
  getRuns,
  RunListItem,
  RunResultResponse,
} from "@/lib/api";

import {
  getLatestRun,
  getRunStatus,
  isBlocked,
  isPromoted,
  summarizeResults,
  formatDate,
  formatPercentage,
} from "@/lib/metrics";

interface AnalyticsRun {
  run: RunListItem;
  result: RunResultResponse;
  faithfulness: number;
  coverage: number;
  finalScore: number;
}

export default function AnalyticsPage() {
  const [analyticsRuns, setAnalyticsRuns] = useState<
    AnalyticsRun[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const runsResponse = await getRuns();

      const completedRuns = (runsResponse.runs || []).filter(
        (run) => {
          const status = getRunStatus(run);

          return [
            "approved",
            "approved_with_warnings",
            "blocked",
            "failed",
            "promoted",
          ].includes(status);
        }
      );

      const results = await Promise.all(
        completedRuns.map(async (run) => {
          try {
            const result = await getRunResult(run.run_id);

            if (!result.results) {
              return null;
            }

            const metrics = summarizeResults(
              result.results
            );

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

  const summary = useMemo(() => {
    const total = analyticsRuns.length;

    const average = (values: number[]) => {
      if (values.length === 0) {
        return 0;
      }

      return values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length;
    };

    const promoted = analyticsRuns.filter((item) =>
      isPromoted(getRunStatus(item.result))
    ).length;

    const blocked = analyticsRuns.filter((item) =>
      isBlocked(getRunStatus(item.result))
    ).length;

    return {
      total,
      promoted,
      blocked,
      promotionRate:
        total === 0 ? 0 : (promoted / total) * 100,
      blockedRate:
        total === 0 ? 0 : (blocked / total) * 100,
      averageFaithfulness: average(
        analyticsRuns.map((item) => item.faithfulness)
      ),
      averageCoverage: average(
        analyticsRuns.map((item) => item.coverage)
      ),
      averageFinalScore: average(
        analyticsRuns.map((item) => item.finalScore)
      ),
    };
  }, [analyticsRuns]);

  if (loading) {
    return (
      <PageShell>
        <div className="py-20 text-center text-sm text-zinc-500">
          Loading analytics...
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <p className="text-sm text-red-400">
            {error}
          </p>

          <button
            onClick={loadData}
            className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <BarChart3 size={16} />
          LLMOps / Analytics
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Evaluation Analytics
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Track RAG quality, deployment decisions, and
          evaluation regressions across candidate versions.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-4">
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
              Historical scores from completed backend runs.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-3">Run</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Faithfulness</th>
                <th className="px-3 py-3">Coverage</th>
                <th className="px-3 py-3">Final Score</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {analyticsRuns.map((item) => {
                const status = getRunStatus(item.result);

                return (
                  <tr key={item.run.run_id}>
                    <td className="px-3 py-4 text-xs text-zinc-300">
                      {item.run.run_id}
                    </td>

                    <td className="px-3 py-4 text-xs text-zinc-500">
                      {formatDate(
                        item.run.created_at ||
                          item.run.metadata?.created_at
                      )}
                    </td>

                    <td className="px-3 py-4 text-zinc-300">
                      {formatPercentage(item.faithfulness)}
                    </td>

                    <td className="px-3 py-4 text-zinc-300">
                      {formatPercentage(item.coverage)}
                    </td>

                    <td className="px-3 py-4 text-zinc-300">
                      {formatPercentage(item.finalScore)}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          isBlocked(status)
                            ? "bg-red-950 text-red-400"
                            : "bg-green-950 text-green-400"
                        }`}
                      >
                        {status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {analyticsRuns.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            No completed evaluation runs available.
          </p>
        )}
      </section>
    </PageShell>
  );
}

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