# Architecture Decisions — career-explorer

A Next.js web app that matches job seekers with tailored job postings via a structured 7-stage interview process. Built for individual job seekers. Stack: Next.js 14, TypeScript, TailwindCSS, Supabase, Anthropic Claude Sonnet.

---

## Seven-stage preference profile is the core UX contract

Decision: The preference-building pipeline runs in order: Resume → Constraints → Aspiration → Values → Capabilities → STAR story → Adjacent interests. Each stage must complete before the next is available.

Why: Each stage's output informs downstream scoring. Skipping or reordering stages produces unreliable preference profiles. The pipeline is linear by design, not as a limitation.

Violation looks like: Allowing users to jump to job matching before completing the preference stages. Treating stages as optional or parallelizable.

---

## Dual-layer scoring: Claude extraction + deterministic function

Decision: Job scoring is two steps — (1) Claude extracts structured `JobSignals` from the job description, (2) a deterministic scoring function applies preference rules to those signals. The deterministic function, not Claude, produces the final score.

Why: A single LLM pass for scoring is non-reproducible and expensive at scale. Extracting signals once and scoring deterministically keeps results consistent and auditable.

Violation looks like: Asking Claude to directly score a job against a preference profile in one prompt. Bypassing signal extraction to save tokens.

---

## Confidence damping on uncertain answers

Decision: Extracted preference confidence (0.0–1.0) modulates the penalty/bonus weight applied during scoring. Low-confidence preferences have less impact on the final score.

Why: Users give uncertain answers ("I think I want remote work, maybe?"). Treating uncertain answers as hard requirements produces bad matches. Confidence damping prevents a vague answer from dominating the score.

Violation looks like: Treating all extracted preferences as equally certain. Removing confidence from the preference schema to simplify the data model.

---

## Multi-source job fetching with deduplication

Decision: Jobs are fetched from Remotive, Adzuna, and JSearch (RapidAPI) in parallel. Deduplication is by `(title, company, location)` tuple. Source is tracked per job.

Why: No single job board has complete coverage. Deduplication prevents the same listing from appearing multiple times with different scores.

Violation looks like: Adding a new job source without implementing deduplication against existing records. Storing raw API responses without normalizing the tuple key.

---

## RLS enforced on all career data

Decision: Career profiles, jobs, scores, and error logs are all protected by Row Level Security. Users can only read and write their own data. Service-role-only functions handle admin operations.

Why: Career data is sensitive (resume content, aspirations, values). RLS is the enforcement layer — not just middleware-level auth checks.

Violation looks like: Disabling RLS temporarily for debugging and forgetting to re-enable it. Adding a new table without an RLS policy.

---

## Error capture to error_log table

Decision: Claude extraction errors, job fetch failures, and scoring anomalies are captured to the `error_log` table per profile, not just logged to console.

Why: Errors in async extraction pipelines are invisible without persistence. The admin dashboard reads from error_log to surface issues.

Violation looks like: Using console.log for extraction errors in Edge Functions. Swallowing errors silently when a job fetch API returns unexpected data.
