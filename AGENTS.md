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

5. **Keep visual hierarchy simple.**
   - One clear main idea per slide.
   - Main title > optional short lead > visual/interaction > concise takeaway.
   - Avoid dense prose and documentation-style paragraphs.

6. **Use the shared concept-deck infrastructure.**
   - New concept pages under `concepts/` should load `deck-mobile.js`.
   - `deck-mobile.js` loads shared mobile/editor behavior and `concept-standards.css`; do not bypass it without a specific reason.

7. **Maintain interaction consistency.**
   - Student-answer interactions should give immediate visual feedback.
   - Buttons and feedback text should use Chinese-first bilingual terminology where terminology is involved.
   - Fullscreen navigation and mobile behavior must continue to work.

## Before committing a concept-page change

Check the page for:
- English-only core terms.
- Any question without a `课堂判断` label.
- Unnecessarily small text at 100% zoom.
- Explanatory filler that can be removed without losing meaning.
- Broken normal/fullscreen/mobile layout.

When the user's explicit instruction conflicts with this file, follow the user's instruction and update this file if the change should become a lasting repository convention.
