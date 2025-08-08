# CVRB Benchmark Results

## Solver Accuracy Table

| Rank | Model | Score | Accuracy |
|------|-------|-------|----------|
| 1 | openai/o3 | 16 / 25 | 64.0% |
| 2 | openai/o4-mini-high | 13 / 25 | 52.0% |
| 3 | deepseek/deepseek-r1-0528 | 8 / 25 | 32.0% |
| 4 | google/gemini-2.5-pro | 8 / 25 | 32.0% |
| 5 | qwen/qwen3-235b-a22b-thinking-2507 | 7 / 25 | 28.0% |
| 6 | x-ai/grok-4 | 6 / 25 | 24.0% |
| 7 | anthropic/claude-opus-4 | 5 / 25 | 20.0% |
| 8 | anthropic/claude-sonnet-4 | 5 / 25 | 20.0% |
| 9 | google/gemini-2.5-flash | 4 / 25 | 16.0% |

---

## World Creation Capability

### Models that **successfully** created and validated worlds

- openai/o3
- anthropic/claude-opus-4
- anthropic/claude-sonnet-4
- google/gemini-2.5-flash
- google/gemini-2.5-pro

### Models that **failed** to create a valid world

- deepseek/deepseek-r1-0528
- openai/gpt-4o
- openai/o4-mini-high
- qwen/qwen3-235b-a22b-thinking-2507
- x-ai/grok-4

---

## Observations & Commentary

* Only reasoning-focused models have been able to generate internally consistent worlds, and they are likewise the only models capable of solving those same worlds. All non-reasoning models tested so far scored **0** as solvers and failed to create a single valid world and hence were omitted from this bench.
* **openai/o3** performs as expected, firmly at the top of the leaderboard.
* **openai/o4-mini-high** lands a surprisingly strong second place given its reduced context window and pricing.
* **anthropic/claude-opus-4** ("max-effort") performs exactly on par with **anthropic/claude-sonnet-4** ("max-effort"); both remain relatively weak on this benchmark.
* **deepseek/deepseek-r1-0528** is a pleasant surprise, outperforming several much larger models.
* **x-ai/grok-4** struggled the most: it rarely returned a response when asked to create worlds (API time-outs) and failed most solver queries for the same reason.
