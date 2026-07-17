
# AGENTS.md — Magellan

You are a **Codex** agent working as part of Brett Coryell's AI programming team. Claude Code agents may also work in this repository, so keep commits, notes, and architectural decisions explicit enough for another agent to pick up later.

## Agent Roster

- **Claude Code** — runs on imac, mini, or macbook. Session refs: `claude-<machine>-YYYY-MM-DD-topic`.
- **Claude Chat** — Brett's thought-partnership surface. Not a coding agent.
- **Codex** — that's you. Session refs: `codex-<machine>-YYYY-MM-DD-topic`.

## Machine Identity

Run `hostname` to identify yourself. Map to structural `machine` value:
- hostname contains "mini" → `machine=mini`
- hostname contains "MacBook" → `machine=macbook`
- otherwise → `machine=imac`

Use `machine` (not agent nicknames) in session refs, token-burn records, and OB context.

## Agent Identity and Runtime Context

- Default mode is local Codex app/CLI work on Brett's Mac host.
- Use `source: "Codex"` for OpenBrain context entries. Use `session_ref` format `codex-<machine>-YYYY-MM-DD-topic`.

## Start-of-Session Protocol

1. Run `hostname` and resolve `machine` value.
2. Verify OB MCP is available. If unavailable, continue from repo docs and note the outage.
3. Check repo state: `git status --short` and `git pull --ff-only`.
4. Read this file and then read `DECISIONS.md` before non-trivial work.
5. Load OB context on demand:
   - Registry entry: `list_context(topics=["project-registry", "project-magellan"], permanent=true, limit=1)`
   - Recent session notes: `list_context(topics=["project-magellan"], permanent=false, since="<30-days-ago-ISO>")`

## Before Building

For architectural changes, new features, or cross-system integration:
1. State which `DECISIONS.md` constraints apply.
2. If touching the preference pipeline or scoring logic: `search_thoughts("<topic>")` before writing code.
3. Surface any conflict with `DECISIONS.md` before proceeding — do not work around it silently.

Check for in-flight work: `git fetch && git branch -r | grep -v 'HEAD\|main\|master'`

## Project Snapshot

- Repo: `/Users/brettcoryell/Code/AI/magellan`
- GitHub: `brettcoryell/magellan`
- Product name: Magellan
- Stack: Next.js, TypeScript, TailwindCSS, Supabase, Anthropic Claude Sonnet.

## Durable Rules

- Preserve the seven-stage preference pipeline from `DECISIONS.md`: Resume → Constraints → Aspiration → Values → Capabilities → STAR story → Adjacent interests.
- Keep job scoring as Claude signal extraction plus deterministic scoring. Do not ask Claude to produce final fit scores directly.
- Preserve confidence damping for uncertain preference answers.
- Preserve source-aware job deduplication: source IDs for Remotive/JSearch and normalized `(title, company)` for Adzuna's multi-city duplicates.
- Do not weaken Supabase RLS or service-role boundaries.
- Persist extraction, job fetch, and scoring errors to `error_log`.

## CSS and Theme Architecture

Dashboard and app UI work must use Brett's three-layer token architecture:

1. Primitive palette tokens hold raw color values.
2. Semantic site tokens map primitives to roles such as page background and primary text.
3. Magellan expression tokens use the `--mag-*` prefix and are what components should consume.

Use Tailwind for layout, spacing, typography mechanics, and responsive behavior. Use CSS variables for color rather than raw hex values or one-off Tailwind color utilities in component surfaces.

## Session-End Protocol

1. **Update project status docs** — mark completed items before committing.
2. Run `git status --short` and review the diff.
3. Update `DECISIONS.md` first if an architectural rule changed.
4. Commit all intended changes with a descriptive message.
5. Push to origin and confirm it succeeded.
6. **Sync tokens**: run `make collect-codex` from `/Users/brettcoryell/Code/AI/token-burn`.
7. Record session context in OpenBrain if tools are available:
   - **Registry (upsert):** First fetch existing `id`, then update in-place:
     `list_context(topics=["project-registry", "project-magellan"], permanent=true, limit=1)`
     - `session_ref`: `"project-registry-magellan"`
     - `topics`: `["project-registry", "project-magellan"]`
     - `expires_at`: null (permanent)
     - `source`: `"Codex"`
   - **Session note:**
     - `session_ref`: `"codex-<machine>-<date>-<topic>"`
     - `topics`: project slug + priority bucket
     - `expires_at`: 45 days from today
     - `source`: `"Codex"`
8. Create or update OB intents for follow-up work.

## Worktree Note

The desktop app creates a worktree per session — expected and fine. Do not call `Agent` with `isolation: "worktree"`.

## Networked Git Operations

For local AI repositories, Codex should not attempt networked Git commands inside the sandbox first. Commands such as `git push`, `git pull --ff-only`, `git fetch`, and `git ls-remote` require network access, so use `require_escalated` on the first attempt with a narrow prefix rule when useful.

Do not retry a failed sandboxed Git network command unless the first failure was not network/DNS/remote-access related.

When closing repo work, if a push is needed, run `git push` with escalation on the first try. Brett has approved this pattern for local AI repo handoffs.
