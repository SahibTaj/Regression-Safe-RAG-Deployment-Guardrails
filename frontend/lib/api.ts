
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// ============================================================
// Types
// ============================================================

export type RunMode = "candidate" | "development";

export type RunStatusValue =
  | "queued"
  | "running"
  | "development"
  | "approved"
  | "approved_with_warnings"
  | "blocked"
  | "failed";

export interface StartRunRequest {
  mode?: RunMode;
}

export interface StartRunResponse {
  run_id: string;
  status: string;
}

export interface RunStatusResponse {
  run_id: string;
  status: RunStatusValue | string;
  progress: number;
  total_questions: number;
  completed_questions: number;
  error: string | null;
  promoted?: boolean;
}

export interface Claim {
  id: number;
  text: string;
}

export interface FaithfulnessDetail {
  claim: string;
  supported: boolean;
  evidence: string;
}

export interface CoverageDetails {
  answerable: boolean;
  abstained: boolean;
  extraction_failed: boolean;
  reason: string;
}

export interface QuestionResult {
  question: string;
  answer: string;
  claims: Claim[];
  claim_extraction_failed: boolean;

  faithfulness: number;
  faithfulness_details: FaithfulnessDetail[];

  coverage: number;
  coverage_details: CoverageDetails;

  final_score: number;
}

export interface RegressionFailure {
  question: string;
  reason: string;
  baseline: number;
  candidate: number;
  drop: number;
}

export interface RegressionWarning {
  question: string;
  reason: string;
  baseline: number;
  candidate: number;
  drop: number;
}

export interface GateResult {
  status:
    | "development"
    | "approved"
    | "approved_with_warnings"
    | "blocked"
    | "failed"
    | string;

  reason: string;
  failures: RegressionFailure[];
  warnings: RegressionWarning[];

  dataset_differences?: {
    missing_from_current?: string[];
    new_in_current?: string[];
  };
}

export interface RunMetadata {
  created_at?: string;
  promoted_at?: string;
  source_run?: string;
  answer_model?: string;
  eval_model?: string;
  question_count?: number;
  mode?: string;
}

export interface RunResultResponse {
  run_id: string;
  results: QuestionResult[];
  gate: GateResult;
  metadata: RunMetadata;
  path?: string;
}

export interface RunListItem {
  run_id: string;
  status?: string;
  progress?: number;
  total_questions?: number;
  completed_questions?: number;
  created_at?: string;
  question_count?: number;
  gate?: GateResult;
  metadata?: RunMetadata;
}

export interface RunListResponse {
  runs: RunListItem[];
  total?: number;
}

export interface BaselineResponse {
  metadata: RunMetadata;
  results: QuestionResult[];
}

export interface HealthResponse {
  status: string;
  service: string;
}

// ============================================================
// Generic API helper
// ============================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorData = data as {
      detail?: string | { msg?: string }[];
    } | null;

    let errorMessage = `API request failed with status ${response.status}`;

    if (typeof errorData?.detail === "string") {
      errorMessage = errorData.detail;
    } else if (Array.isArray(errorData?.detail)) {
      errorMessage = errorData.detail
        .map((error) => error.msg || "Validation error")
        .join(", ");
    }

    throw new Error(errorMessage);
  }

  return data as T;
}

// ============================================================
// Health
// ============================================================

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

// ============================================================
// Evaluation runs
// ============================================================

/**
 * Starts a new evaluation run.
 *
 * The backend creates a run ID and executes the evaluation
 * in the background.
 */
export async function startEvaluation(
  request: StartRunRequest = {}
): Promise<StartRunResponse> {
  const mode = request.mode || "candidate";

  return apiRequest<StartRunResponse>("/runs", {
    method: "POST",
    body: JSON.stringify({
      mode,
    }),
  });
}

/**
 * Gets the current progress and status of a run.
 */
export async function getRunStatus(
  runId: string
): Promise<RunStatusResponse> {
  return apiRequest<RunStatusResponse>(
    `/runs/${encodeURIComponent(runId)}`
  );
}

/**
 * Gets the complete result of a finished run.
 */
export async function getRunResult(
  runId: string
): Promise<RunResultResponse> {
  return apiRequest<RunResultResponse>(
    `/runs/${encodeURIComponent(runId)}/result`
  );
}

/**
 * Gets all saved evaluation runs.
 */
export async function getRuns(): Promise<RunListResponse> {
  return apiRequest<RunListResponse>("/runs");
}

/**
 * Alias for getRuns.
 *
 * This is useful if another component uses listRuns().
 */
export async function listRuns(): Promise<RunListResponse> {
  return getRuns();
}

// ============================================================
// Baseline
// ============================================================

/**
 * Gets the current accepted baseline.
 */
export async function getBaseline(): Promise<BaselineResponse> {
  return apiRequest<BaselineResponse>("/baseline");
}

// ============================================================
// Polling helper
// ============================================================

/**
 * Polls a run until it reaches a final state.
 *
 * This helper is optional. Your dashboard can also perform
 * polling manually with useEffect and setTimeout.
 */
export async function waitForRunCompletion(
  runId: string,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatusChange?: (status: RunStatusResponse) => void;
  } = {}
): Promise<RunStatusResponse> {
  const intervalMs = options.intervalMs ?? 3000;
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;

  const startTime = Date.now();

  while (true) {
    const status = await getRunStatus(runId);

    options.onStatusChange?.(status);

    const isFinished = [
      "approved",
      "approved_with_warnings",
      "blocked",
      "development",
      "failed",
    ].includes(status.status);

    if (isFinished) {
      return status;
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(
        "Evaluation timed out while waiting for completion."
      );
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
}

// ============================================================
// Utility functions
// ============================================================

/**
 * Converts a score between 0 and 1 into a percentage.
 */
export function scoreToPercentage(score: number): number {
  return Number((score * 100).toFixed(1));
}

/**
 * Formats a score between 0 and 1 as a percentage string.
 */
export function formatScore(score: number): string {
  return `${scoreToPercentage(score)}%`;
}

/**
 * Returns true when a run is still processing.
 */
export function isRunActive(status: string): boolean {
  return status === "queued" || status === "running";
}

/**
 * Returns true when a run has reached a final state.
 */
export function isRunFinished(status: string): boolean {
  return [
    "approved",
    "approved_with_warnings",
    "blocked",
    "development",
    "failed",
  ].includes(status);
}

/**
 * Returns a readable label for a backend status.
 */
export function formatRunStatus(status: string): string {
  switch (status) {
    case "queued":
      return "Queued";

    case "running":
      return "Running";

    case "approved":
      return "Approved";

    case "approved_with_warnings":
      return "Approved with Warnings";

    case "blocked":
      return "Blocked";

    case "development":
      return "Development";

    case "failed":
      return "Failed";

    default:
      return status;
  }
}