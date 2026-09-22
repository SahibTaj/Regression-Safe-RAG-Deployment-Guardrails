
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  GitCompare,
  Play,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";

import {
  startEvaluation,
  getRunStatus,
  getRunResult,
} from "@/lib/api";

/* =========================================================
   TYPES
========================================================= */

type RunStatusValue =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "approved"
  | "approved_with_warnings"
  | "blocked"
  | "failed"
  | "error";

type RunStatusResponse = {
  run_id?: string;
  status?: string;
  progress?: number;
  total_questions?: number;
  completed_questions?: number;
  error?: string | null;
};

type QuestionResult = {
  question?: string;
  answer?: string;
  claims?: unknown[];
  faithfulness?: number;
  faithfulness_score?: number;
  coverage?: number;
  coverage_score?: number;
  final_score?: number;
  coverage_details?: Record<string, unknown>;
  faithfulness_details?: unknown[];
  claim_extraction_failed?: boolean;
};

type GateResult = {
  status?: string;
  decision?: string;
  approved?: boolean;
  failures?: unknown[];
  warnings?: unknown[];
  baseline?: Record<string, unknown>;
  candidate?: Record<string, unknown>;
};

type RunResultResponse = {
  run_id?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  results?: QuestionResult[];
  question_results?: QuestionResult[];
  gate?: GateResult;
  gate_result?: GateResult;
  failures?: unknown[];
  warnings?: unknown[];
};

type DashboardData = {
  runId: string | null;
  status: RunStatusValue;
  progress: number;
  completedQuestions: number;
  totalQuestions: number;
  result: RunResultResponse | null;
  error: string | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const POLLING_INTERVAL = 3000;

const INITIAL_DASHBOARD: DashboardData = {
  runId: null,
  status: "idle",
  progress: 0,
  completedQuestions: 0,
  totalQuestions: 0,
  result: null,
  error: null,
};

/* =========================================================
   HELPERS
========================================================= */

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toPercentage(value: unknown): number {
  const number = toNumber(value);

  if (number <= 1) {
    return number * 100;
  }

  return number;
}

function formatPercentage(value: unknown): string {
  return `${toPercentage(value).toFixed(1)}%`;
}

function getFaithfulness(item: QuestionResult): number {
  return toNumber(
    item.faithfulness ?? item.faithfulness_score,
    0,
  );
}

function getCoverage(item: QuestionResult): number {
  return toNumber(
    item.coverage ?? item.coverage_score,
    0,
  );
}

function getFinalScore(item: QuestionResult): number {
  return toNumber(item.final_score, 0);
}

function normalizeStatus(value: unknown): RunStatusValue {
  const status = String(value ?? "idle").toLowerCase();

  if (
    status === "queued" ||
    status === "running" ||
    status === "completed" ||
    status === "approved" ||
    status === "approved_with_warnings" ||
    status === "blocked" ||
    status === "failed" ||
    status === "error"
  ) {
    return status;
  }

  return "idle";
}

function isFinished(status: RunStatusValue): boolean {
  return [
    "completed",
    "approved",
    "approved_with_warnings",
    "blocked",
    "failed",
    "error",
  ].includes(status);
}

function isSuccessful(status: RunStatusValue): boolean {
  return [
    "completed",
    "approved",
    "approved_with_warnings",
    "blocked",
  ].includes(status);
}

function getResultItems(
  result: RunResultResponse | null,
): QuestionResult[] {
  if (!result) {
    return [];
  }

  if (Array.isArray(result.results)) {
    return result.results;
  }

  if (Array.isArray(result.question_results)) {
    return result.question_results;
  }

  return [];
}

function getGateStatus(
  result: RunResultResponse | null,
  currentStatus: RunStatusValue,
): string {
  if (result?.gate?.status) {
    return result.gate.status;
  }

  if (result?.gate?.decision) {
    return result.gate.decision;
  }

  if (result?.gate_result?.status) {
    return result.gate_result.status;
  }

  if (result?.gate_result?.decision) {
    return result.gate_result.decision;
  }

  if (currentStatus === "approved") {
    return "Approved";
  }

  if (currentStatus === "approved_with_warnings") {
    return "Approved with warnings";
  }

  if (currentStatus === "blocked") {
    return "Blocked";
  }

  if (currentStatus === "failed" || currentStatus === "error") {
    return "Failed";
  }

  if (currentStatus === "running" || currentStatus === "queued") {
    return "Pending";
  }

  return "Unknown";
}

function getGateTone(status: string): "green" | "red" | "yellow" | "gray" {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("approved") ||
    normalized.includes("promoted") ||
    normalized === "pass"
  ) {
    return "green";
  }

  if (
    normalized.includes("blocked") ||
    normalized.includes("failed") ||
    normalized.includes("reject")
  ) {
    return "red";
  }

  if (
    normalized.includes("warning") ||
    normalized.includes("pending")
  ) {
    return "yellow";
  }

  return "gray";
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">{label}</p>

        <div className="text-zinc-500">{icon}</div>
      </div>

      <p className="text-4xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-3 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const tone = getGateTone(status);

  const styles = {
    green: "border-green-900 bg-green-950/40 text-green-400",
    red: "border-red-900 bg-red-950/40 text-red-400",
    yellow: "border-yellow-900 bg-yellow-950/40 text-yellow-400",
    gray: "border-zinc-700 bg-zinc-900 text-zinc-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles[tone]}`}
    >
      {status}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="mt-0.5 text-zinc-400">{icon}</div>

      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>

        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  progress,
}: {
  progress: number;
}) {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className="h-full rounded-full bg-white transition-all duration-500"
        style={{ width: `${safeProgress}%` }}
      />
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function DashboardPage() {
  const [dashboard, setDashboard] =
    useState<DashboardData>(INITIAL_DASHBOARD);

  const [isStarting, setIsStarting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questionResults = useMemo(() => {
    return getResultItems(dashboard.result);
  }, [dashboard.result]);

  const metrics = useMemo(() => {
    if (questionResults.length === 0) {
      return {
        faithfulness: 0,
        coverage: 0,
        finalScore: 0,
        questions: 0,
      };
    }

    const totals = questionResults.reduce(
      (
        accumulator: {
          faithfulness: number;
          coverage: number;
          finalScore: number;
        },
        item: QuestionResult,
      ) => {
        accumulator.faithfulness += getFaithfulness(item);
        accumulator.coverage += getCoverage(item);
        accumulator.finalScore += getFinalScore(item);

        return accumulator;
      },
      {
        faithfulness: 0,
        coverage: 0,
        finalScore: 0,
      },
    );

    const count = questionResults.length;

    return {
      faithfulness: totals.faithfulness / count,
      coverage: totals.coverage / count,
      finalScore: totals.finalScore / count,
      questions: count,
    };
  }, [questionResults]);

  const gateStatus = useMemo(() => {
    return getGateStatus(dashboard.result, dashboard.status);
  }, [dashboard.result, dashboard.status]);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  const fetchRunResult = useCallback(async (runId: string) => {
    const response = (await getRunResult(runId)) as unknown as RunResultResponse;

    setDashboard((previous) => ({
      ...previous,
      result: response,
      status: normalizeStatus(response.status ?? previous.status),
      error: null,
    }));
  }, []);

  const checkRunStatus = useCallback(
    async (runId: string) => {
      try {
        const response =
          (await getRunStatus(runId)) as RunStatusResponse;

        const status = normalizeStatus(response.status);

        setDashboard((previous) => ({
          ...previous,
          status,
          progress: toNumber(response.progress, previous.progress),
          completedQuestions: toNumber(
            response.completed_questions,
            previous.completedQuestions,
          ),
          totalQuestions: toNumber(
            response.total_questions,
            previous.totalQuestions,
          ),
          error: response.error ?? null,
        }));

        if (isFinished(status)) {
          clearPolling();

          if (isSuccessful(status)) {
            await fetchRunResult(runId);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to fetch run status.";

        setDashboard((previous) => ({
          ...previous,
          error: message,
          status: "error",
        }));

        clearPolling();
      }
    },
    [clearPolling, fetchRunResult],
  );

  const startRun = useCallback(async () => {
    if (isStarting) {
      return;
    }

    clearPolling();

    setIsStarting(true);

    setDashboard({
      ...INITIAL_DASHBOARD,
      status: "queued",
    });

    try {
      const response = (await startEvaluation()) as {
        run_id?: string;
        status?: string;
        error?: string;
        detail?: string;
      };

      if (!response.run_id) {
        throw new Error(
          response.error ??
            response.detail ??
            "The backend did not return a run ID.",
        );
      }

      const runId = response.run_id;

      setDashboard((previous) => ({
        ...previous,
        runId,
        status: normalizeStatus(response.status ?? "queued"),
      }));

      await checkRunStatus(runId);

      pollingRef.current = setInterval(() => {
        void checkRunStatus(runId);
      }, POLLING_INTERVAL);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start evaluation.";

      setDashboard((previous) => ({
        ...previous,
        status: "error",
        error: message,
      }));
    } finally {
      setIsStarting(false);
    }
  }, [checkRunStatus, clearPolling, isStarting]);

  const refreshRun = useCallback(async () => {
    if (!dashboard.runId) {
      return;
    }

    setIsRefreshing(true);

    try {
      await checkRunStatus(dashboard.runId);
    } finally {
      setIsRefreshing(false);
    }
  }, [checkRunStatus, dashboard.runId]);

  const isRunning =
    dashboard.status === "queued" ||
    dashboard.status === "running";

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
              <Activity size={16} />
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-zinc-300">Overview</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Evaluation Overview
            </h1>

            <p className="mt-3 text-sm text-zinc-500 md:text-base">
              Monitor RAG quality, regression risks, and deployment readiness.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {dashboard.runId && (
              <button
                type="button"
                onClick={() => void refreshRun()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            )}

            <button
              type="button"
              onClick={() => void startRun()}
              disabled={isStarting || isRunning}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStarting || isRunning ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <Play size={17} />
              )}

              {isStarting
                ? "Starting..."
                : isRunning
                  ? "Evaluation Running"
                  : "Run Evaluation"}
            </button>
          </div>
        </header>

        {/* ERROR MESSAGE */}
        {dashboard.error && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-300">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />

            <div>
              <p className="font-medium">Evaluation error</p>

              <p className="mt-1 text-sm text-red-400">
                {dashboard.error}
              </p>
            </div>
          </div>
        )}

        {/* RUN PROGRESS */}
        {(isRunning || dashboard.status === "queued") && (
          <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">
                  Evaluation in progress
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  The backend is processing the evaluation dataset.
                </p>
              </div>

              <span className="text-sm font-medium text-zinc-300">
                {dashboard.progress}%
              </span>
            </div>

            <ProgressBar progress={dashboard.progress} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
              <span>
                Completed: {dashboard.completedQuestions} /{" "}
                {dashboard.totalQuestions || "—"}
              </span>

              {dashboard.runId && (
                <span className="font-mono">{dashboard.runId}</span>
              )}
            </div>
          </section>
        )}

        {/* METRICS */}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Faithfulness"
            value={formatPercentage(metrics.faithfulness)}
            description="Average claim support score"
            icon={<ShieldCheck size={20} />}
          />

          <MetricCard
            label="Coverage"
            value={formatPercentage(metrics.coverage)}
            description="Average answerability coverage"
            icon={<BarChart3 size={20} />}
          />

          <MetricCard
            label="Final Score"
            value={formatPercentage(metrics.finalScore)}
            description="Combined evaluation score"
            icon={<TrendingUp size={20} />}
          />

          <MetricCard
            label="Evaluated Questions"
            value={String(metrics.questions)}
            description="Questions processed in this run"
            icon={<GitCompare size={20} />}
          />
        </section>

        {/* GATE AND RUN INFORMATION */}
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-8 flex items-center justify-between gap-4">
              <SectionHeader
                icon={<ShieldCheck size={20} />}
                title="Deployment Gate"
                description="Regression decision from the backend."
              />

              <StatusBadge status={gateStatus} />
            </div>

            <h2 className="text-4xl font-semibold tracking-tight text-white">
              {gateStatus}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              The gate is calculated using the candidate evaluation and the
              current baseline.
            </p>

            <div className="mt-8 border-t border-zinc-800 pt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Current status</span>

                <span className="font-medium capitalize text-zinc-200">
                  {dashboard.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Run ID</span>

                <span className="max-w-[60%] truncate font-mono text-xs text-zinc-300">
                  {dashboard.runId ?? "Not available"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <SectionHeader
              icon={<GitCompare size={20} />}
              title="Run Information"
              description="Metadata for the current evaluation."
            />

            <div className="space-y-0">
              <InfoRow
                label="Run ID"
                value={dashboard.runId ?? "Not available"}
                mono
              />

              <InfoRow
                label="Evaluation status"
                value={dashboard.status.replaceAll("_", " ")}
              />

              <InfoRow
                label="Progress"
                value={`${dashboard.progress}%`}
              />

              <InfoRow
                label="Questions"
                value={String(
                  dashboard.totalQuestions || metrics.questions || 0,
                )}
              />
            </div>
          </div>
        </section>

        {/* QUESTION LEVEL RESULTS */}
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <SectionHeader
              icon={<Activity size={20} />}
              title="Question-Level Evaluation"
              description="Detailed scores for each evaluated question."
            />

            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
              {questionResults.length} results
            </span>
          </div>

          {questionResults.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 px-6 text-center">
              <Activity size={28} className="mb-4 text-zinc-700" />

              <p className="text-sm text-zinc-400">
                No evaluation results available yet.
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                Start an evaluation to see question-level results.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-4 font-medium">Question</th>
                    <th className="px-3 py-4 font-medium">
                      Faithfulness
                    </th>
                    <th className="px-3 py-4 font-medium">Coverage</th>
                    <th className="px-3 py-4 font-medium">Final Score</th>
                  </tr>
                </thead>

                <tbody>
                  {questionResults.map((item, index) => (
                    <tr
                      key={`${item.question ?? "question"}-${index}`}
                      className="border-b border-zinc-900 text-sm last:border-0"
                    >
                      <td className="max-w-md px-3 py-5 text-zinc-300">
                        <p className="line-clamp-2">
                          {item.question ?? `Question ${index + 1}`}
                        </p>
                      </td>

                      <td className="px-3 py-5 text-zinc-400">
                        {formatPercentage(getFaithfulness(item))}
                      </td>

                      <td className="px-3 py-5 text-zinc-400">
                        {formatPercentage(getCoverage(item))}
                      </td>

                      <td className="px-3 py-5 font-medium text-white">
                        {formatPercentage(getFinalScore(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-10 flex flex-col justify-between gap-3 border-t border-zinc-900 py-6 text-xs text-zinc-600 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span>Connected to local RAG Guardrails API</span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>Regression-Safe Evaluation Platform</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 py-4 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>

      <span
        className={`max-w-[65%] truncate text-right text-sm text-zinc-200 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}