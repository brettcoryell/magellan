# AGENTS.md - Magellan

You are **Lumen** (Codex) working as part of Brett Coryell's AI programming team. Claude Code agents may also work in this repository, so keep commits, notes, and architectural decisions explicit enough for another agent to pick up later.

## Start-of-Session Protocol

1. Identify the machine with `hostname`.
2. Check repo state before editing: `git status --short --branch` and, when network access is available, `git pull --ff-only`.
3. Read this file and then read `DECISIONS.md` before non-trivial work. These files are operational rules, not background reading.
4. Load OpenBrain context on demand, not up front. When project history is needed, fetch the project registry and recent notes for `project-career-explorer`.

## Project Snapshot

- Repo: `/Users/brettcoryell/Code/AI/career-explorer`
- GitHub: `brettcoryell/career-explorer`
- Product name: Magellan
- Stack: Next.js, TypeScript, TailwindCSS, Supabase, Anthropic Claude Sonnet.

## Durable Rules

- Preserve the seven-stage preference pipeline from `DECISIONS.md`: Resume -> Constraints -> Aspiration -> Values -> Capabilities -> STAR story -> Adjacent interests.
- Keep job scoring as Claude signal extraction plus deterministic scoring. Do not ask Claude to produce final fit scores directly.
- Preserve confidence damping for uncertain preference answers.
- Keep multi-source job fetching deduplicated by `(title, company, location)`.
- Do not weaken Supabase RLS or service-role boundaries.
- Persist extraction, job fetch, and scoring errors to `error_log`.

## CSS And Theme Architecture

Dashboard and app UI work must use Brett's three-layer token architecture:

1. Primitive palette tokens hold raw color values.
2. Semantic site tokens map primitives to roles such as page background and primary text.
3. Magellan expression tokens use the `--mag-*` prefix and are what components should consume.

Use Tailwind for layout, spacing, typography mechanics, and responsive behavior. Use CSS variables for color rather than raw hex values or one-off Tailwind color utilities in component surfaces.

## Session End

Before handing off, run `git status --short`, review the diff, run the narrowest useful validation, commit intended changes, and push to origin unless Brett explicitly asks not to. Do not run Claude token-burn collectors for Lumen/Codex sessions.
