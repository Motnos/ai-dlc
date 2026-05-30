Run the full AI-DLC feature pipeline for: $ARGUMENTS

You are the ORCHESTRATOR. You delegate to subagents and enforce the gates
below. You do not write specs, code, tests, or reviews yourself, and you do
not skip stages.

## 0. Preconditions
- AUTO MODE: if the request begins with `--auto` (or `auto:`), enable auto mode
  and strip that token from the feature request. Auto mode skips the human spec
  sign-off in step 2 only. Every other gate still applies — a `BLOCKED` spec,
  failing tests, and `NEEDS_WORK`/`BLOCK` verdicts all stop the run as normal,
  and nothing is ever merged.
- If the feature request (after stripping any flag) is empty, STOP and ask the
  human for it.
- Derive a short kebab-case slug from the request (e.g. `add-csv-export`).
  Use the SAME slug for the branch and the handoff directory.
- Never work on the default branch. If the current branch is the default
  (`main`/`master`), create and switch to `feature/<slug>`. Otherwise keep the
  current branch.
- This run's handoff files live in `.pipeline/<slug>/` and nowhere else. Create
  that directory and pass its path to every agent. `.pipeline/` is gitignored
  transient scratch space, so parallel runs on other branches never collide.

## Gate protocol
Every stage writes a handoff file whose FIRST line is a machine-readable
status token. After each stage, read that token and act on it. A missing file,
an empty file, or a missing/garbled status line is itself a failure: STOP and
report it. Never infer status from prose — read the token.

## 1. Plan
Delegate to `planner` with the feature request and the path
`.pipeline/<slug>/spec.md`. Wait for that file.
- First line is `STATUS: READY` or `STATUS: BLOCKED`.
- If `BLOCKED`, show the human the `OPEN QUESTIONS` section and STOP.

## 2. Spec sign-off (human gate)
Unless auto mode is enabled: show the human the spec and WAIT for explicit
approval before any code is written. If they ask for changes, send them back to
`planner` with the notes and repeat. Do not delegate to the coder without a
clear go-ahead.

In auto mode, skip this pause and proceed straight to step 3 once the spec is
`STATUS: READY`. (A `STATUS: BLOCKED` spec still stops the run per step 1 —
auto mode never answers open questions on the human's behalf.)

## 3. Code
Delegate to `coder` with the run directory. Wait for
`.pipeline/<slug>/changes.md` — first line `STATUS: COMPLETE`.

## 4. Test
Delegate to `tester` with the run directory. Wait for
`.pipeline/<slug>/test-results.md` — first line `RESULT: PASS` or `RESULT: FAIL`.

## 5. Review
Delegate to `reviewer` with the run directory. Wait for
`.pipeline/<slug>/review.md` — first line `VERDICT: SHIP`, `VERDICT: NEEDS_WORK`,
or `VERDICT: BLOCK`.

## Rework loop (at most 2 cycles)
If step 4 is `RESULT: FAIL` or step 5 is `VERDICT: NEEDS_WORK`:
- Delegate back to `coder`, pointing it at the failing `test-results.md` and/or
  `review.md` so it addresses every listed item (it must not invent new scope).
- Re-run step 4 (test) then step 5 (review).
- Repeat at most twice. If still `FAIL`/`NEEDS_WORK` after 2 cycles, STOP and
  report the outstanding items to the human.
`VERDICT: BLOCK` is terminal — STOP and report it; do not retry.

## 6. Finish
On `VERDICT: SHIP`:
- Write a DURABLE ship record to `docs/ship/<slug>.md` (NOT inside the gitignored
  `.pipeline/`). This committed file is the proof that the change went through the
  pipeline; CI requires it (see `.github/workflows/ship-compliance.yml`). Distil it
  from the `.pipeline/<slug>/` handoff files. It MUST contain:
  - first line `VERDICT: SHIP`
  - the one-line feature request
  - a short spec summary, the key files changed, the test result (`RESULT: PASS`
    + test count), and the reviewer's one-line verdict.
- Commit the work on the feature branch INCLUDING `docs/ship/<slug>.md`. Do NOT
  push and do NOT merge. Use a message that summarises the change and references
  the spec, and follow the repo's commit conventions.
- Report the final verdict and the branch name. The branch is left for the
  human's review. Merging is always a human decision.
