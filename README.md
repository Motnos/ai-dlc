# AI Development Lifecycle (AI-DLC) Workflow

A drop-in `.claude/` scaffold that encodes a consistent, reviewable, four-stage AI development pipeline for any software project.

## What this is

A generic, reusable `.claude/` directory containing one slash command (`/ship`), four subagent definitions, and a `conventions.md` your team fills in. Drop it into any repo and you get a structured pipeline — plan, code, test, review — where each stage is a separate AI agent with a defined role, a fixed toolset, and a file-based handoff to the next stage. Each handoff file starts with a machine-readable status token so the orchestrator gates on a signal, not on prose. Nothing merges unattended; a human reviews and decides.

## Why it exists

Multiple developers building a product with AI tend to get inconsistent results because quality depends on who writes the best prompt. This repo encodes the workflow, the guardrails, and the quality bar into the agents themselves, with shared house rules in `conventions.md`. Every feature request goes through the same pipeline regardless of who invokes it, every run is isolated to its own branch, and every decision is visible in the run's handoff files.

## The pipeline at a glance

A feature request enters at `/ship` on its own feature branch. It moves through four stages, each producing a status-tagged file the next stage reads. The pipeline pauses for human spec sign-off, stops on ambiguity or failure, and can loop a bounded number of times to fix issues before stopping for a human.

```
/ship <feature request>
      |
      v
  [planner]  -->  spec.md   (STATUS: READY | BLOCKED)
                     |
          BLOCKED? --> STOP, show open questions
                     |
                     v
            human spec sign-off   (skipped in --auto mode)
                     |
                     v
    [coder]  -->  changes.md   (STATUS: COMPLETE)
                     |
                     v
   [tester]  -->  test-results.md   (RESULT: PASS | FAIL)
                     |
   [reviewer] --> review.md   (VERDICT: SHIP | NEEDS_WORK | BLOCK)
                     |
        FAIL / NEEDS_WORK? --> back to coder (max 2 cycles), else STOP
        BLOCK?            --> STOP (terminal)
                     |
                     v
        commit on feature branch -> human review
                 (no push, no merge)
```

All handoff files for a run live in `.pipeline/<slug>/`, where `<slug>` is derived from the request and shared with the branch name, so concurrent runs never collide.

## The four agents

| Stage | Agent | Model | Tools | Reads | Writes | Status token |
|-------|-------|-------|-------|-------|--------|--------------|
| 1 | planner | opus | Read, Grep, Glob, Write | request, `conventions.md`, codebase | `spec.md` | `STATUS: READY \| BLOCKED` |
| 2 | coder | sonnet | Read, Write, Edit, Grep, Glob, Bash | `spec.md` (+ prior `test-results.md`/`review.md` on rework), `conventions.md` | code + `changes.md` | `STATUS: COMPLETE` |
| 3 | tester | sonnet | Read, Write, Edit, Grep, Glob, Bash | `changes.md`, `spec.md`, changed files | tests + `test-results.md` | `RESULT: PASS \| FAIL` |
| 4 | reviewer | opus | Read, Grep, Glob, Bash, Write | spec, changes, test-results, `git status`/`git diff` | `review.md` | `VERDICT: SHIP \| NEEDS_WORK \| BLOCK` |

### Planner

Reads `conventions.md` and the relevant parts of the codebase, then writes `spec.md`: files to create or modify, required interfaces/signatures, edge cases, which existing patterns to copy, and acceptance criteria the tester can verify. The first line is `STATUS: READY` or `STATUS: BLOCKED`; blocking ambiguity is listed under `## OPEN QUESTIONS`. The planner does not write code and invents no requirements.

### Coder

Reads `spec.md` and implements exactly what it describes, matching `conventions.md` and the repo's style. On a rework cycle it reads the failing `test-results.md` and/or `review.md` and addresses every listed item — without expanding scope. Runs the project's formatter/linter/type-checker on its own changes. Writes `changes.md` (first line `STATUS: COMPLETE`) listing every file it touched.

### Tester

Reads `changes.md`, `spec.md`, and the changed files, then writes and runs tests for the happy path, every named edge case and acceptance criterion, and at least one failure case. Matches the repo's framework, or bootstraps the one named in `conventions.md` for greenfield repos. It creates and edits **test files only** — it never patches source to make a test pass. Writes `test-results.md` with first line `RESULT: PASS` or `RESULT: FAIL`.

### Reviewer

Reads the spec, changes, and test results, then inspects the real diff — including new files (it runs `git status` and stages untracked files so `git diff` shows them). Cross-checks the actual changes against the coder's reported file list. Assesses correctness, security, and whether tests are meaningful. Writes `review.md` with first line `VERDICT: SHIP`, `VERDICT: NEEDS_WORK`, or `VERDICT: BLOCK`. Its only permitted write is `review.md`; it must not modify source, tests, or config.

## Guardrails

- **Status tokens, not vibes.** Every gate reads a machine-checkable first line (`STATUS`/`RESULT`/`VERDICT`). A missing, empty, or malformed handoff file is itself a failure.
- **Human spec sign-off.** By default the run pauses after planning so a human approves the spec before any code is written — the cheapest place to catch a wrong direction. `--auto` skips this pause (see below); a `BLOCKED` spec stops the run regardless.
- **OPEN QUESTIONS stop the line.** If the planner cannot resolve ambiguity, it marks the spec `BLOCKED` and the pipeline halts.
- **Bounded rework, then a human.** A failing test or a `NEEDS_WORK` verdict sends the findings back to the coder and re-runs, at most twice. If it still isn't right, the run stops for a human. `BLOCK` is terminal and never retries.
- **Tester never patches source.** A failing test pauses the pipeline for rework; the tester only writes test files.
- **Reviewer can BLOCK on green tests.** Passing tests are not sufficient — if the code is wrong, the reviewer issues `NEEDS_WORK` or `BLOCK` with `file:line` specifics. The reviewer's only write is its verdict file.
- **Branch isolation, no auto-merge.** Work happens on a `feature/<slug>` branch in its own `.pipeline/<slug>/` directory. On `SHIP` the pipeline commits to that branch (no push, no merge) and leaves it for a human to review and merge.
- **No scope creep.** The coder implements only the spec and the review findings.

> The reviewer and tester boundaries are enforced by instruction, not by the tool sandbox — their tools technically permit more, but the agent prompts forbid it. Treat the prompts as the contract.

## Using `/ship`

Invoke the command with a plain-language feature request:

```
/ship <feature request>
```

Example:

```
/ship add pagination to the /posts endpoint, 20 items per page
```

The orchestrator derives a slug, switches to a `feature/<slug>` branch, and runs the four stages. It pauses or stops at these points:

1. **Spec sign-off** — after planning, it shows you the spec and waits for approval before coding (unless `--auto`).
2. **OPEN QUESTIONS in the spec** — the planner marked it `BLOCKED`; answer and re-invoke.
3. **Failing tests / `NEEDS_WORK`** — fixed automatically for up to two cycles, then stopped for you if unresolved.

On `SHIP`, `/ship` commits the work to the feature branch and reports the verdict. The branch is left for your review — you decide whether to merge.

### Auto mode

Prefix the request with `--auto` (or `auto:`) to skip the spec sign-off pause for low-risk or batch work:

```
/ship --auto add a healthcheck endpoint at /healthz
```

Auto mode bypasses **only** the discretionary spec pause. Every hard gate still applies: a `BLOCKED` spec, failing tests after the rework cycles, and `NEEDS_WORK`/`BLOCK` verdicts all stop the run, and nothing is ever merged.

## Adopting it in your project

Copy the `.claude/` directory into the root of the target repo and fill in `conventions.md`:

```
cp -r .claude/ /path/to/your/repo/
echo ".pipeline/" >> /path/to/your/repo/.gitignore
```

Then edit `.claude/conventions.md` with your stack, test framework, lint/type-check commands, code-style exemplars, and security rules. The agents fall back to inferring from the codebase when a section is blank, but filling it in is the highest-leverage step for consistency across developers. The `.pipeline/` directory holds transient per-run handoff artifacts and should stay gitignored.

## Repository layout

```
.claude/
  commands/
    ship.md          # /ship slash command — orchestrates the four stages
  agents/
    planner.md       # Stage 1: spec writer (opus)
    coder.md         # Stage 2: implementation (sonnet)
    tester.md        # Stage 3: test writer and runner (sonnet)
    reviewer.md      # Stage 4: final review, writes verdict only (opus)
  conventions.md     # Shared house rules — fill this in per repo

.gitignore           # Ignores .pipeline/

.pipeline/           # Generated at runtime — not hand-authored, gitignored
  <slug>/            # One directory per run, named for the feature/branch
    spec.md          # planner   -> STATUS: READY | BLOCKED
    changes.md       # coder     -> STATUS: COMPLETE
    test-results.md  # tester    -> RESULT: PASS | FAIL
    review.md        # reviewer  -> VERDICT: SHIP | NEEDS_WORK | BLOCK
```
