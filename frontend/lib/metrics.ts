
import {
  BaselineResponse,
  QuestionResult,
  RunListItem,
  RunResultResponse,
} from "@/lib/api";

export interface MetricSummary {
  faithfulness: number;
  coverage: number;
  finalScore: number;
  questionCount: number;
}

export function toPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value >= 0 && value <= 1) {
    return Number((value * 100).toFixed(1));
  }

  return Number(value.toFixed(1));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeResults(
  results: QuestionResult[] = []
): MetricSummary {
  return {
    faithfulness: toPercentage(
      average(
        results.map((result) => result.faithfulness || 0)
      )
    ),

    coverage: toPercentage(
      average(
        results.map((result) => result.coverage || 0)
      )
    ),

    finalScore: toPercentage(
      average(
        results.map((result) => result.final_score || 0)
      )
    ),

    questionCount: results.length,
  };
}

export function getRunStatus(
  run: RunListItem | RunResultResponse
): string {
  if ("gate" in run && run.gate?.status) {
    return String(run.gate.status).toLowerCase();
  }

  if ("status" in run && run.status) {
    return String(run.status).toLowerCase();
  }

  return "unknown";
}

export function isPromoted(status: string): boolean {
  return [
    "approved",
    "approved_with_warnings",
    "promoted",
  ].includes(status.toLowerCase());
}

export function isBlocked(status: string): boolean {
  return [
    "blocked",
    "failed",
  ].includes(status.toLowerCase());
}

export function getLatestRun(
  runs: RunListItem[]
): RunListItem | null {
  if (!runs || runs.length === 0) {
    return null;
  }

  const sorted = [...runs].sort((a, b) => {
    const dateA = new Date(
      a.created_at ||
        a.metadata?.created_at ||
        0
    ).getTime();

    const dateB = new Date(
      b.created_at ||
        b.metadata?.created_at ||
        0
    ).getTime();

    return dateB - dateA;
  });

  return sorted[0] || null;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(date?: string): string {
  if (!date) {
    return "Date unavailable";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}