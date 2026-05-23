# FinBuddy

FinBuddy is a personal finance tracker with a React frontend, a FastAPI backend, and MongoDB for persistence. The current backend targets Python 3.13.13, and the first version supports:

- user authentication
- bank account tracking with dated balance snapshots
- investment tracking for mutual funds, FDs, stocks, and similar assets
- PDF/Excel account statement imports for categorical expense reports
- dashboard summaries and trend charts for weekly and monthly portfolio movement

## Stack

- Frontend: React + TypeScript + Vite + Recharts
- Backend: FastAPI + PyMongo Async + PyJWT + pwdlib
- Database: MongoDB Atlas

## Project structure

```text
.
├── backend
│   ├── app
│   ├── requirements.txt
│   └── .env.example
├── frontend
│   ├── src
│   ├── package.json
│   └── .env.example
└── README.md
```

## Backend setup

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Set `MONGODB_URI`, `MONGODB_DATABASE`, and `JWT_SECRET_KEY` in `backend/.env`.
Set `BEDROCK_API_KEY`, `BEDROCK_REGION`, and `BEDROCK_MODEL` to enable Amazon Bedrock expense extraction; without a configured LLM key, FinBuddy uses a local heuristic parser for development.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env` if your API is not running at `http://localhost:8000/api`.

## Initial API surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/accounts`
- `POST /api/accounts`
- `POST /api/accounts/{account_id}/entries`
- `GET /api/investments`
- `POST /api/investments`
- `POST /api/investments/{investment_id}/entries`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/trends?period=weekly|monthly`
- `POST /api/expenses/import`
- `GET /api/expenses/reports`

## Next enhancements

- category tags and notes filters
- liabilities and net worth minus debt
- edit and delete flows
- richer dashboard comparisons and allocations
- CSV import/export
