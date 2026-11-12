# Workflow

How design, tasks, and status move between Greg, Claude, and Viktor. The repo is the shared record, so nothing needs to be pasted or attached in chat.

## Who writes what

| File | Owner | Purpose |
| --- | --- | --- |
| `GAME_DESIGN.md` | Claude | Source of truth for design. The first line states the version. |
| `docs/tasks/NNN-name.md` | Claude | One brief per job, numbered in the order to do them. |
| `docs/status.md` | Viktor | Current state of the work. Newest entry at the top. |
| `docs/pr-media/` | Viktor | Screenshots and contact sheets referenced by status entries and PRs. |

Greg decides direction and playtests. He tells Viktor to pull and continue, and tells Claude to check the repo.

## For Viktor

1. Pull `main` before starting anything. Re-read `GAME_DESIGN.md` if its version line changed.
2. Do the lowest-numbered task in `docs/tasks/` whose status is `open`. Do not skip ahead.
3. When you start a task, set its `Status:` line to `in progress`. When it is merged and deployed, set it to `done`.
4. After each deploy, and whenever you are blocked, add an entry to the top of `docs/status.md`: date and time, task number, what shipped (PR, commit, URL), what you verified, what you did not verify, and any question for Greg or Claude.
5. If a task conflicts with `GAME_DESIGN.md`, stop, write the conflict in `docs/status.md`, and tell Greg.
6. Do not edit `GAME_DESIGN.md` or the task briefs beyond the `Status:` line. Put disagreements and suggestions in `docs/status.md`.

## Who looks first

Claude reviews every visual change from the screenshots before Greg looks at it. Greg is told a build is ready to view only when it clears the bar set in its task brief. Until then the build is deployed but described in `docs/status.md` as not ready for first look.

## For Claude

1. Pull `main` and read `docs/status.md` before answering questions about the build.
2. Review merged work against the task brief and the design doc: run the tests, read the screenshots.
3. Commit design changes and new task briefs directly to `main`. Put review findings in the next task brief, or in a new one.
