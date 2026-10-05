import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  ShieldAlert,
  XCircle,
} from "lucide-react";

const claims = [
  {
    id: 1,
    text: "FAISS is a library for efficient similarity search and clustering of dense vectors.",
    supported: true,
    evidence:
      "FAISS is a library for efficient similarity search and clustering of dense vectors.",
  },
  {
    id: 2,
    text: "FAISS was developed by Google Research.",
    supported: false,
    evidence:
      "No supporting evidence was found in the retrieved context.",
  },
  {
    id: 3,
    text: "FAISS can be used to search through embeddings.",
    supported: true,
    evidence:
      "The library supports efficient similarity search over dense vectors.",
  },
];

const documents = [
  {
    id: "doc-01",
    title: "Vector Database Documentation",
    score: 0.91,
    preview:
      "Vector databases store embeddings and allow efficient similarity search across high-dimensional vectors.",
  },
  {
    id: "doc-02",
    title: "FAISS Technical Overview",
    score: 0.87,
    preview:
      "FAISS is a library for efficient similarity search and clustering of dense vectors.",
  },
  {
    id: "doc-03",
    title: "Embedding Fundamentals",
    score: 0.81,
    preview:
      "Embeddings represent data as vectors in a continuous numerical space.",
  },
];

export default async function RunDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Sidebar />

      <main className="ml-64 min-h-screen p-8">
        {/* Back button */}

        <Link
          href="/runs"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft size={16} />

          Back to evaluation runs
        </Link>

        {/* Header */}

        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Evaluation Run
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {id}
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Candidate evaluation against the accepted baseline.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-red-900 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-400">
            <ShieldAlert size={16} />

            BLOCKED
          </div>
        </header>

        {/* Metadata */}

        <section className="mt-8 grid grid-cols-4 gap-4">
          <MetricCard
            label="Model"
            value="openai/gpt-oss-120b"
          />

          <MetricCard
            label="Questions"
            value="120"
          />

          <MetricCard
            label="Evaluation"
            value="18 Sep 2026"
          />

          <MetricCard
            label="Gate"
            value="BLOCKED"
          />
        </section>

        {/* Scores */}

        <section className="mt-6 grid grid-cols-3 gap-4">
          <ScoreCard
            label="Faithfulness"
            value={91.4}
            baseline={93.5}
            critical
          />

          <ScoreCard
            label="Coverage"
            value={94.8}
            baseline={93.4}
          />

          <ScoreCard
            label="Final Score"
            value={92.4}
            baseline={93.2}
          />
        </section>

        {/* Deployment Gate */}

        <section className="mt-6 rounded-xl border border-red-900/50 bg-red-950/20 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert
              size={21}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <div className="flex-1">
              <h2 className="font-semibold">
                Deployment Gate: Blocked
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                The candidate run was blocked because faithfulness
                regressed against the accepted baseline.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-4">
                <GateMetric
                  label="Candidate"
                  value="91.4%"
                />

                <GateMetric
                  label="Baseline"
                  value="93.5%"
                />

                <GateMetric
                  label="Change"
                  value="-2.1%"
                  danger
                />
              </div>
            </div>
          </div>
        </section>

        {/* Question Evaluation */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-sm text-zinc-500">
              Question Evaluation
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Example evaluated question
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
            {/* Question */}

            <div className="border-b border-zinc-800 p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Question
              </p>

              <p className="mt-3 text-base leading-7 text-zinc-200">
                What is FAISS and what is it used for?
              </p>
            </div>

            {/* Answer */}

            <div className="border-b border-zinc-800 p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Generated Answer
              </p>

              <p className="mt-3 text-sm leading-7 text-zinc-300">
                FAISS is a library for efficient similarity search
                and clustering of dense vectors. It can be used to
                search through embeddings and retrieve similar
                vectors efficiently.
              </p>
            </div>

            {/* Claims */}

            <div className="p-6">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Claim-Level Faithfulness
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Each factual claim is independently verified
                    against the retrieved context.
                  </p>
                </div>

                <span className="text-lg font-semibold">
                  2 / 3
                </span>
              </div>

              <div className="space-y-4">
                {claims.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Retrieved Documents */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-sm text-zinc-500">
              Retrieval
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Retrieved Documents
            </h2>
          </div>

          <div className="space-y-3">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
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

      <p className="mt-3 truncate text-sm font-medium text-zinc-200">
        {value}
      </p>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  baseline,
  critical = false,
}: {
  label: string;
  value: number;
  baseline: number;
  critical?: boolean;
}) {
  const difference = value - baseline;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {label}
        </p>

        {critical && (
          <ShieldAlert
            size={16}
            className="text-red-400"
          />
        )}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className="text-2xl font-semibold">
          {value.toFixed(1)}%
        </p>

        <p
          className={`text-xs ${
            difference < 0
              ? "text-red-400"
              : "text-green-400"
          }`}
        >
          {difference > 0 ? "+" : ""}
          {difference.toFixed(1)}%
        </p>
      </div>

      <p className="mt-2 text-xs text-zinc-600">
        Baseline: {baseline.toFixed(1)}%
      </p>
    </div>
  );
}

function GateMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-2 text-lg font-semibold ${
          danger ? "text-red-400" : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ClaimCard({
  claim,
}: {
  claim: {
    id: number;
    text: string;
    supported: boolean;
    evidence: string;
  };
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        claim.supported
          ? "border-green-900/50 bg-green-950/10"
          : "border-red-900/50 bg-red-950/10"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 gap-3">
          {claim.supported ? (
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-green-400"
            />
          ) : (
            <XCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-400"
            />
          )}

          <div className="min-w-0">
            <p className="text-sm leading-6 text-zinc-200">
              {claim.text}
            </p>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Evidence
              </p>

              <p className="mt-2 text-xs leading-5 text-zinc-400">
                {claim.evidence}
              </p>
            </div>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            claim.supported
              ? "bg-green-950 text-green-400"
              : "bg-red-950 text-red-400"
          }`}
        >
          {claim.supported
            ? "SUPPORTED"
            : "UNSUPPORTED"}
        </span>
      </div>
    </div>
  );
}

function DocumentCard({
  document,
}: {
  document: {
    id: string;
    title: string;
    score: number;
    preview: string;
  };
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 gap-3">
          <FileText
            size={18}
            className="mt-0.5 shrink-0 text-zinc-500"
          />

          <div className="min-w-0">
            <p className="text-sm font-medium">
              {document.title}
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {document.preview}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-zinc-600">
            Retrieval score
          </p>

          <p className="mt-1 text-sm font-medium text-zinc-300">
            {document.score.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}