# Regression-Safe RAG Deployment Guardrails

A web-based LLMOps platform for evaluating Retrieval-Augmented Generation (RAG) systems, detecting quality regressions, and preventing unsafe candidate versions from being promoted.

The goal of this project is not to build another RAG chatbot. The goal is to build a **usable evaluation and deployment-gating service** that developers can run against their own RAG systems, inspect through a web dashboard, and eventually deploy as a publicly accessible application.

> **Core idea:** A RAG system should not be deployed just because it produces fluent answers. Its quality should be evaluated against an accepted baseline before promotion.

---

## Product Vision

The intended product workflow is:

```text
                    RAG Evaluation Platform

User / Developer
       │
       │ submits evaluation
       ▼
┌──────────────────────┐
│     FastAPI API      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     RAG Pipeline     │
│                      │
│ Retrieval            │
│ Generation           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      Evaluation      │
│                      │
│ Claim Extraction     │
│ Faithfulness         │
│ Coverage             │
│ Final Score          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Regression Gate    │
│                      │
│ Candidate vs         │
│ Accepted Baseline    │
└──────────┬───────────┘
           │
       ┌───┴────┐
       ▼        ▼
    PROMOTE    BLOCK
       │        │
       └───┬────┘
           ▼
┌──────────────────────┐
│    Next.js Dashboard │
│                      │
│ Runs                 │
│ Evidence             │
│ Gate                 │
│ Baseline             │
│ Analytics            │
└──────────────────────┘
```

The final deployed application is intended to allow users to interact with the evaluation platform through a browser rather than requiring them to run the Python project locally.

---

# What the Platform Does

## 1. Evaluate RAG Responses

The platform evaluates a RAG system using a configurable test-question dataset.

For each question:

```text
Question
   ↓
Retrieve relevant document chunks
   ↓
Generate answer
   ↓
Extract factual claims
   ↓
Evaluate claims against retrieved context
   ↓
Evaluate context answerability
   ↓
Calculate final score
```

Current RAG components include:

- FAISS vector search
- Hugging Face `sentence-transformers/all-MiniLM-L6-v2`
- Groq-hosted LLMs
- configurable chunk size
- configurable chunk overlap
- configurable top-k retrieval

---

## 2. Claim-Level Faithfulness

The platform breaks generated answers into factual claims.

Example:

```text
Generated answer
       ↓
Claim 1
Claim 2
Claim 3
Claim 4
       ↓
Check each claim against retrieved context
```

Each claim receives:

- supported / unsupported verdict
- supporting evidence

The aggregate faithfulness score is based on the proportion of supported claims.

This makes it possible to inspect **which claim caused a quality failure**, instead of relying only on an overall LLM score.

---

## 3. Coverage / Answerability

The platform separately evaluates whether the retrieved context contains enough information to answer the question.

This helps distinguish:

```text
Context contains sufficient information
              ↓
             Answer
```

from:

```text
Context does not contain enough information
              ↓
       Safe abstention
```

The pipeline also records whether claim extraction failed so evaluator failures are not automatically treated as legitimate model abstentions.

---

## 4. Regression Detection

A candidate evaluation is compared against an accepted baseline.

Current regression policy:

| Metric | Type | Purpose |
|---|---|---|
| Faithfulness | Hard gate | Important quality regression can block promotion |
| Coverage | Soft signal | Coverage regression produces a warning |
| Final score | Hard gate | Large quality drops can block promotion |

The regression engine matches questions by their question text rather than relying on list position.

Candidate and baseline evaluation datasets must also be compatible before a regression comparison is performed.

---

# Baseline Lifecycle

Baseline management is intentionally explicit.

## Smoke Test

```bash
python app.py --smoke
```

The smoke test evaluates only the first question.

It:

- verifies the pipeline is functioning
- saves a run artifact
- does not modify the baseline
- does not make a deployment decision

This prevents a quick development test from accidentally becoming the accepted baseline.

---

## Create an Accepted Baseline

```bash
python app.py --set-baseline
```

This explicitly evaluates the configured evaluation suite and creates the accepted baseline.

The baseline represents the version against which future candidate runs are compared.

---

## Evaluate a Candidate

```bash
python app.py
```

A normal candidate evaluation:

1. runs the evaluation suite
2. stores the candidate run
3. loads the accepted baseline
4. validates dataset compatibility
5. calculates regressions
6. blocks or promotes the candidate
7. preserves the previous baseline when a candidate fails

The intended lifecycle is:

```text
                 Candidate
                     │
                     ▼
              Run evaluation
                     │
                     ▼
              Save run artifact
                     │
                     ▼
             Load accepted baseline
                     │
                     ▼
             Regression evaluation
                     │
             ┌───────┴───────┐
             ▼               ▼
           PASS             FAIL
             │               │
             ▼               ▼
        Promote          Block
        candidate        candidate
             │               │
             ▼               ▼
       New baseline     Old baseline
        accepted        preserved
```

---

# Web Application

The project is being developed as a complete web application.

## Frontend

The frontend is built with:

- Next.js
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

Current dashboard areas:

```text
Dashboard
Evaluation Runs
Run Details
Deployment Gate
Baseline Comparison
Analytics
```

The UI is intentionally designed as an **LLMOps/evaluation console**, not as a chatbot.

The frontend will eventually consume real API data instead of mock values.

---

# Backend

The Python evaluation engine will be exposed through FastAPI.

Planned API surface:

```text
GET  /health
GET  /runs
GET  /runs/{run_id}
GET  /baseline
GET  /gate
GET  /analytics
POST /evaluate
```

The initial backend will use the existing JSON run artifacts and baseline files.

A database can be introduced later if the deployed application requires persistent multi-user storage.

---

# Public Deployment Goal

The end goal is a publicly accessible application that anybody can use.

Target architecture:

```text
                     Internet
                         │
                         ▼
                ┌─────────────────┐
                │   Vercel / CDN  │
                │    Next.js UI   │
                └────────┬────────┘
                         │ HTTPS
                         ▼
                ┌─────────────────┐
                │ FastAPI Backend │
                │ Render/Railway  │
                │ or similar      │
                └────────┬────────┘
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          RAG Engine  Evaluation  Storage
             │           │           │
             └───────────┼───────────┘
                         ▼
                    LLM Provider
```

The LLM API key will remain on the backend.

It must never be exposed in the Next.js client.

For a public deployment, the project will eventually need to address:

- authentication or abuse protection
- API rate limiting
- request size limits
- secure API-key handling
- CORS configuration
- persistent storage
- deployment logging
- cost controls
- timeout/error handling
- secrets management

These are deployment requirements to implement before opening the service to unrestricted public traffic.

---

# Current Architecture

```text
Regression-Safe-RAG-Guardrails-Evaluation-Platform/
│
├── baselines/
│   └── baseline.json
│
├── data/
│   ├── documents/
│   └── test_questions.json
│
├── evaluation/
│   ├── claims.py
│   ├── coverage.py
│   ├── faithfulness.py
│   ├── final_score.py
│   ├── load_baseline.py
│   ├── regression.py
│   ├── save_baseline.py
│   └── save_run.py
│
├── observability/
│   └── metrics.py
│
├── rag/
│   ├── generator.py
│   ├── pipeline.py
│   └── retriever.py
│
├── runs/
│   └── run_*.json
│
├── security/
│   ├── injection_tests.yaml
│   └── runner.py
│
├── frontend/
│   ├── app/
│   │   ├── analytics/
│   │   ├── baseline/
│   │   ├── gate/
│   │   ├── runs/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   └── components/
│       └── Sidebar.tsx
│
├── app.py
├── config.py
├── config.yaml
├── requirements.txt
└── README.md
```

---

# Configuration

Main configuration:

```yaml
llm:
  answer_model: openai/gpt-oss-120b
  eval_model: qwen/qwen3.8-27b
  temperature: 0

retriever:
  top_k: 4
  chunk_size: 1000
  chunk_overlap: 200

paths:
  documents_dir: data/documents
  questions_file: data/test_questions.json
```

The exact models available to a deployed instance may change over time. Model IDs should therefore remain configuration-driven rather than hardcoded throughout the application.

---

# Evaluation Artifacts

Each evaluation produces a timestamped JSON artifact:

```text
runs/run_20260918_154823.json
```

Example:

```json
{
  "metadata": {
    "answer_model": "openai/gpt-oss-120b",
    "eval_model": "qwen/qwen3.8-27b",
    "timestamp": "..."
  },
  "results": [
    {
      "question": "What is RAG?",
      "faithfulness": 0.92,
      "coverage": 1.0,
      "final_score": 0.95
    }
  ]
}
```

The accepted baseline is stored separately:

```text
baselines/baseline.json
```

These artifacts provide a lightweight audit trail for candidate evaluations.

---

# Local Setup

## 1. Clone

```bash
git clone https://github.com/SahibTaj/Regression-Safe-RAG-Deployment-Guardrails.git
cd Regression-Safe-RAG-Deployment-Guardrails
```

## 2. Create Python environment

Windows:

```powershell
python -m venv venv
venv\Scriptsctivate
```

Linux/macOS:

```bash
python3 -m venv venv
source venv/bin/activate
```

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. Configure environment variables

Create `.env`:

```env
GROQ_API_KEY=your_api_key_here
```

Never commit `.env` or API keys.

---

# Run the Backend Evaluation

Smoke test:

```bash
python app.py --smoke
```

Create baseline:

```bash
python app.py --set-baseline
```

Candidate evaluation:

```bash
python app.py
```

---

# Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend currently contains dashboard presentation data while the FastAPI integration is being completed.

---

# Development Roadmap

The project is intentionally being built in stages so that each stage produces a working system.

## Phase 1 — Stable Evaluation Engine

- [x] RAG retrieval
- [x] Answer generation
- [x] Claim extraction
- [x] Claim-level faithfulness
- [x] Coverage evaluation
- [x] Final scoring
- [x] Candidate run storage
- [x] Baseline management
- [x] Regression gate
- [x] Question-based regression matching
- [x] Smoke-test mode
- [x] Explicit baseline creation

## Phase 2 — Real Web Application

- [x] Next.js application
- [x] Dashboard
- [x] Evaluation Runs page
- [x] Run Details page
- [x] Deployment Gate page
- [x] Baseline Comparison page
- [x] Analytics page
- [ ] FastAPI application
- [ ] Connect frontend to backend
- [ ] Replace mock dashboard data
- [ ] Real run-detail inspection
- [ ] Real baseline/gate information
- [ ] Real analytics

## Phase 3 — Production-Ready Evaluation

- [ ] Robust structured evaluator outputs
- [ ] Better evaluator error handling
- [ ] Reproducibility metadata
- [ ] Git commit/config/data/model version tracking
- [ ] Token usage tracking
- [ ] Latency tracking
- [ ] Cost estimation
- [ ] Retrieval quality metrics
- [ ] Prompt-injection regression tests
- [ ] Stronger evaluation dataset

## Phase 4 — Public Deployment

- [ ] Deploy Next.js frontend
- [ ] Deploy FastAPI backend
- [ ] Configure HTTPS/CORS
- [ ] Secure secret management
- [ ] API rate limiting
- [ ] Request limits
- [ ] Error handling and timeouts
- [ ] Persistent storage
- [ ] Authentication/abuse protection as required
- [ ] Deployment monitoring
- [ ] Cost controls
- [ ] Public documentation

## Phase 5 — Automated CI/CD

The final development stage can integrate the evaluation gate with source control:

```text
Developer changes RAG system
            ↓
        Git push
            ↓
       CI evaluation
            ↓
      Candidate scores
            ↓
     Compare baseline
            ↓
      ┌─────┴─────┐
      ▼           ▼
    PASS         FAIL
      │           │
      ▼           ▼
  Continue      Stop
  deployment   deployment
```

Potential implementation:

- GitHub Actions
- automated evaluation
- baseline comparison
- deployment blocking
- evaluation artifacts

---

# Production Quality Goals

Before calling the public service production-ready, the project should be able to demonstrate:

### Reliability

- evaluator failures are distinguishable from model failures
- malformed LLM output is handled safely
- timeouts and provider errors do not silently corrupt results
- candidate runs remain auditable

### Reproducibility

A run should eventually identify:

```text
Run ID
Model versions
Embedding model
Retriever configuration
Chunking configuration
Evaluation dataset
Git commit
Timestamp
```

### Security

The deployed service should protect:

```text
API keys
User data
Uploaded documents
Provider credentials
Internal evaluation prompts
```

and should include appropriate input validation and abuse controls.

### Observability

The platform should eventually expose:

```text
Quality
├── Faithfulness
├── Coverage
├── Retrieval quality
└── Final score

Performance
├── Latency
└── Throughput

LLM usage
├── Input tokens
├── Output tokens
└── Estimated cost

Deployment
├── Promoted runs
└── Blocked runs
```

---

# Important Project Scope

This project is intentionally **not** trying to become a full enterprise MLOps platform.

The core product is:

> **A deployable RAG evaluation service that detects regressions and provides evidence for deployment decisions.**

The development priority is:

```text
Working evaluator
      ↓
Real API
      ↓
Real frontend
      ↓
Deployable application
      ↓
Security + reliability
      ↓
CI/CD automation
```

Features should be added only when they strengthen this core workflow.

---

# What This Project Demonstrates

This project demonstrates practical engineering in:

- RAG systems
- LLM evaluation
- claim-level verification
- hallucination/faithfulness analysis
- answerability evaluation
- regression testing
- deployment gating
- LLMOps
- evaluation artifact management
- model/provider configuration
- Next.js frontend development
- FastAPI backend development
- API-based architecture
- deployment engineering
- AI safety testing

The central engineering principle is:

> **RAG quality should be treated as a release criterion, not just a demo metric.**

---

# Future User Experience

The intended final experience is:

```text
User opens the web application
            ↓
Creates or uploads an evaluation
            ↓
Platform evaluates the RAG system
            ↓
Dashboard shows:
    • Faithfulness
    • Coverage
    • Final score
    • Claims
    • Evidence
    • Retrieved context
    • Regression status
            ↓
User inspects failures
            ↓
Deployment Gate:
    PROMOTE / BLOCK
```

The platform should make the evaluation process understandable to both engineers and teams operating RAG applications.

---

# Author

**Sahib Taj Singh**

GitHub:

https://github.com/SahibTaj

Portfolio:

https://sahibtaj.github.io/portfolio/

---

# License

Add an appropriate open-source license before presenting the deployed service as an open-source project.
