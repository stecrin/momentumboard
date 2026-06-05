# MomentumBoard

A local-first productivity and job-application dashboard for organising daily tasks, weekly planning, job applications, and job-hunting decisions.

---

## What This Is

MomentumBoard is a browser-based dashboard built to solve a real workflow problem: organising daily tasks, weekly planning, and job applications in one local-first system, without relying on a generic todo app or external service.

Data lives in your browser's `localStorage`. Nothing is sent to a server. There is no login, no cloud sync, and no external dependencies.

---

## Why I Built It

During an intensive period of job searching I found standard todo apps too generic and too slow to set up each day. I needed something opinionated: a tool that enforces a daily structure, surfaces the right tasks for my current energy, prevents duplicate job applications, and extracts job details from copied text automatically.

Building it also helped me strengthen and demonstrate:

- Product thinking applied to a real, self-contained problem
- JavaScript state management without a framework
- Local data persistence and backup strategies
- Practical job-search tooling with text parsing and duplicate detection
- Security awareness around local-first applications
- Iterative development with a clean Git workflow

---

## Core Features

### Recovery Dashboard

- **Recovery state selector** — set your current state (Stable, Pressured, Overwhelmed, In Recovery, Deep Focus); the UI adapts guidance accordingly
- **Daily minimum standard** — five daily targets tracked with a recovery score: job applications, money action, movement, emotional boundary, one important task completed
- **Deep Focus mode** — fullscreen overlay displaying your single current mission and its next action; all other UI hidden
- **Emergency Reset** — guided overwhelm protocol: stop, drink water, 60-second breathing timer, write only 3 tasks, choose the smallest, work for 10 minutes

### Task System

- **Brain Dump Inbox** — empty your head in one pass; commas or line breaks separate items automatically
- **Organise My Brain** — keyword-rule engine that analyses each inbox item and suggests category, priority, energy level, and the next smallest action; review and accept or skip
- **Task Breakdown modal** — per-task: define the final outcome, the smallest first step, urgency, money impact, stress reduction, deadline, energy level (Low/Medium/High), and subtasks
- **Priority engine** — automatic scoring: Urgent +3, Makes Money +2, Reduces Stress +1, Deadline proximity +1 to +3
- **Subtask tracking** — add manually or auto-suggest by task type; per-card progress indicator
- **Recurring tasks** — Daily, Weekdays, Weekly (one day), or Custom day patterns; completion resets daily; pause/resume supported
- **Energy tagging** — Low Energy mode visually dims high-energy tasks to surface what is actually achievable

### Daily and Weekly Planning

- **Today's Plan** — structured daily command: 1 Major Mission, 2 Support Actions, 3 Non-Negotiables; overload warning if too many slots are filled
- **Build Today For Me** — auto-populates the daily plan from highest-priority tasks, respecting current brain state and energy mode
- **Weekly Planner** — assign tasks to specific days; today's column highlighted; printable layout
- **Auto Plan Week** — distributes tasks across the week (high-priority tasks early, health tasks Saturday, max 3 per day)
- **Weekly Review** — structured end-of-week debrief: completions, avoidance patterns, emotional destabilisers, single mission for next week

### Job Recovery Tab

- **Application tracker** — save jobs with title, company, salary, location, URL, status (Saved / Applied / Interview / Rejected / Offer), match score (1–5), follow-up date, and notes
- **Daily application counter** — tracks applications completed today with a progress bar toward a configurable daily target
- **Smart Job Capture** — paste a full job advert or copied LinkedIn description; automatically extracts title, company, location, salary, and suggested tags; handles messy LinkedIn copy patterns; warns about unsuitable location or work-mode risks; preserves all extracted details when saving
- **Location and work-mode detection** — assesses whether a role's location and work mode (Remote / Hybrid / On-site) is practical; flags roles with a Location Risk tag and caps the match score accordingly
- **Match scoring** — keyword-based fit scoring (1–5) generated from the pasted job text; adjusted downward for location risk
- **Already Applied Checker** — paste a title, company, or URL to check if it matches any existing saved job; uses URL normalisation and meaningful-word matching to surface likely duplicates
- **Duplicate detection on save** — flags exact, high-confidence, and possible duplicates before a job is saved, with the matched record shown inline
- **Filtering and sorting** — filter by tag (Remote, Hybrid, On-site, £40k+, Cybersecurity, IT Support, Urgent) and by status; sort by newest, oldest, applied/interview/saved first, rejected last, company A–Z, title A–Z, or highest match score
- **Job stats bar** — live count of saved jobs by status

### Data and Backup

- **localStorage persistence** — all state is written to `localStorage` under key `scs_v1` on every change
- **Manual backup** — downloads a timestamped JSON file of all tasks, jobs, reviews, and plan data
- **Manual restore** — import a previous backup JSON; confirmation prompt before overwriting current data
- **Automatic daily backup** — exports automatically once per day when the app is open; last backup date shown in the header
- **localhost notice** — warns if the app is opened directly via `file://`, where some browsers may restrict or clear localStorage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, no framework) |
| Logic | Vanilla JavaScript (ES6+) |
| Storage | Browser `localStorage` |
| Backend | None |
| Dependencies | None |

---

## How to Run Locally

Clone the repository and serve it from a local server. Opening `index.html` directly via `file://` works but is not recommended — some browsers restrict or silently clear `file://` localStorage.

```bash
git clone https://github.com/stecrin/momentumboard.git
cd momentumboard
python3 -m http.server 8181
```

Then open: **http://localhost:8181**

---

## Data Storage

All data is stored in your **browser's localStorage**.

- Clearing your browser's site data will erase all saved tasks, jobs, and reviews
- Use the **Backup** button in the header regularly to download a JSON export
- Restore from any previous backup with the **Import** button
- Backup JSON files are listed in `.gitignore` and should not be committed to version control

There is no cloud sync, no account system, and no server-side storage in the current version.

---

## Security and Privacy Notice

This is a **local-first application**. Data is stored in browser localStorage and does not leave your machine in normal use.

The current version does not include:

- Server-side authentication
- Encrypted database storage
- Multi-user account isolation
- Access control or session management

**Do not host a shared or public version of this app and store sensitive personal information in it** unless proper authentication, backend storage, access control, and security hardening are added first.

---

## Roadmap

Planned improvements — none are currently implemented:

- [ ] Authentication and login system
- [ ] Backend database (replacing localStorage)
- [ ] Hosted private version
- [ ] Multi-user SaaS possibility
- [ ] Improved job URL capture
- [ ] Browser extension for LinkedIn job capture
- [ ] AI-assisted job fit analysis
- [ ] Application analytics dashboard

---

## Technical Notes

This project demonstrates:

- **Product thinking** — a workflow-specific tool shaped around a real problem, not a generic CRUD app
- **User-centred design** — brain state modes, emergency reset, low-energy filtering, and an opinionated daily structure that reduces decision fatigue
- **JavaScript state management** — single-source-of-truth `state` object with consistent persistence and reactive rendering, no framework
- **Local data persistence** — localStorage read/write, backup/restore cycle, automatic daily export, corruption-safe hydration
- **Practical job-search tooling** — text parsing, duplicate scoring, URL normalisation, and tag/salary/location extraction from raw job advert copy
- **Security awareness** — explicit documentation of the limitations of local storage and the requirements for a safely hosted version
- **Iterative Git workflow** — feature branches, incremental commits, clean history

---

## Disclaimer

This is local-first personal productivity software built for practical day-to-day use.

- Not medical advice
- Not financial advice
- Not a production security product
- Not a finished or hosted SaaS

Use it as a local productivity tool. Maintain regular backups to avoid data loss.
