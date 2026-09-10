---
name: capture-reusable-workflow
description: Turn a repeatedly useful personal workflow into a focused, reusable agent skill in this knowledge base. Use when the user wants to solidify, capture, or improve a process for future agents; do not use for one-off notes or untested ideas.
metadata:
  short-description: Turn a proven workflow into a reusable skill
  updated: 2026-09-10
  tags:
    - skills
    - knowledge-management
  related:
    - knowledge:system/architecture
    - knowledge:system/graph-schema
---

# Capture a reusable workflow

Create or update a skill that helps future agents perform a real, repeated task more reliably.

## Decide whether it should be a skill

A workflow is ready when its goal recurs, the expected outcome is recognizable, and reusable guidance would change an agent's decisions or save repeated work. If the idea is still exploratory, store it under `knowledge/` and state what evidence would justify promoting it later.

## Capture the workflow

1. Identify realistic requests that should activate the skill and nearby requests that should not.
2. Extract the non-obvious decisions, constraints, inputs, outputs, and stopping conditions from the user's experience.
3. Choose a short lowercase, hyphenated name. Create `skills/<name>/SKILL.md`; keep the folder name and frontmatter `name` identical.
4. Write a concise, discriminating `description`. Put shared purpose and essential guidance in `SKILL.md`.
5. Add `references/` only for substantial conditional detail, `scripts/` only for logic worth executing repeatedly, and `assets/` only for files used in generated output.
6. Preserve uncertainty. Do not turn a preference, one failure, or a single example into a universal rule.
7. Run `npm run validate`. If scripts were added or changed, execute meaningful tests for their observable behavior.

When the skill belongs to this knowledge base, maintain its `metadata.related` item IDs. Add only relationships that help a future reader or agent continue the task, and run `npm run check` so missing targets fail before publication.

Use `templates/skill-template/` as a structural starting point when useful, and remove all placeholder text before validation.

## Review standard

The finished skill should be understandable without the conversation that created it. Its description should make selection cheap, its instructions should leave reasonable choices open, and every supporting file should have a concrete caller from `SKILL.md`.
