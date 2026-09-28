# Regression-Safe RAG Deployment Guardrails

A local LLMOps platform for evaluating Retrieval-Augmented Generation (RAG) systems, detecting quality regressions, comparing candidate versions against an accepted baseline, and supporting safer deployment decisions.

> **Status:** V1 stabilization prototype for local development, evaluation, and demonstration.

## Overview

Changes to a RAG system—such as retrieval configuration, chunking, prompts, models, or generation settings—can introduce unsupported answers or reduce answer quality. This project provides an evaluation workflow that runs a fixed question set, measures quality signals, compares candidate results with a baseline, and calculates a deployment gate.

The platform focuses on:

- Evaluation run management
- Faithfulness and coverage measurement
- Claim extraction and evidence inspection
- Baseline-versus-candidate comparison
- Regression failures and warnings
- Safety-aware answer handling and abstention
- Deployment gate decisions
- Dashboard-based evaluation visibility

## Screenshots
> Screenshots show the local prototype at different evaluation points and may contain different historical run counts.


### Dashboard
<img width="1827" height="846" alt="image" src="https://github.com/user-attachments/assets/473b73bb-89cb-4bee-9b2f-7a3b067fe26e" />

<img width="1807" height="832" alt="image" src="https://github.com/user-attachments/assets/d2b33074-5d96-4048-bcad-c0ecd598c3ef" />


<!-- Add dashboard screenshot here -->
<!-- Suggested path: docs/images/dashboard.png -->

### Evaluation Runs
<img width="1822" height="841" alt="image" src="https://github.com/user-attachments/assets/660e7bea-f6d0-43e6-be7e-11c90dc4c067" />


<!-- Add Evaluation Runs screenshot here -->
<!-- Suggested path: docs/images/evaluation-runs.png -->

### Deployment Gate
<img width="1827" height="867" alt="image" src="https://github.com/user-attachments/assets/7565c33a-bf49-4d8c-99f2-e24de5b8110f" />

<img width="1812" height="847" alt="image" src="https://github.com/user-attachments/assets/d18d72c9-6e93-4d84-b5d8-a11d587056f6" />


<!-- Add Deployment Gate screenshot here -->
<!-- Suggested path: docs/images/deployment-gate.png -->

### Baseline Comparison
<img width="1816" height="836" alt="image" src="https://github.com/user-attachments/assets/7a01e61e-c9d2-4287-8727-6c54d2dd629c" />

<img width="1790" height="832" alt="image" src="https://github.com/user-attachments/assets/4de7b817-1386-4c96-8b90-d6056fe94a9d" />


<!-- Add Baseline Comparison screenshot here -->
<!-- Suggested path: docs/images/baseline-comparison.png -->

### Analytics
<img width="1792" height="848" alt="image" src="https://github.com/user-attachments/assets/c85c338f-415f-458b-baa6-2b115d1cd913" />

<img width="1795" height="826" alt="image" src="https://github.com/user-attachments/assets/4d42c537-3e19-418b-a088-f7a1654df898" />


<!-- Add Analytics screenshot here -->
<!-- Suggested path: docs/images/analytics.png -->


## Evaluation & Configuration Experiments

The platform was evaluated across multiple RAG configurations to measure the
effect of chunking and retrieval parameters on answer quality.

| Chunk Size | Overlap | Top-K | Faithfulness | Coverage | Final Score |
|---:|---:|---:|---:|---:|---:|
| 1000 | 200 | 4 | 84.2% | 82.1% | 83.6% |
| 500 | 100 | 4 | 76.2% | 78.6% | 76.9% |
| 500 | 100 | 6 | 81.8% | 85.7% | 83.0% |

These experiments demonstrate that retrieval configuration changes can
materially affect RAG evaluation results. The deployment gate remains
independent of these experiments and compares candidate runs against the
accepted baseline.

## Evaluation Results

| Configuration | Questions | Faithfulness | Coverage | Final Score |
|---------------|-----------|--------------|----------|-------------|
| Chunk 1000 / Overlap 200 / Top-K 4 | 28 | 84.2% | 82.1% | 83.6% |
| Chunk 500 / Overlap 100 / Top-K 4  | 28 | 76.2% | 78.6% | 76.9% |
| Chunk 500 / Overlap 100 / Top-K 6  | 28 | 81.8% | 85.7% | 83.0% |

## Key Features

### 1. Evaluation Runs

- Start candidate evaluation runs through the application.
- Execute a predefined evaluation dataset.
- Track progress and completion status.
- Store results for later inspection.
- Review question-level evaluation details.

### 2. RAG Quality Evaluation

The evaluation workflow records information such as:

- Generated answer
- Extracted claims
- Claim support and evidence
- Faithfulness score
- Coverage score
- Final score
- Abstention and safety-related information
- Evaluation or extraction errors

### 3. Regression Detection

Candidate results are compared with the accepted baseline to identify:

- Faithfulness degradation
- Coverage degradation
- Final-score drops
- Question-level failures
- Warning-level regressions

### 4. Deployment Gate

The deployment gate summarizes the result of configured quality checks. Possible states include:

- `approved`
- `approved_with_warnings`
- `blocked`
- `failed`
- `development`

A blocked result means that the candidate did not satisfy the configured promotion checks for that evaluation run.

## Architecture

```text
                 Next.js Frontend
                        |
                    REST API
                        |
                 FastAPI Backend
                        |
              Evaluation Service
          _________|___________
         |         |           |
      RAG       Evaluation   Run/Result
    Pipeline    Modules      Persistence
         |         |           |
      Retrieval  Claims     Baseline
      Generation Faithfulness Candidate
      Safety     Coverage    Results
                        |
                 Deployment Gate
```

## Evaluation Workflow

```text
Start evaluation run
        |
Load evaluation questions
        |
Run the RAG pipeline
        |
Generate answer from retrieved context
        |
Extract claims and evaluate support
        |
Calculate faithfulness, coverage, and final score
        |
Compare candidate against baseline
        |
Identify failures and warnings
        |
Calculate deployment gate
        |
Persist and display the result
```

## Technology Stack

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic schemas
- Background tasks
- JSON-based result persistence

### RAG and Evaluation

- Retrieval-Augmented Generation
- Claim extraction
- Faithfulness evaluation
- Coverage evaluation
- Regression comparison
- Safety and abstention handling

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React

### Development

- Git and GitHub
- PowerShell
- Python virtual environment
- REST API testing through PowerShell, browser, or Postman

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `backend/` | FastAPI backend and API orchestration |
| `evaluation/` | RAG evaluation and quality metrics |
| `rag/` | Retrieval and generation pipeline |
| `baselines/` | Baseline configuration and comparison |
| `runs/` | Evaluation run persistence |
| `frontend/` | Next.js dashboard |
| `observability/` | Evaluation/run observability |
| `security/` | Safety and guardrail-related modules |

```text
Regression-Safe-RAG-Guardrails-Evaluation-Platform/
|
|-- backend/
|   |-- main.py
|   |-- service.py
|   `-- schemas.py
|
|-- baselines/
|-- data/
|   `-- test_questions.json
|-- evaluation/
|   |-- claims.py
|   |-- coverage.py
|   `-- faithfulness.py
|-- frontend/
|   |-- app/
|   |   |-- analytics/
|   |   |-- baseline/
|   |   |-- gate/
|   |   |-- runs/
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   `-- lib/
|       |-- api.ts
|       `-- metrics.ts
|-- rag/
|   |-- generator.py
|   `-- pipeline.py
|-- runs/
|-- scripts/
`-- README.md
```

## Deployment Gate

| Check | Purpose |
|-------|---------|
| Faithfulness | Checks whether generated claims are supported by retrieved evidence |
| Coverage | Checks whether the response addresses the expected information |
| Baseline Comparison | Compares the candidate against the accepted baseline |
| Regression Detection | Identifies quality degradation |
| Safety Checks | Detects unsupported claims, insufficient context, and unanswerable questions |
| Deployment Gate | Produces the final deployment decision based on configured evaluation conditions |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check backend health |
| POST | `/runs` | Start a new evaluation run |
| GET | `/runs` | List evaluation runs |
| GET | `/runs/{run_id}` | Get evaluation run details |
| GET | `/runs/{run_id}/result` | Get evaluation result |
| GET | `/baseline` | Get the configured baseline |

### Health Check

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "service": "rag-guardrails-api"
}
```

### Start a Run

```http
POST /runs
```

Example response:

```json
{
  "run_id": "run_YYYYMMDD_HHMMSS_identifier",
  "status": "queued"
}
```

### Get Run Status

```http
GET /runs/{run_id}
```

Returns the run status, progress, question count, completed question count, and error information.

### Get Run Result

```http
GET /runs/{run_id}/result
```

Returns the completed evaluation result, including question-level results and the deployment gate.

### List Runs

```http
GET /runs
```

Returns saved evaluation run information for the dashboard.

## Local Setup

### Prerequisites

- Python 3.10 or newer
- Node.js and npm
- Git
- Required model-provider credentials

### Clone the Repository

```powershell
git clone https://github.com/SahibTaj/Regression-Safe-RAG-Deployment-Guardrails.git
cd Regression-Safe-RAG-Guardrails-Evaluation-Platform
```

### Create the Python Environment

```powershell
python -m venv venvl
.\venvl\Scripts\Activate.ps1
```

Install backend dependencies when a requirements file is available:

```powershell
pip install -r requirements.txt
```

### Configure Environment Variables

Configure the required model-provider credentials locally. For example:

```env
GROQ_API_KEY=your_api_key_here
```

Never commit API keys, tokens, or other secrets to GitHub.

## Run the Backend

From the project root:

```powershell
python -m uvicorn backend.main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

Test the health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

## Run the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

Configure the backend URL in `frontend/.env.local` when required:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Running an Evaluation

1. Start the FastAPI backend.
2. Start the Next.js frontend.
3. Open `http://localhost:3000`.
4. Start a candidate evaluation run.
5. Wait for the evaluation to finish.
6. Open the Evaluation Runs page.
7. Review the candidate scores and question-level results.
8. Inspect the Deployment Gate page.
9. Compare the candidate with the accepted baseline.

To inspect a run through PowerShell:

```powershell
$runId = "your_run_id"
Invoke-RestMethod "http://127.0.0.1:8000/runs/$runId"
Invoke-RestMethod "http://127.0.0.1:8000/runs/$runId/result"
```

## Safety and Abstention Handling

The RAG pipeline includes handling for situations where an answer should not be presented as supported. Examples include:

- Questions that cannot be answered from the available context
- Unsupported claims
- Missing document evidence
- Insufficient retrieval context
- Claim extraction or evaluator errors

The platform records relevant information so that questionable outputs can be inspected rather than automatically treated as successful answers.

## Example Use Case

A team changes a RAG application by modifying its retrieval configuration, chunking strategy, prompt, model, or generation settings.

The team can then:

1. Run the changed system against a fixed question dataset.
2. Compare the candidate results with the accepted baseline.
3. Identify quality regressions.
4. Review failures and warnings.
5. Inspect the deployment gate.
6. Decide whether the candidate is ready for further testing or promotion.

## Current Limitations

This version is a local development and demonstration prototype. Current limitations include:

- Evaluation quality depends on the selected evaluator model.
- Model-provider rate limits and temporary availability can affect results.
- JSON-based persistence is intended for a prototype and may not scale to production workloads.
- Authentication and role-based access control are not included in the current local workflow.
- Production-grade distributed workers and queue management are not implemented.
- Evaluation thresholds require additional calibration with a larger representative dataset.
- Evaluator failures need to be distinguished more clearly from genuine RAG regressions in future iterations.

## Future Improvements

- Database-backed run and metric storage
- Dataset versioning
- Authentication and role-based access control
- Experiment comparison across multiple candidates
- Additional evaluation metrics
- Human review workflows
- Evaluator retries and fallback models
- CI/CD integration with GitHub Actions
- Prompt and model version tracking
- Exportable evaluation reports
- Production monitoring and alerting
- Configurable deployment policies

## Development Branch

The current stabilization work is maintained on:

```text
v1-stabilization
```

## Author

**Sahib Taj Singh**

B.Tech — Artificial Intelligence and Machine Learning

- GitHub: https://github.com/SahibTaj
- Repository: https://github.com/SahibTaj/Regression-Safe-RAG-Deployment-Guardrails
