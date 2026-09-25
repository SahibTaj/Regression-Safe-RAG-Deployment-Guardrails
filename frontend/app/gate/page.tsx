
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  XCircle,
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
} from "@/lib/metrics";

interface GateMetric {
  name: string;
  description: string;
  candidate: number;
  baseline: number;
  threshold: number;
  type: "HARD" | "SOFT";
}

export default function DeploymentGatePage() {
  const [candidate, setCandidate] =
    useState<RunResultResponse | null>(null);

  const [baseline, setBaseline] =
    useState<BaselineResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [runsResponse, baselineResponse] =
        await Promise.all([
          getRuns(),
          getBaseline(),
        ]);

      const latestRun = getLatestRun(
        runsResponse.runs || []
      );

      if (!latestRun) {
        throw new Error("No evaluation runs found.");
      }

      const result = await getRunResult(
        latestRun.run_id
      );

      if (!result.results) {
        throw new Error(
          "The latest evaluation has not completed."
        );
      }

      setCandidate(result);
      setBaseline(baselineResponse);
    } catch (err) {
      console.error("Failed to load deployment gate:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load deployment gate."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  if (error || !candidate || !baseline) {
    return (
      <PageShell>
        <ErrorState
          message={error || "Unable to load gate data."}
          onRetry={loadData}
        />
      </PageShell>
    );
  }

  const candidateMetrics = summarizeResults(
    candidate.results
  );

  const baselineMetrics = summarizeResults(
    baseline.results
  );

  const gateStatus = candidate.gate.status.toLowerCase();

  const blocked = gateStatus === "blocked" ||
    gateStatus === "failed";

  const metrics: GateMetric[] = [
    {
      name: "Faithfulness",
      description:
        "Detects unsupported claims in generated answers.",
      candidate: candidateMetrics.faithfulness,
      baseline: baselineMetrics.faithfulness,
      threshold: 92,
      type: "HARD",
    },
    {
      name: "Coverage",
      description:
        "Measures whether answerable questions receive useful answers.",
      candidate: candidateMetrics.coverage,
      baseline: baselineMetrics.coverage,
      threshold: 90,
      type: "SOFT",
    },
    {
      name: "Final Score",
      description:
        "Weighted aggregate of evaluation signals.",
      candidate: candidateMetrics.finalScore,
      baseline: baselineMetrics.finalScore,
      threshold: 90,
      type: "SOFT",
    },
  ];

  return (
    <PageShell>
      <header className="mb-8">
        <p className="text-sm text-zinc-500">
          LLMOps / Deployment
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Deployment Gate
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Evaluate whether the latest candidate RAG version
          is safe to promote against the accepted baseline.
        </p>

        <p className="mt-3 text-xs text-zinc-600">
          Run: {candidate.run_id}
        </p>
      </header>

      <section
        className={`rounded-2xl border p-7 ${
          blocked
            ? "border-red-900/60 bg-red-950/20"
            : "border-green-900/60 bg-green-950/20"
        }`}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                blocked ? "bg-red-950" : "bg-green-950"
              }`}
            >
              {blocked ? (
                <ShieldAlert
                  size={23}
                  className="text-red-400"
                />
              ) : (
                <CheckCircle2
                  size={23}
                  className="text-green-400"
                />
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Deployment Decision
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                {blocked
                  ? "Deployment Blocked"
                  : "Deployment Approved"}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                {candidate.gate.reason}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${
              blocked
                ? "border-red-800 bg-red-950/50 text-red-400"
                : "border-green-800 bg-green-950/50 text-green-400"
            }`}
          >
            {gateStatus.toUpperCase()}
          </span>
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <VersionCard
            label="Accepted Baseline"
            version="baseline"
            model={
              baseline.metadata?.answer_model ||
              "Unknown model"
            }
            score={formatPercentage(
              baselineMetrics.finalScore
            )}
          />

          <ArrowRight
            size={20}
            className="text-zinc-700"
          />

          <VersionCard
            label="Candidate"
            version={candidate.run_id}
            model={
              candidate.metadata?.answer_model ||
              "Unknown model"
            }
            score={formatPercentage(
              candidateMetrics.finalScore
            )}
            blocked={blocked}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Gate Configuration
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Calculated from the current baseline and candidate.
              </p>
            </div>

            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
              3 checks
            </span>
          </div>
        </div>

        <div className="divide-y divide-zinc-800">
          {metrics.map((metric) => {
            const passed =
              metric.candidate >= metric.threshold;

            const delta =
              metric.candidate - metric.baseline;

            return (
              <div
                key={metric.name}
                className="p-6"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {metric.name}
                      </h3>

                      <span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">
                        {metric.type}
                      </span>
                    </div>

                    <p className="mt-2 max-w-lg text-sm text-zinc-500">
                      {metric.description}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                      passed
                        ? "bg-green-950 text-green-400"
                        : "bg-red-950 text-red-400"
                    }`}
                  >
                    {passed ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <XCircle size={13} />
                    )}

                    {passed ? "PASS" : "FAIL"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-4">
                  <MetricValue
                    label="Candidate"
                    value={formatPercentage(
                      metric.candidate
                    )}
                  />

                  <MetricValue
                    label="Baseline"
                    value={formatPercentage(
                      metric.baseline
                    )}
                  />

                  <MetricValue
                    label="Delta"
                    value={`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}
                  />

                  <MetricValue
                    label="Threshold"
                    value={`≥ ${metric.threshold.toFixed(1)}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw size={15} />
          Refresh Gate
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
  label,
  version,
  model,
  score,
  blocked = false,
}: {
  label: string;
  version: string;
  model: string;
  score: string;
  blocked?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        blocked
          ? "border-red-900/60 bg-red-950/20"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-3 font-semibold">
        {version}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {model}
      </p>

      <p className="mt-4 text-2xl font-semibold">
        {score}
      </p>
    </div>
  );
}

function MetricValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-zinc-300">
        {value}
      </p>
    </div>
  );
}

function LoadingPage() {
  return (
    <PageShell>
      <div className="py-20 text-center text-sm text-zinc-500">
        Loading deployment gate...
      </div>
    </PageShell>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
      <p className="text-sm text-red-400">
        {message}
      </p>

      <button
        onClick={onRetry}
        className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        Retry
      </button>
    </div>
  );
}