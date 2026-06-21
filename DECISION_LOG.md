# DECISION LOG — MomentumBoard

Decisions that shaped the project in ways not obvious from the code or commit history.

---

## Decision 001 — Rename public project identity to MomentumBoard

- **Date:** 2026-06-07
- **Status:** Accepted

### Context

The project was originally conceived and built under the internal name **RecoveryOS** (also referred to as Stefan RecoveryOS). That name reflected its original personal purpose: a structured daily execution system for periods of high pressure and overwhelm.

As the project matured into a portfolio piece — with a polished README, public GitHub repository, interface screenshots, and employer/recruiter-facing documentation — the name RecoveryOS became a liability. It is too specific to a private personal context and does not clearly communicate what the product actually does to someone encountering it for the first time.

### Decision

Rename the public-facing project identity to **MomentumBoard**.

Applied to: app title, in-app header logo, README, clone URL, backup filename, Quick Guide help text, `CLAUDE.md`, `PROJECT_STATUS.md`, and all future public-facing output.

### Reasons

- **Clarity:** MomentumBoard immediately suggests a productivity or planning tool. RecoveryOS does not.
- **Professionalism:** RecoveryOS implies a medical, emotional, or personal recovery context that is not appropriate for a public portfolio project.
- **Portability:** MomentumBoard describes a broader set of users and use cases. The tool is useful beyond the specific circumstances that prompted it.
- **Portfolio suitability:** Employers and recruiters reviewing the project should see a clear, professional product name, not a name that requires explanation.

### Alternatives considered

- **Keep RecoveryOS** — rejected; too closely tied to private personal context, unsuitable for public presentation.
- **Use a generic name (e.g. TaskBoard, DailyOS)** — considered; MomentumBoard was preferred as more distinctive and still descriptive.

### Consequences

- The **local folder name** (`stefan-recovery-os`) is unchanged. Renaming it would break local git remotes and provide no meaningful benefit. The folder name is internal only and not visible publicly.
- The **`localStorage` key** (`scs_v1`) is unchanged. It is internal, not user-facing, and renaming it would delete all existing locally stored data.
- The word **"recovery"** may still appear as functional language within the app — for example, Recovery Dashboard, Recovery State, Recovery Rules. These are product concepts describing the app's structured approach to regaining focus and control. They are not the old project name and do not need to be removed.
- Future commits, documentation, and public output should use MomentumBoard exclusively. RecoveryOS should not appear in any new public-facing content.

### Follow-up actions

- [x] App title and header updated to MomentumBoard
- [x] README updated to MomentumBoard
- [x] Clone URL updated to reflect public repository name
- [x] Backup filename updated to `momentumboard-backup-*`
- [x] Quick Guide help text updated
- [x] `CLAUDE.md` documents the naming rule
- [x] `PROJECT_STATUS.md` records branding complete
- [ ] `DECISION_LOG.md` to be added to `CLAUDE.md` important files table (low priority)

---

## Decision 002 — Rename local project folder to momentumboard

- **Date:** 2026-06-21
- **Status:** Accepted — applied

### Context

Decision 001 renamed the public-facing project identity to MomentumBoard but explicitly left the local folder name as `stefan-recovery-os`, noting that renaming it would break local git remotes. That reasoning was incorrect: the Git remote URL is stored inside `.git/config` and is not derived from the local folder name. The remote already pointed to `https://github.com/stecrin/momentumboard.git`, so a local folder rename carries no git linkage risk.

The local folder `stefan-recovery-os` had become the only remaining surface using the old name, creating inconsistency between the local development environment, the GitHub repository name, and the public app identity.

### Decision

Rename the local project folder from `stefan-recovery-os` to `momentumboard`. Supersedes the "folder unchanged" consequence recorded in Decision 001.

### Changes applied

- Local folder renamed: `~/Projects/stefan-recovery-os` → `~/Projects/momentumboard`
- Launcher renamed via `git mv`: `Open_Stefan_Recovery_OS.command` → `Open_MomentumBoard.command`
- Launcher internal path updated: `$HOME/Projects/stefan-recovery-os` → `$HOME/Projects/momentumboard`
- Launcher terminal message updated: `Starting Stefan Recovery OS...` → `Starting MomentumBoard...`
- `CLAUDE.md` local folder reference updated
- `PROJECT_STATUS.md` notes section updated
- Git remote remained intact throughout: `origin https://github.com/stecrin/momentumboard.git`

### Consequences

- The local development environment, GitHub repository name, and public app identity are now fully consistent under the name `momentumboard` / `MomentumBoard`.
- The `localStorage` key (`scs_v1`) is unchanged — internal only, renaming it would delete stored data.
- The `CLAUDE.md` path reference and `Open_Stefan_Recovery_OS.command` filename no longer reference the old name.
