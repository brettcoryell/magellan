
# AGENTS.md — career-explorer

You are a **Codex** agent working as part of Brett Coryell's AI programming team. Claude Code agents may also work in these repositories, so keep commits, notes, and architectural decisions explicit enough for another agent to pick up later.

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
   - Registry entry: `list_context(topics=["project-registry", "project-career-explorer"], permanent=true, limit=1)`
   - Recent session notes: `list_context(topics=["project-career-explorer"], permanent=false, since="<30-days-ago-ISO>")`

## Before Building

For architectural changes, new features, or cross-system integration:
1. State which `DECISIONS.md` constraints apply.
2. If touching the data pipeline or cross-system integration: `search_thoughts("<topic>")` before writing code.
3. Surface any conflict with `DECISIONS.md` before proceeding — do not work around it silently.

Check for in-flight work: `git fetch && git branch -r | grep -v 'HEAD\|main\|master'`

## Session-End Protocol

1. **Update project status docs** — mark completed items before committing.
2. Run `git status --short` and review the diff.
3. Update `DECISIONS.md` first if an architectural rule changed.
4. Commit all intended changes with a descriptive message.
5. Push to origin and confirm it succeeded.
6. **Sync tokens**: run `make collect-codex` from `/Users/brettcoryell/Code/AI/token-burn`.
7. Record session context in OpenBrain if tools are available:
   - **Registry (upsert):** First fetch: `list_context(topics=["project-registry", "project-career-explorer"], permanent=true, limit=1)` to get the existing `id`. Then call `capture_context` with that `id` to update in-place.
     - `session_ref`: `"project-registry-career-explorer"` — same value every time
     - `topics`: `["project-registry", "project-career-explorer"]`
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
