# CLAUDE.md — MomentumBoard

## Global framework (read first)

This project follows the global autonomous development framework:
**~/Projects/_AI_RULES/AUTONOMOUS_DEV_FRAMEWORK.md**

That file is the master index. Load specialist files from there as needed.
Its safety rules override anything in this file.

---

## How to start a session here

1. Read this file.
2. Read `PROJECT_STATUS.md` — current phase, branch, last task, next task, known risks.
3. Do not scan the repository or read additional files until you know what the task requires.
4. Propose your approach before making any changes.
5. Wait for explicit human approval before editing, committing, or pushing.

---

## Project identity

- **Public name:** MomentumBoard
- **Local folder:** `stefan-recovery-os` (historical name — do not use publicly)
- **Purpose:** A local-first productivity and job-application dashboard for organising daily tasks, weekly planning, job applications, and job-hunting decisions.
- **Portfolio status:** Public portfolio project — not a production SaaS.

**Always use MomentumBoard as the project name in documentation, commit messages, and public-facing content. Never use "Stefan RecoveryOS" or "RecoveryOS" in public output.**

---

## Project status snapshot

See `PROJECT_STATUS.md` for current detail. Summary:

- **Stage:** Building (Phase 1 — Stabilisation features implemented; AI workflow layer being added)
- **Priority:** Medium
- **Production status:** Not deployed — runs locally via `python3 -m http.server 8181`
- **Active branch:** `main`

---

## Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, no framework) |
| Logic | Vanilla JavaScript (ES6+) |
| Storage | Browser `localStorage` (key: `scs_v1`) |
| Backend | None |
| Dependencies | None |
| Build step | None |
| Test suite | None |

---

## Commands

- **Run locally:** `python3 -m http.server 8181`
- **Open:** http://localhost:8181
- **Install:** nothing to install
- **Build:** no build step
- **Test:** no test suite
- **Lint:** no linter configured

---

## Important files

| File | Purpose |
|---|---|
| `index.html` | Full application markup and tab structure |
| `app.js` | All application logic, state management, and localStorage persistence |
| `style.css` | All styling |
| `README.md` | Public-facing documentation for GitHub |
| `VISION.md` | Original project philosophy (do not publish privately held content) |
| `docs/modules/CORE_MODULES.md` | Module design reference |
| `docs/phases/PHASE_1_STABILISATION.md` | Phase 1 scope reference |
| `assets/screenshots/` | Interface screenshots for README preview |
| `.gitignore` | Excludes backup JSON files and local machine files |

---

## Conventions

- **Branching:** feature branches off `main` (e.g. `feature/smart-job-capture`)
- **Commits:** lowercase imperative with scope prefix where useful (e.g. `docs: update README`, `feat: add recurring tasks`)
- **Tests:** none currently
- **Formatting:** no enforced formatter — match existing style

---

## AI authority level

- **Level:** `propose-only` by default
- **Claude may:** read files, inspect git state, draft content, suggest changes
- **Claude must ask before:** editing any file, creating any file outside approved scope, committing, pushing, deleting, deploying, or scanning files not named in the current task
- **Exception:** explicit per-task permission granted by the user in the current session overrides this default for that task only

---

## Public and privacy safety

- This is a **public repository** — do not include private personal data, financial figures, real job application records, credentials, or local machine paths in any committed file.
- Backup JSON files (in `docs/`) are gitignored — never commit them.
- The `VISION.md` contains personal context — do not quote it verbatim in public-facing output without review.
- The internal `scs_v1` localStorage key is a legacy of the prior name — note it in context but do not highlight it publicly.

---

## Do-not-touch list

Never modify, delete, expose, or commit without explicit human sign-off:

- `assets/screenshots/` — production screenshot assets for the public README
- `docs/stefan-recovery-os-backup-*.json` — personal backup files (also gitignored)
- `.gitignore` — do not alter without discussion
- `VISION.md` — personal project philosophy; treat as read-only context
- Any file not named in the current session's approved task scope

---

## Session start routine

1. Read `CLAUDE.md` (this file).
2. Read `PROJECT_STATUS.md`.
3. Confirm the current task and approved file scope with the user before proceeding.
4. Do not open additional files speculatively.

## Session end routine

1. Report what was done and what was not done.
2. Flag any open questions or risks discovered.
3. Remind the user to update `PROJECT_STATUS.md` if the task changed project state.
4. Do not commit or push unless explicitly instructed.
