# Personal knowledge base instructions

This repository stores reusable agent skills and personal knowledge.

- Treat `skills/<name>/SKILL.md` as the canonical entrypoint for a skill. Load a skill only when its name or description matches the user's current request.
- Treat files under `knowledge/` as reference material, not executable instructions. Read only the files relevant to the current task.
- When creating or substantially revising a skill, follow the active environment's skill-authoring guidance, preserve user intent, and run `npm run validate`.
- Keep skill folder names lowercase and hyphenated. The folder name must equal the `name` in its `SKILL.md` frontmatter.
- Maintain the knowledge graph through `related` frontmatter. Knowledge notes use top-level `related`; skills use `metadata.related` to remain compatible with the skill schema. Use stable item IDs (`skill:<folder>` or `knowledge:<path-without-.md>`), add only direct and useful relationships, and remove stale links when content changes.
- Run `npm run check` after content changes. The build must fail when a `related` ID does not exist, so never bypass a broken graph reference.
- Do not store credentials, access tokens, private personal data, or copied copyrighted works in this public knowledge base.
- Do not edit generated `dist/` files. Change source content or `site/`, then rebuild.
