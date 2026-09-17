# Regression-Safe RAG Deployment Guardrails

Large Language Model (LLM) systems built with Retrieval-Augmented Generation (RAG) often regress silently after prompt, model, or data changes.
Hallucinations and over-abstention (“I don’t know”) frequently enter production without obvious signals.
This project implements a regression-safe evaluation and deployment gating framework for RAG systems.
It enforces faithfulness as a hard safety invariant and coverage as a soft optimization signal.
Deployments are automatically blocked when regressions are detected.

## Overview
Evaluation of RAG-based LLM systems is commonly limited to single-run correctness.
As prompts, models, or retrieval data evolve, systems can regress over time without detection.

This project introduces a **regression-safe evaluation framework** that continuously compares new runs against a known-good baseline.
It enforces **truthfulness as a hard invariant** and **answer coverage as a soft optimization signal**, ensuring both safety and usefulness.

---
## What This Project Is (in one sentence)
A CI/CD-style evaluation and deployment gating system that prevents hallucinations and over-abstention in RAG-based LLM systems.

---

## Core Ideas

### 1. Faithfulness is Non-Negotiable (Hard Gate)
Faithfulness measures whether the model’s claims are **supported by the retrieved context**.

- Claims are extracted from the model’s answer
- Each claim is verified against retrieved documents
- Any faithfulness regression **blocks deployment**

> A model that lies is unsafe — even once.

---

### 2. Faithfulness Alone Is Not Enough
A model can avoid hallucinations by always replying:
> “I don’t know”

This behavior is technically faithful, but **useless in practice**.

---

### 3. Coverage Closes the Abstention Loophole (Soft Signal)
Coverage measures whether the model **answered when the context was sufficient**.

- If context is answerable and the model abstains → penalized
- If context is not answerable → abstention is allowed

Coverage is treated as a **soft optimization signal**, not a safety gate.

---

## Evaluation Metrics

| Metric        | Purpose                              | Type       |
|--------------|--------------------------------------|-----------|
| Faithfulness | Detect hallucinations                 | Hard gate |
| Coverage     | Penalize over-abstention              | Soft signal |
| Final Score  | Track overall quality trends          | Informational |

---

## Regression Blocking Logic

The system follows CI/CD-style semantics:

1. Run evaluation on a fixed question set
2. Save results as a **candidate run**
3. Compare candidate against a **baseline**
4. Apply gating rules:
   - Any faithfulness drop → ❌ BLOCK
   - Coverage drops → ⚠️ WARN
   - Large final score drop → ❌ BLOCK
5. Promote candidate to baseline only if it passes

---

## Architecture
```bash
Question
↓
Retriever
↓
LLM Answer
↓
Claim Extraction
↓
Faithfulness Check
↓
Coverage Check
↓
Final Score
↓
Regression Gate (ALLOW / BLOCK)
```
---

## Model Strategy

- **Answer generation**: Large model (e.g. `llama-3.3-70b-versatile`)
- **Evaluation (claims, faithfulness, coverage)**: Smaller model (e.g. `llama-3.1-8b-instant`)

This split reduces evaluation cost by **10–20×** while preserving reliability.

---

## Project Structure
```bash
regression-safe-rag-eval/
├── app.py
├── config.py
├── data/
├── rag/
├── evaluation/
├── observability/
├── runs/
├── baselines/
└── security/
```
---

## How to Run

1. Install dependencies
```bash
pip install -r requirements.txt
```
2. Set environment variables

```bash
export GROQ_API_KEY=your_key_here
```
3. Run evaluation

```bash
python app.py
```
## The system will:

- Save the candidate run

- Compare it to the baseline

- Block or promote automatically
