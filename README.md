# smartspend-ai

AI-Powered Personal Finance Management System

SmartSpend AI helps users track spending, manage budgets, and get AI-driven insights into their financial habits. The project is split into a React/TypeScript frontend and a FastAPI backend, with plans to layer in AI-assisted categorization and financial recommendations as the app develops.

## Tech Stack

**Frontend:** React, Vite, TypeScript, Tailwind CSS, Axios, Recharts

**Backend:** FastAPI, SQLAlchemy, Pydantic, JWT auth

**Database:** SQLite for development

## Running Tests

The backend has a pytest suite covering auth, transaction CRUD (including cross-user access protection), and dashboard analytics. It runs against an isolated in-memory database, so it's safe to run anytime — it never touches your local `smartspend.db`.

```bash
cd backend
source venv/Scripts/activate  # or venv/bin/activate on macOS/Linux
pytest
```
