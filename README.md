# Code-Verified Reasoning Benchmark (CVRB)

CVRB is an experimental framework for generating, solving and validating reasoning tasks with large language models. It includes a Node.js server that creates benchmark "worlds" and a React client for browsing those worlds and solver results.

In summary: LLM creators generate mathematical worlds, LLM validators ensure each world is consistent, and LLM solvers attempt to solve the validated worlds.

For a comprehensive overview of CVRB's theory and methodology, see [CVRB_README.md](CVRB_README.md).  

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

## Prerequisites

- Node.js 18+
- PostgreSQL database
- [OpenRouter](https://openrouter.ai) API key

Create a `server/.env` file containing:

```env
OPENROUTER_API_KEY=your_openrouter_key
PG_DATABASE_URL=postgres://user:pass@host:5432/dbname

# Shared secret enabling admin-only API routes.
# Must be identical to VITE_ADMIN_API_KEY on the client when VITE_ROLE=admin.
ADMIN_API_KEY=02d278fe-1c15-4630-a0a4-1a720b5f6adb
```

For the **client** create a `client/.env` file with:

```env
# Front-end role: "user" hides creation / promotion controls,
# "admin" shows them and enables admin API calls
VITE_ROLE=admin

# Must match ADMIN_API_KEY on the server when using admin role
VITE_ADMIN_API_KEY=02d278fe-1c15-4630-a0a4-1a720b5f6adb
```

## Installation

### Server (backend)

```bash
cd CVRB/server
npm run setup    # installs deps, creates DB, builds tables, loads current Bench data
npm run dev      # run the server 
```

If you prefer manual control:

```bash
npm install              # install backend dependencies only
npm run create-db        # create PostgreSQL database (needs PG_DATABASE_URL in .env)
npm run build-db         # create / update tables
npm run populate-db      # populate tables from dumps
```

### Client (frontend)

```bash
cd CVRB/client
npm install
npm run dev
```

## Creating a world and running solvers

Scripts for generating, solving **and benchmarking** worlds live in `server/src/cvrb_scripts`:

## 0. Benchmark cycle – `create_bench.js`

Run the full benchmark cycle (create → solve → promote) with a single command:

```bash
node src/cvrb_scripts/create_bench.js
```

The script will:
1. Create and validate a batch of worlds.
2. Solve all valid worlds with a curated list of solver models.
3. Promote the top-scoring worlds to benchmark set **1**.

## 1. Creator role – `create_worlds.js`

Generate one or more fresh worlds using an LLM *creator* model and immediately validate them:

```bash
# Default (creates 2 worlds)
node src/cvrb_scripts/create_worlds.js
```

To adjust how the script runs, modify these variables at the top of `create_worlds.js`:

```
const WORLDS_COUNT = 2; // Number of worlds to generate
const CREATOR_MODEL = ModelsConfig.GPT_4o; // Creator model to use
const VALIDATOR_MODELS = [ModelsConfig.O3]; // Validator model(s) to use
```

Upon completion the new worlds are stored in the `worlds` table and can be solved later.
Worlds can be inspected via the front end appliaction.
---

## 2. Solver role – `solve_world.js`

Ask one or more *solver* models to tackle an existing world. Pass the world id(s) you wish to solve as CLI arguments:

```bash
# Solve a single CVRB (id 47) with the default solver model(s)
node src/cvrb_scripts/solve_world.js 47

# Solve three different worlds
node src/cvrb_scripts/solve_world.js 12 34 56
```

Or edit the parmas near the top of script


If no ids are supplied the script falls back to the `DEFAULT_WORLD_IDS` array hard-coded near the top of the file.

Results are written to the `solutions` table with the score for each model.

---

## Adding a new model

Models available through OpenRouter are defined in `server/src/openrouter/models.js`. Add a new entry to `ModelsConfig` with the model's API identifier:

```js
export const ModelsConfig = {
  MY_MODEL: {
    apiName: 'provider/model-id'
  }
}
```

## Project structure

- `server/` – Node.js backend for world creation, solving and validation
- `client/` – React interface for browsing worlds and solvers