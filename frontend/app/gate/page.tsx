import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  XCircle,
} from "lucide-react";

const gateChecks = [
  {
    name: "Faithfulness",
    description:
      "Detects unsupported claims in generated answers.",
    candidate: 91.4,
    baseline: 93.5,
    threshold: 92.0,
    type: "HARD",
    passed: false,
  },
  {
    name: "Coverage",
    description:
      "Measures whether answerable questions receive useful answers.",
    candidate: 94.8,
    baseline: 93.4,
    threshold: 90.0,
    type: "SOFT",
    passed: true,
  },
  {
    name: "Final Score",
    description:
      "Weighted aggregate of the evaluation signals.",
    candidate: 92.4,
    baseline: 93.2,
    threshold: 90.0,
    type: "SOFT",
    passed: true,
  },
];

export default function DeploymentGatePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="ml-64 min-h-screen p-8">
        {/* Header */}

        <header className="mb-8">
          <p className="text-sm text-zinc-500">
            LLMOps / Deployment
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Deployment Gate
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Evaluate whether the latest candidate RAG version is
            safe to promote against the accepted baseline.
          </p>
        </header>

        {/* Decision */}

        <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-950">
                <ShieldAlert
                  size={23}
                  className="text-red-400"
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-red-400">
                  Deployment Decision
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  Deployment Blocked
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                  The candidate failed a hard faithfulness gate.
                  The candidate should not replace the accepted
                  baseline.
                </p>
              </div>
            </div>

            <span className="rounded-full border border-red-800 bg-red-950/50 px-4 py-2 text-xs font-semibold text-red-400">
              BLOCKED
            </span>
          </div>

          {/* Version comparison */}

          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <VersionCard
              label="Accepted Baseline"
              version="baseline"
              model="openai/gpt-oss-120b"
              score="93.2%"
            />

            <ArrowRight
              size={20}
              className="text-zinc-700"
            />

            <VersionCard
              label="Candidate"
              version="candidate"
              model="openai/gpt-oss-120b"
              score="92.4%"
              blocked
            />
          </div>
        </section>

        {/* Gate configuration */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Gate Configuration
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Evaluation rules applied to the candidate.
                </p>
              </div>

              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                3 checks
              </span>
            </div>
          </div>

          <div className="divide-y divide-zinc-800">
            {gateChecks.map((check) => (
              <GateCheck
                key={check.name}
                check={check}
              />
            ))}
          </div>
        </section>

        {/* Gate logic */}

        <section className="mt-6 grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Hard Gate
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              Faithfulness
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Faithfulness is treated as a safety-critical signal.
              If the candidate falls below the configured threshold,
              deployment is blocked.
            </p>

            <div className="mt-5 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
              <div className="flex items-center gap-2">
                <XCircle
                  size={16}
                  className="text-red-400"
                />

                <span className="text-sm font-medium text-red-400">
                  Hard gate failed
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Candidate: 91.4% · Required: ≥ 92.0%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Soft Signals
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              Coverage & Final Score
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Coverage and the final aggregate score are treated as
              quality signals. They can generate warnings without
              automatically blocking deployment.
            </p>

            <div className="mt-5 rounded-lg border border-green-900/50 bg-green-950/20 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={16}
                  className="text-green-400"
                />

                <span className="text-sm font-medium text-green-400">
                  Soft checks passed
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Coverage and final score remain above their configured
                thresholds.
              </p>
            </div>
          </div>
        </section>

        {/* Decision explanation */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert
              size={18}
              className="mt-0.5 text-zinc-500"
            />

            <div>
              <h2 className="font-semibold">
                Why was this deployment blocked?
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                The candidate faithfulness score decreased from
                93.5% to 91.4%, crossing the configured hard-gate
                threshold of 92.0%. Because faithfulness is treated
                as a safety-critical metric, the deployment gate
                rejected the candidate even though coverage and the
                final score passed their soft thresholds.
              </p>

              <Link
                href="/runs/run_20260918_01"
                className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
              >
                Inspect failed evaluation
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* Pipeline */}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Evaluation Flow
          </p>

          <h2 className="mt-1 text-lg font-semibold">
            Candidate → Evaluation → Gate
          </h2>

          <div className="mt-6 flex items-center gap-2 overflow-x-auto">
            <PipelineStep
              number="01"
              title="Candidate"
              description="New RAG version"
            />

            <PipelineArrow />

            <PipelineStep
              number="02"
              title="Retrieve"
              description="Context retrieval"
            />

            <PipelineArrow />

            <PipelineStep
              number="03"
              title="Generate"
              description="LLM answer"
            />

            <PipelineArrow />

            <PipelineStep
              number="04"
              title="Evaluate"
              description="Claims + coverage"
            />

            <PipelineArrow />

            <PipelineStep
              number="05"
              title="Gate"
              description="Promote / block"
            />
          </div>
        </section>
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
          ? "border-red-900/50 bg-red-950/20"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {version}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {model}
          </p>
        </div>

        <p className="text-xl font-semibold">
          {score}
        </p>
      </div>
    </div>
  );
}

function GateCheck({
  check,
}: {
  check: {
    name: string;
    description: string;
    candidate: number;
    baseline: number;
    threshold: number;
    type: string;
    passed: boolean;
  };
}) {
  const difference = check.candidate - check.baseline;

  return (
    <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] items-center gap-4 px-6 py-5">
      {/* Metric */}

      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            {check.name}
          </p>

          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              check.type === "HARD"
                ? "bg-red-950 text-red-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {check.type}
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-zinc-600">
          {check.description}
        </p>
      </div>

      {/* Candidate */}

      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
          Candidate
        </p>

        <p className="mt-1 text-sm font-medium">
          {check.candidate.toFixed(1)}%
        </p>
      </div>

      {/* Baseline */}

      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
          Baseline
        </p>

        <p className="mt-1 text-sm font-medium">
          {check.baseline.toFixed(1)}%
        </p>
      </div>

      {/* Delta */}

      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
          Delta
        </p>

        <p
          className={`mt-1 text-sm font-medium ${
            difference < 0
              ? "text-red-400"
              : "text-green-400"
          }`}
        >
          {difference > 0 ? "+" : ""}
          {difference.toFixed(1)}%
        </p>
      </div>

      {/* Threshold */}

      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
          Threshold
        </p>

        <p className="mt-1 text-sm font-medium">
          ≥ {check.threshold.toFixed(1)}%
        </p>
      </div>

      {/* Result */}

      <div className="flex justify-end">
        {check.passed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-950 px-2.5 py-1 text-xs text-green-400">
            <CheckCircle2 size={12} />
            PASS
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-950 px-2.5 py-1 text-xs text-red-400">
            <XCircle size={12} />
            FAIL
          </span>
        )}
      </div>
    </div>
  );
}

function PipelineStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-[150px] rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-[10px] font-medium text-zinc-600">
        {number}
      </p>

      <p className="mt-2 text-sm font-medium">
        {title}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function PipelineArrow() {
  return (
    <ArrowRight
      size={16}
      className="shrink-0 text-zinc-700"
    />
  );
}