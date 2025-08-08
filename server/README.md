# CVRB Server

This directory contains the **server-side** code for the CVRB project.  
It exposes a thin CLI oriented around three distinct roles:

1. **Creator** – generate brand-new worlds and persist them in Postgres.
2. **Solver**  – let one or more LLMs attempt to solve an existing world.
3. **Validator** – run a consistency / ground-truth check over a world and produce a report.

The three entry points live in `src/scripts/` and are meant to be invoked **directly with Node**.  
They share the same environment file and database connection.

---

## Current Results

| Rank | Model | Results | % Correct | Beats Next | 95% CI |
|------|-------|---------|-----------|------------|--------|
| 1 | openai/o3 | 73 / 100 | 73.0% | 98.4% | 73 ± 9 pp (64–81%) |
| 2 | openai/o4-mini-high | 63 / 100 | 63.0% | 79.4% | 63 ± 9 pp (53–72%) |
| 3 | openai/gpt-5 | 59 / 100 | 59.0% | 79.1% | 59 ± 9 pp (49–68%) |
| 4 | google/gemini-2.5-pro | 55 / 100 | 55.0% | 96.5% | 55 ± 10 pp (45–64%) |
| 5 | anthropic/claude-sonnet-4 | 46 / 100 | 46.0% | 65.6% | 46 ± 10 pp (37–56%) |
| 6 | deepseek/deepseek-r1-0528 | 44 / 100 | 44.0% | 84.5% | 44 ± 10 pp (35–54%) |
| 7 | qwen/qwen3-235b-a22b-thinking-2507 | 39 / 100 | 39.0% | 94.2% | 39 ± 9 pp (30–49%) |
| 8 | anthropic/claude-opus-4 | 15 / 50 | 30.0% | 81.8% | 30 ± 12 pp (19–44%) |
| 9 | x-ai/grok-4 | 25 / 100 | 25.0% | 59.2% | 25 ± 8 pp (18–34%) |
| 10 | google/gemini-2.5-flash | 24 / 100 | 24.0% | 95.9% | 24 ± 8 pp (17–33%) |
| 11 | openai/gpt-4o | 17 / 100 | 17.0% | - | 17 ± 7 pp (11–26%) |

---

## Prerequisites

1. **Node.js** ≥ 20
2. **PostgreSQL**  database
3. An **OpenRouter API key** – sign up at https://openrouter.ai and copy your key.
* (Some models like o3 may require additional setup on openrouter)

Create a `.env` file in the **server root** (`server/.env`) and set **at minimum** the variables below:

```env
# OpenRouter – used by all LLM interactions
OPENROUTER_API_KEY=sk-live-XXXXXXXXXXXXXXXXXXXXXXXX

# Postgres connection string (adjust user / pass / host / port / db)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cvrb

# Shared secret that grants admin privileges to API callers.
# Must mirror VITE_ADMIN_API_KEY in the client when VITE_ROLE=admin.
ADMIN_API_KEY=02d278fe-1c15-4630-a0a4-1a720b5f6adb
```

Remember to set the same key inside `client/.env` as `VITE_ADMIN_API_KEY`.

If you changed the database name or port, make sure to update the connection string in the `.env` file.

> The scripts automatically pick the `.env` up – no extra flags needed.

---

## Installing dependencies

```bash
cd server
npm install
```

> All scripts are plain Node programs, **no server process** needs to be running.

---

## 0. Benchmark cycle – `create_bench.js`

Run the entire benchmark workflow (create → solve → promote):

```bash
node src/cvrb_scripts/create_bench.js
```

The script performs:
1. World creation with validation.
2. Solving with multiple models.
3. Promotion of top worlds to benchmark set 1.

---

## 1. Creator role – `create_worlds.js`

Generate one or more fresh worlds using an LLM *creator* model and immediately validate them:

```bash
# Default (creates 2 worlds)
node src/cvrb_scripts/create_worlds.js
```

The script contains a `WORLDS_COUNT` constant that you can tweak, or simply duplicate the call.

Upon completion the new worlds are stored in the `worlds` table and can be solved later.

---

## 2. Solver role – `solve_world.js`

Ask one or more *solver* models to tackle an existing world. Pass the world id(s) you wish to solve as CLI arguments:

```bash
# Solve a single CVRB (id 47) with the default solver model(s)
node src/cvrb_scripts/solve_world.js 47

# Solve three different worlds
node src/cvrb_scripts/solve_world.js 12 34 56
```

If no ids are supplied the script falls back to the `DEFAULT_WORLD_IDS` array hard-coded near the top of the file.

Results are written to the `solutions` table with the score for each model.

---

## 3. Validator role – `validate_worlds.js`

Primarily intended for debugging, since each world is automatically validated during its creation.

Run a consistency check over previously created worlds and generate simple Markdown reports under `server/src/world/validate`:

```bash
# Uses the list inside the script (CVRB names)
node src/cvrb_scripts/validate_worlds.js
```

Edit the `worldsToValidate` array near the top of the file to specify which worlds to validate.

The script prints a per-world summary and stores a detailed report for later inspection.

---

## Database migrations

If you change the schema, add a migration under `src/migrations/` and run:

```bash
npm run migrate
```

(This project uses Sequelize migrations – see `server/package.json` for the exact command.)

---

Happy hacking! 🎉

