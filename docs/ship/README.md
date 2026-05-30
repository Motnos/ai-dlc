# /ship records

Each `/ship` run that reaches `VERDICT: SHIP` commits one durable record here as
`docs/ship/<slug>.md`, where `<slug>` matches the feature branch and the run's
`.pipeline/<slug>/` handoff directory.

This directory is the **committed proof** that a change went through the AI-DLC
pipeline (plan → code → test → review). The transient handoff files under
`.pipeline/` are gitignored, so these records are what CI and human reviewers can
actually see in a pull request.

The `ship-process-compliance` GitHub Action
(`.github/workflows/ship-compliance.yml`) **fails any pull request that changes
product code** (e.g. `src/`, `server/`) **without adding or updating a record
here** whose first line is `VERDICT: SHIP`.

## Record format

The first line must be exactly `VERDICT: SHIP`. Then a short summary, e.g.:

```
VERDICT: SHIP

# Add CSV export (add-csv-export)

Request: add a CSV export button to the reports page
Spec:    new src/export/csv.ts + a button in ReportsToolbar; streams the
         current filtered rows; handles empty result + quoting/escaping.
Files:   src/export/csv.ts, src/components/ReportsToolbar.tsx
Tests:   RESULT: PASS (24 tests) — quoting, empty set, large export
Review:  SHIP — matches spec, edge cases covered, no perf concerns
Run:     2026-05-30
```

Keep it concise; it is a record, not a copy of the full spec. The authoritative
detail lives in the (transient) `.pipeline/<slug>/` files during the run.
