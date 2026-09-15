# DM001 Course Hub — Agent Instructions

These rules apply to all work in this repository, especially files under `concepts/`.

## Course direction

DM001 is a concept-first Data Mining course. The concept pages are classroom presentation pages, not documentation pages. Keep them concise, visual, interactive, and readable when projected.

## Concept deck hard rules

1. **Chinese first, English supplementary.**
   - Core concepts, labels, buttons, axes, and task names must never appear only in English.
   - Preferred form: `中文名称（English）` or Chinese as the main line with English as a smaller secondary line.
   - Examples: `查询（Query）`, `特征（Feature）`, `训练集（Training Set）`, `聚类（Clustering）`.

2. **Every student-answer question must be visibly marked `课堂判断`.**
   - If a region asks students to choose, judge, classify, or answer before revealing feedback, add a visible `课堂判断` label immediately above that question or question group.
   - Reuse the shared `.classroom-check` convention from `concepts/concept-standards.css`.
   - Existing common quiz containers are automatically labeled by the shared stylesheet; new custom question containers should add class `classroom-check`.
   - Do not use exam-like labels such as `考试`, `测试题`, or `题目` unless explicitly requested.

3. **Do not add filler/meta teaching sentences.**
   - Avoid text such as “目标不是考试，而是建立直觉”, “这是教学化简，不是严格定义”, or similar caveats unless they are genuinely necessary to understand the concept.
   - Prefer the concept, example, interaction, and conclusion themselves.

4. **Readable at browser zoom 100%.**
   - Normal mode and fullscreen mode must both be readable on a classroom display.
   - Do not introduce tiny helper text, labels, legends, or feedback text.
   - Small secondary text must remain visibly readable; do not shrink content merely to fit one screen.

5. **Fullscreen is the same slide, only uniformly scaled.**
   - Normal mode is the single source of truth for slide typography, line wrapping, spacing, grid topology, card sizes, and element positions.
   - Fullscreen/presenter mode must preserve that exact layout and scale the entire stage uniformly to fit the available screen.
   - **Never create a second fullscreen content layout.** Do not change font sizes, line breaks, card padding, grid columns, component heights, or slide spacing only because the deck is fullscreen.
   - Do not add page-specific `.deck-wrap:fullscreen ...`, `:fullscreen ...`, or presenter-only rules that alter slide content. Presentation-only CSS may hide/show chrome such as the top bar, hints, sources, or exit-fullscreen controls.
   - Shared behavior lives in `fullscreen-sync.js` and `fullscreen-consistency.css`; fix consistency there rather than patching individual slides.
   - Existing legacy page-level fullscreen rules may remain temporarily, but new work must not depend on them and should remove them when touching the relevant stylesheet.

6. **Keep visual hierarchy simple.**
   - One clear main idea per slide.
   - Main title > optional short lead > visual/interaction > concise takeaway.
   - Avoid dense prose and documentation-style paragraphs.

7. **Use the shared concept-deck infrastructure.**
   - New concept pages under `concepts/` must load `deck-mobile.js`.
   - `deck-mobile.js` loads shared mobile/fullscreen behavior, page management, `concept-standards.css`, and the teacher text/style editor (`deck-text-editor.js`).
   - Do not bypass this shared loader without a specific reason; otherwise new pages will lose editing, presentation, and consistency features.

8. **Keep teacher editing compatible.**
   - Static visible text should remain normal DOM text so the shared editor can select it.
   - Avoid replacing the shared editor or inventing per-page editing controls.
   - The editing baseline supports persistent text content, font size, text color, and deleting selected text or buttons.
   - **Never auto-save teacher edits.** Editing creates a local draft first; persistence happens only after the teacher explicitly clicks `保存本页`.
   - Deleting selected text/buttons follows the same draft-first rule and must not sync until `保存本页` is clicked.
   - Unsaved changes should be visibly indicated and navigation away should warn when practical.
   - Keep teacher entry points simple: the top bar should expose `编辑本页` and `页面管理`, not a separate top-level `删除本页` button.
   - `删除本页` belongs inside the `编辑本页` panel as a dangerous current-page action; `页面管理` is for deck-level page management such as viewing/restoring deleted pages.

9. **Maintain interaction consistency.**
   - Student-answer interactions should give immediate visual feedback.
   - Buttons and feedback text should use Chinese-first bilingual terminology where terminology is involved.
   - Fullscreen navigation and mobile behavior must continue to work.

## Before committing a concept-page change

Check the page for:
- English-only core terms.
- Any question without a `课堂判断` label.
- Unnecessarily small text at 100% zoom.
- Explanatory filler that can be removed without losing meaning.
- Any normal/fullscreen difference in typography, wrapping, spacing, grids, card sizes, or content positions.
- Any newly introduced page-specific fullscreen content styling; fullscreen must be a uniform scale of the normal slide.
- Broken mobile layout.
- A missing `deck-mobile.js` loader that would disable shared editing/presentation behavior.
- Any teacher edit path that silently auto-saves instead of requiring `保存本页`.
- Duplicate teacher controls such as a top-level `删除本页` plus the same action inside `编辑本页`.

When the user's explicit instruction conflicts with this file, follow the user's instruction and update this file if the change should become a lasting repository convention.
