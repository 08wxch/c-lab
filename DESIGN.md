# Design

## Direction
A quiet study desk built from warm paper, near-black ink, hairline rules, and a dark code surface. The visual language borrows the 02._.mock brand typography and restraint, but the workspace composition is specific to C LAB: lesson -> editor -> tutor.

## Tokens
- Paper `#f0ece4`; surface `#fffdf9`; ink `#0b0b0b`; muted `#6f685d`
- Moss `#2e5a45` for success; oxide `#a63a2b` for errors; amber `#8a6a2f` for warnings
- Code surface `#121512`; code ink `#e8eee4`
- IBM Plex Sans Thai for UI/body; Kanit only for the brand/numerals; system mono for code
- 8/12/16/22 px radii; one soft elevation system; rules instead of card borders where possible

## Surfaces
- Landing: editorial hero with a real code/console artefact, not a feature-card grid.
- Login: split ink/paper panel; the quote is the only large decorative element.
- Learn: rail + a single continuous course path; progress is a line, not a ring.
- Lesson: three-pane desktop workspace; mobile stacks lesson -> editor -> tutor, with the tutor as a drawer.
- Admin: dark rail + paper data tables; modal only for editing a lesson.

## Interaction
- Run compiles and streams stdout/stderr into the console; engine is labelled docker/local.
- AI context chips update on code edits, question selection, and run result.
- MCQ choices lock after answering and reveal the explanation.
- Keyboard: Cmd/Ctrl+Enter runs C; Tab inserts spaces in the editor.

## Accessibility
Visible focus rings, 4.5:1 body contrast, real buttons/links, labelled inputs, and scrollable code/output regions. Mobile stacking is intentional, not a scaled desktop.
