import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  GitCompare,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const metrics = [
  {
    name: "Faithfulness",
    description: "Percentage of generated claims supported by context.",
    baseline: 93.5,
    candidate: 91.4,
    threshold: 92.0,
    status: "REGRESSED",
    critical: true,
  },
  {
    name: "Coverage",
    description: "Percentage of questions that receive answerable responses.",
    baseline: 93.4,
    candidate: 94.8,
    threshold: 90.0,
    status: "IMPROVED",
    critical: false,
  },
  {
    name: "Final Score",
    description: "Weighted aggregate evaluation score.",
    baseline: 93.2,
    candidate: 92.4,
    threshold: 90.0,
    status: "REGRESSED",
    critical: false,
  },
];

const history = [
  {
    version: "baseline",
    date: "14 Sep 2026",
    faithfulness: 95.2,
    coverage: 92.1,
    finalScore: 94.3,
    status: "ACCEPTED",
  },
  {
    version: "candidate-v1",
    date: "15 Sep 2026",
    faithfulness: 94.8,
    coverage: 91.7,
    finalScore: 93.9,
    status: "PROMOTED",
  },
  {
    version: "candidate-v2",
    date: "16 Sep 2026",
    faithfulness: 94.1,
    coverage: 92.8,
    finalScore: 93.7,
    status: "PROMOTED",
  },
  {
    version: "candidate-v3",
    date: "17 Sep 2026",
    faithfulness: 93.5,
    coverage: 93.4,
    finalScore: 93.2,
    status: "PROMOTED",
  },
  {
    version: "candidate-v4",
    date: "18 Sep 2026",
    faithfulness: 91.4,
    coverage: 94.8,
    finalScore: 92.4,
    status: "BLOCKED",
  },
];

export default function BaselinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="ml-64 min-h-screen p-8">
        {/* Header */}

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
            to identify quality regressions before deployment.
          </p>
        </header>

        {/* Version comparison */}

        <section className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-5">
          <VersionCard
            title="Accepted Baseline"
            version="baseline"
            model="openai/gpt-oss-120b"
            date="14 Sep 2026"
            score="93.2%"
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
            version="candidate-v4"
            model="openai/gpt-oss-120b"
            date="18 Sep 2026"
            score="92.4%"
            blocked
          />
        </section>

        {/* Overall change */}

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

            <div className="flex items-center gap-2 rounded-full bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-400">
              <TrendingDown size={14} />

              Regression detected
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <ComparisonStat
              label="Baseline Score"
              value="93.2%"
            />

            <ComparisonStat
              label="Candidate Score"
              value="92.4%"
            />

            <ComparisonStat
              label="Overall Delta"
              value="-0.8%"
              danger
            />
          </div>
        </section>

        {/* Metric comparison */}

        <section className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 p-6">
            <h2 className="font-semibold">
              Metric Comparison
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Individual evaluation signals used by the deployment gate.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header */}

              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] border-b border-zinc-800 px-6 py-3 text-xs font-medium text-zinc-500">
                <span>Metric</span>
                <span>Baseline</span>
                <span>Candidate</span>
                <span>Delta</span>
                <span>Threshold</span>
                <span>Result</span>
              </div>

              {/* Rows */}

              <div className="divide-y divide-zinc-800">
                {metrics.map((metric) => {
                  const delta =
                    metric.candidate - metric.baseline;

                  return (
                    <div
                      key={metric.name}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-6 py-6"
                    >
                      {/* Metric */}

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {metric.name}
                          </p>

                          {metric.critical && (
                            <span className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] font-medium text-red-400">
                              HARD GATE
                            </span>
                          )}
                        </div>

                        <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-600">
                          {metric.description}
                        </p>
                      </div>

                      {/* Baseline */}

                      <p className="text-sm font-medium text-zinc-300">
                        {metric.baseline.toFixed(1)}%
                      </p>

                      {/* Candidate */}

                      <p className="text-sm font-medium text-zinc-300">
                        {metric.candidate.toFixed(1)}%
                      </p>

                      {/* Delta */}

                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          delta < 0
                            ? "text-red-400"
                            : "text-green-400"
                        }`}
                      >
                        {delta < 0 ? (
                          <ArrowDownRight size={15} />
                        ) : (
                          <ArrowUpRight size={15} />
                        )}

                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)}%
                      </div>

                      {/* Threshold */}

                      <p className="text-sm text-zinc-400">
                        ≥ {metric.threshold.toFixed(1)}%
                      </p>

                      {/* Result */}

                      {metric.status === "REGRESSED" ? (
                        <span className="flex w-fit items-center gap-1 rounded-full bg-red-950 px-2.5 py-1 text-xs text-red-400">
                          <ShieldAlert size={12} />

                          REGRESSED
                        </span>
                      ) : (
                        <span className="flex w-fit items-center gap-1 rounded-full bg-green-950 px-2.5 py-1 text-xs text-green-400">
                          <TrendingUp size={12} />

                          IMPROVED
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Visual comparison */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Score Distribution
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Baseline vs Candidate
            </h2>
          </div>

          <div className="space-y-7">
            <ComparisonBar
              label="Faithfulness"
              baseline={93.5}
              candidate={91.4}
              critical
            />

            <ComparisonBar
              label="Coverage"
              baseline={93.4}
              candidate={94.8}
            />

            <ComparisonBar
              label="Final Score"
              baseline={93.2}
              candidate={92.4}
            />
          </div>
        </section>

        {/* History */}

        <section className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 p-6">
            <h2 className="font-semibold">
              Evaluation History
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Previously accepted and rejected candidate versions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              <div className="grid grid-cols-[1.4fr_1.3fr_1fr_1fr_1fr_1fr] border-b border-zinc-800 px-6 py-3 text-xs font-medium text-zinc-500">
                <span>Version</span>
                <span>Date</span>
                <span>Faithfulness</span>
                <span>Coverage</span>
                <span>Final Score</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-zinc-800">
                {history.map((item) => (
                  <div
                    key={item.version}
                    className="grid grid-cols-[1.4fr_1.3fr_1fr_1fr_1fr_1fr] items-center px-6 py-5"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.version}
                      </p>

                      {item.version === "baseline" && (
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                          Current baseline
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500">
                      {item.date}
                    </p>

                    <p className="text-sm">
                      {item.faithfulness.toFixed(1)}%
                    </p>

                    <p className="text-sm">
                      {item.coverage.toFixed(1)}%
                    </p>

                    <p className="text-sm font-medium">
                      {item.finalScore.toFixed(1)}%
                    </p>

                    <Status status={item.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Inspect run */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Inspect Candidate
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Review the individual claims and evidence that caused
                the regression.
              </p>
            </div>

            <Link
              href="/runs/run_20260918_01"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              Open Run
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
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
          ? "border-red-900/50 bg-red-950/20"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </p>

        {blocked ? (
          <span className="rounded-full bg-red-950 px-2.5 py-1 text-[10px] font-medium text-red-400">
            BLOCKED
          </span>
        ) : (
          <span className="rounded-full bg-green-950 px-2.5 py-1 text-[10px] font-medium text-green-400">
            ACCEPTED
          </span>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-5">
        <div>
          <p className="text-lg font-semibold">
            {version}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {model}
          </p>

          <p className="mt-2 text-xs text-zinc-600">
            {date}
          </p>
        </div>

        <p className="text-3xl font-semibold">
          {score}
        </p>
      </div>
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
        className={`mt-2 text-xl font-semibold ${
          danger ? "text-red-400" : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ComparisonBar({
  label,
  baseline,
  candidate,
  critical = false,
}: {
  label: string;
  baseline: number;
  candidate: number;
  critical?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {label}
          </span>

          {critical && (
            <span className="text-[10px] uppercase tracking-wider text-red-400">
              Hard gate
            </span>
          )}
        </div>

        <div className="flex gap-5 text-xs">
          <span className="text-zinc-500">
            Baseline {baseline.toFixed(1)}%
          </span>

          <span className="text-zinc-200">
            Candidate {candidate.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Baseline */}

        <div className="flex items-center gap-3">
          <span className="w-16 text-[10px] text-zinc-600">
            BASELINE
          </span>

          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-600"
              style={{ width: `${baseline}%` }}
            />
          </div>
        </div>

        {/* Candidate */}

        <div className="flex items-center gap-3">
          <span className="w-16 text-[10px] text-zinc-600">
            CANDIDATE
          </span>

          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${
                candidate < baseline
                  ? "bg-red-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${candidate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Status({
  status,
}: {
  status: string;
}) {
  if (status === "BLOCKED") {
    return (
      <span className="flex w-fit items-center gap-1 rounded-full bg-red-950 px-2.5 py-1 text-xs text-red-400">
        <ShieldAlert size={12} />
        BLOCKED
      </span>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <span className="flex w-fit items-center gap-1 rounded-full bg-blue-950 px-2.5 py-1 text-xs text-blue-400">
        <CheckCircle2 size={12} />
        ACCEPTED
      </span>
    );
  }

  return (
    <span className="flex w-fit items-center gap-1 rounded-full bg-green-950 px-2.5 py-1 text-xs text-green-400">
      <CheckCircle2 size={12} />
      PROMOTED
    </span>
  );
}