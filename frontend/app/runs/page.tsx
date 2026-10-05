
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { getRuns, RunListItem } from "@/lib/api";

type DisplayRun = RunListItem & {
  model?: string;
  faithfulness?: number;
  coverage?: number;
  final_score?: number;
  finalScore?: number;
};

export default function RunsPage() {
  const [runs, setRuns] = useState<DisplayRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRuns() {
    try {
      setLoading(true);
      setError(null);

      const response = await getRuns();

      setRuns((response.runs || []) as DisplayRun[]);
    } catch (err) {
      console.error("Failed to load runs:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load evaluation runs."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  const summary = useMemo(() => {
    const total = runs.length;

    const promoted = runs.filter((run) =>
      ["approved", "approved_with_warnings", "promoted"].includes(
        String(run.status || "").toLowerCase()
      )
    ).length;

    const blocked = runs.filter((run) =>
      ["blocked", "failed"].includes(
        String(run.status || "").toLowerCase()
      )
    ).length;

    return {
      total,
      promoted,
      blocked,
    };
  }, [runs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="ml-64 min-h-screen p-8">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              LLMOps / Evaluation
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Evaluation Runs
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Review candidate evaluations and deployment decisions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRuns}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        <section className="mb-6 grid grid-cols-3 gap-4">
          <SummaryCard
            label="Total Runs"
            value={String(summary.total)}
          />

          <SummaryCard
            label="Promoted"
            value={String(summary.promoted)}
          />

          <SummaryCard
            label="Blocked"
            value={String(summary.blocked)}
          />
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800 p-5">
            <div>
              <h2 className="font-semibold">
                Evaluation History
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Candidate runs compared against the accepted baseline.
              </p>
            </div>

            <span className="text-xs text-zinc-500">
              {runs.length} runs
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading evaluation runs...
            </div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No evaluation runs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1100px]">
                <div className="grid grid-cols-[2fr_1.5fr_0.8fr_1fr_1fr_1fr_0.9fr] border-b border-zinc-800 px-5 py-3 text-xs font-medium text-zinc-500">
                  <span>Run</span>
                  <span>Model</span>
                  <span>Questions</span>
                  <span>Faithfulness</span>
                  <span>Coverage</span>
                  <span>Final Score</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-zinc-800">
                  {runs.map((run) => {
                    const faithfulness = getScore(
                      run,
                      "faithfulness"
                    );

                    const coverage = getScore(
                      run,
                      "coverage"
                    );

                    const finalScore = getFinalScore(run);

                    const status = String(
                      run.status || run.gate?.status || "unknown"
                    ).toLowerCase();

                    return (
                      <Link
                        key={run.run_id}
                        href={`/runs/${encodeURIComponent(run.run_id)}`}
                        className="group grid grid-cols-[2fr_1.5fr_0.8fr_1fr_1fr_1fr_0.9fr] items-center px-5 py-5 transition hover:bg-zinc-900"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-200">
                              {run.run_id}
                            </span>

                            <ChevronRight
                              size={14}
                              className="text-zinc-700 transition group-hover:text-zinc-400"
                            />
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600">
                            <Clock3 size={12} />
                            {formatDate(
                              run.created_at ||
                                run.metadata?.created_at
                            )}
                          </div>
                        </div>

                        <div className="pr-4 text-xs text-zinc-400">
                          {run.model ||
                            run.metadata?.answer_model ||
                            "Unknown model"}
                        </div>

                        <div className="text-sm text-zinc-300">
                          {run.question_count ||
                            run.total_questions ||
                            run.metadata?.question_count ||
                            0}
                        </div>

                        <Score value={faithfulness} />

                        <Score value={coverage} />

                        <Score value={finalScore} />

                        <Status status={status} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function getScore(
  run: DisplayRun,
  key: "faithfulness" | "coverage"
): number {
  const value = run[key];

  if (typeof value === "number") {
    return normalizeScore(value);
  }

  return 0;
}

function getFinalScore(run: DisplayRun): number {
  const value = run.final_score ?? run.finalScore;

  if (typeof value === "number") {
    return normalizeScore(value);
  }

  return 0;
}

function normalizeScore(value: number): number {
  if (value >= 0 && value <= 1) {
    return Number((value * 100).toFixed(1));
  }

  return Number(value.toFixed(1));
}

function formatDate(date?: string): string {
  if (!date) {
    return "Date unavailable";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function Score({
  value,
}: {
  value: number;
}) {
  let className = "text-zinc-200";

  if (value < 90) {
    className = "text-red-400";
  } else if (value < 93) {
    className = "text-yellow-400";
  }

  return (
    <span className={`text-sm font-medium ${className}`}>
      {value.toFixed(1)}%
    </span>
  );
}

function Status({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  const promoted = [
    "approved",
    "approved_with_warnings",
    "promoted",
  ].includes(normalizedStatus);

  const label =
    normalizedStatus === "approved_with_warnings"
      ? "APPROVED WITH WARNINGS"
      : normalizedStatus.toUpperCase();

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        promoted
          ? "bg-green-950 text-green-400"
          : "bg-red-950 text-red-400"
      }`}
    >
      {promoted ? (
        <CheckCircle2 size={12} />
      ) : (
        <ShieldAlert size={12} />
      )}

      {label}
    </span>
  );
}