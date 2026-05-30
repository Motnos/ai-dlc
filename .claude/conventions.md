# Project conventions (AI-DLC)

This is the shared source of truth the pipeline agents consult so that work
stays consistent across developers and across runs. Fill it in for your repo
and keep it short and concrete. The planner, coder, and reviewer all read it.

Until you fill a section in, agents fall back to inferring from the codebase —
which is exactly the drift this file exists to prevent. Filling it in is the
single highest-leverage thing you can do for consistency.

## Languages & frameworks
<!-- e.g. TypeScript (Node 20), React 18. -->

## Test framework
<!-- e.g. Vitest. The tester uses this; it is REQUIRED for greenfield repos
     so the tester does not have to guess. -->

## Lint / format / type-check commands
<!-- The exact commands the coder and tester run, e.g.
     lint:       npm run lint
     format:     npm run format:check
     typecheck:  npm run typecheck -->

## Code style & patterns
<!-- Naming, file/directory layout, error-handling conventions, and the
     "copy from this file" exemplars the planner should point the coder at. -->

## Out of scope / do not touch
<!-- Generated files, vendored directories, anything agents must leave alone. -->

## Security rules
<!-- Secret handling, dependency policy, and anything the reviewer must enforce. -->
