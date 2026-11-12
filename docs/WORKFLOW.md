# Workflow

How design, tasks, and status move between Greg, Claude, and Viktor. The repo is the shared record, so nothing needs to be pasted or attached in chat.

## Who writes what

| File | Owner | Purpose |
| --- | --- | --- |
| `GAME_DESIGN.md` | Claude | Source of truth for design. The first line states the version. |
| `docs/tasks/NNN-name.md` | Claude | One brief per job, numbered in the order to do them. |
| `docs/writing/` | Claude | The story's lines and the music's score. Used exactly as written. |
| `src/core/progression/`, `src/data/perks/` | Claude | The progression logic and the perks. See `docs/PARALLEL.md`. |
| `docs/DECISIONS.md` | Claude | Why each major choice was made and what was turned down. Read it before proposing to reverse one. |
| `docs/reviews/` | Claude | Numbered reviews of merged work. Each says what must change and when. Viktor reads new reviews on every pull and answers them in `docs/status.md`. |
| `docs/status.md` | Viktor | Current state of the work. Newest entry at the top. |
| `docs/pr-media/` | Viktor | Screenshots and contact sheets referenced by status entries and PRs. |

Greg decides direction and playtests. He tells Viktor to pull and continue, and tells Claude to check the repo.

## For Viktor

1. Pull `main` before starting anything. Re-read `GAME_DESIGN.md` if its version line changed.
2. Do the lowest-numbered task in `docs/tasks/` whose status is `open`. Do not skip ahead. Task files are sometimes renumbered or rewritten while still `open`; always read the current file, not a remembered one.
3. When you start a task, set its `Status:` line to `in progress`. When it is merged and deployed, set it to `done`.
4. After each deploy, and whenever you are blocked, add an entry to the top of `docs/status.md`: date and time, task number, what shipped (PR, commit, URL), what you verified, what you did not verify, and any question for Greg or Claude.
5. If a task conflicts with `GAME_DESIGN.md`, stop, write the conflict in `docs/status.md`, and tell Greg.
6. Do not edit `GAME_DESIGN.md` or the task briefs beyond the `Status:` line. Put disagreements and suggestions in `docs/status.md`.
7. **Never stop and wait.** If you are blocked, need a decision, or are waiting on a review, write it in `docs/status.md` and move to the next thing you can do: another step of the same task, a logic stream you own, tests, or the asset list. A review blocks a merge or the start of a gated task. It does not block work on a branch. Claude checks the repo every hour and answers in `docs/reviews/` or `docs/status.md`.
8. **The only gates are the ones in this repo:** the reviews in `docs/reviews/`, the first-look bar in a task brief, and `docs/PARALLEL.md`. A gate or checklist from anywhere else does not apply here. If one stops you, paste its exact text into `docs/status.md` and carry on.

## Who looks first

Claude reviews every visual change from the screenshots before Greg looks at it. Greg is told a build is ready to view only when it clears the bar set in its task brief. Until then the build is deployed but described in `docs/status.md` as not ready for first look.

## For Claude

1. Pull `main` and read `docs/status.md` before answering questions about the build.
2. Review merged work against the task brief and the design doc: run the tests, read the screenshots.
3. Commit design changes and new task briefs directly to `main`. Put review findings in `docs/reviews/`.
