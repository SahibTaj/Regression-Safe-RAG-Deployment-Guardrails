
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  GitCompare,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  getBaseline,
  getRunResult,
  getRuns,
  BaselineResponse,
  RunResultResponse,
} from "@/lib/api";

import {
  getLatestRun,
  summarizeResults,
  formatPercentage,
  formatDate,
} from "@/lib/metrics";

export default function BaselinePage() {
  const [baseline, setBaseline] =
    useState<BaselineResponse | null>(null);

  const [candidate, setCandidate] =
    useState<RunResultResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [baselineResponse, runsResponse] =
        await Promise.all([
          getBaseline(),
          getRuns(),
        ]);

      const latestRun = getLatestRun(
        runsResponse.runs || []
      );

      if (!latestRun) {
        throw new Error("No candidate run found.");
      }

      const candidateResponse = await getRunResult(
        latestRun.run_id
      );

      setBaseline(baselineResponse);
      setCandidate(candidateResponse);
    } catch (err) {
      console.error("Failed to load baseline comparison:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load baseline comparison."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !baseline || !candidate) {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <p className="text-sm text-red-400">
            {error || "Comparison data unavailable."}
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

  const baselineMetrics = summarizeResults(
    baseline.results
  );

  const candidateMetrics = summarizeResults(
    candidate.results
  );

  const scoreDelta =
    candidateMetrics.finalScore -
    baselineMetrics.finalScore;

  const hasRegression = scoreDelta < 0;

  const metrics = [
    {
      name: "Faithfulness",
      baseline: baselineMetrics.faithfulness,
      candidate: candidateMetrics.faithfulness,
      threshold: 92,
    },
    {
      name: "Coverage",
      baseline: baselineMetrics.coverage,
      candidate: candidateMetrics.coverage,
      threshold: 90,
    },
    {
      name: "Final Score",
      baseline: baselineMetrics.finalScore,
      candidate: candidateMetrics.finalScore,
      threshold: 90,
    },
  ];
  const gate = candidate.gate;

  const isBlocked = gate?.status === "blocked";
  const hasWarnings = gate?.status === "approved_with_warnings";
  const isApproved = gate?.status === "approved";

  return (
    <PageShell>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <GitCompare size={16} />
          LLMOps / Regression Analysis
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Baseline Comparison
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Compare the latest candidate against the accepted baseline
          using actual evaluation results.
        </p>
      </header>

      <section className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-5">
        <VersionCard
          title="Accepted Baseline"
          version="baseline"
          model={
            baseline.metadata?.answer_model ||
            "Unknown model"
          }
          date={formatDate(
            baseline.metadata?.promoted_at
          )}
          score={formatPercentage(
            baselineMetrics.finalScore
          )}
        />

        <div className="flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <GitCompare
              size={17}
              className="text-zinc-500"
            />
          </div>
        </div>

        <VersionCard
          title="Latest Candidate"
          version={candidate.run_id}
          model={
            candidate.metadata?.answer_model ||
            "Unknown model"
          }
          date={formatDate(
            candidate.metadata?.created_at
          )}
          score={formatPercentage(
            candidateMetrics.finalScore
          )}
          blocked={
            candidate.gate.status === "blocked"
          }
        />
      </section>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Overall Regression
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Candidate vs Baseline
            </h2>
          </div>

          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
              hasRegression
                ? "bg-red-950/60 text-red-400"
                : "bg-green-950/60 text-green-400"
            }`}
          >
            {hasRegression ? (
              <TrendingDown size={14} />
            ) : (
              <TrendingUp size={14} />
            )}

            {hasRegression
              ? "Regression detected"
              : "No overall regression"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <ComparisonStat
            label="Baseline Score"
            value={formatPercentage(
              baselineMetrics.finalScore
            )}
          />

          <ComparisonStat
            label="Candidate Score"
            value={formatPercentage(
              candidateMetrics.finalScore
            )}
          />

          <ComparisonStat
            label="Overall Delta"
            value={`${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(1)}%`}
            danger={scoreDelta < 0}
          />
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="border-b border-zinc-800 p-6">
          <h2 className="font-semibold">
            Metric Comparison
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Current metrics calculated from evaluation results.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] border-b border-zinc-800 px-6 py-3 text-xs font-medium text-zinc-500">
              <span>Metric</span>
              <span>Baseline</span>
              <span>Candidate</span>
              <span>Delta</span>
              <span>Result</span>
            </div>

            <div className="divide-y divide-zinc-800">
              {metrics.map((metric) => {
                const delta =
                  metric.candidate - metric.baseline;

                const passed =
                  metric.candidate >= metric.threshold;

                return (
                  <div
                    key={metric.name}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-6 py-5"
                  >
                    <span className="text-sm text-zinc-300">
                      {metric.name}
                    </span>

                    <span className="text-sm text-zinc-400">
                      {formatPercentage(metric.baseline)}
                    </span>

                    <span className="text-sm text-zinc-400">
                      {formatPercentage(metric.candidate)}
                    </span>

                    <span
                      className={`text-sm ${
                        delta < 0
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </span>

                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs ${
                        passed
                          ? "bg-green-950 text-green-400"
                          : "bg-red-950 text-red-400"
                      }`}
                    >
                      {passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw size={15} />
          Refresh Comparison
        </button>
      </div>
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

function VersionCard({
  title,
  version,
  model,
  date,
  score,
  blocked = false,
}: {
  title: string;
  version: string;
  model: string;
  date: string;
  score: string;
  blocked?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        blocked
          ? "border-red-900/60 bg-red-950/20"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          {title}
        </p>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] ${
            blocked
              ? "bg-red-950 text-red-400"
              : "bg-green-950 text-green-400"
          }`}
        >
          {blocked ? "BLOCKED" : "ACCEPTED"}
        </span>
      </div>

      <h2 className="mt-5 font-semibold">
        {version}
      </h2>

      <p className="mt-1 text-xs text-zinc-500">
        {model}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {date}
      </p>

      <p className="mt-5 text-3xl font-semibold">
        {score}
      </p>
    </div>
  );
}

function ComparisonStat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-semibold ${
          danger ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <PageShell>
      <div className="py-20 text-center text-sm text-zinc-500">
        Loading baseline comparison...
      </div>
    </PageShell>
  );
}