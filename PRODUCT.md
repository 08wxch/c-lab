# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
delegated: dependency-light Node.js HTTP server, static HTML/CSS/JS, Supabase Auth/Postgres, DeepSeek-compatible AI proxy, Docker-first GCC runner with local fallback.

## Users
Students studying C (chapters 5–8) who need a guided lesson, a runnable editor, and an AI tutor in one place. One administrator manages lessons, users, AI settings, and course content.

## Product Purpose
Turn the supplied C textbook, slides, and past questions into a focused interactive course. A learner reads on the left, writes/runs C in the centre, and asks an AI that can see the current lesson, question, code, and last run result. Success means a learner can practise, debug, and understand without switching tools.

## Positioning
The AI is context-bound to the exact lesson/code/error on screen, not a generic chat sidebar. The course is built from the learner's own Chinese textbook and exam material, with Thai explanations.

## Operating Context
Primary use is a personal/local browser session on macOS. The admin may later expose it to a small class. Content comes from local PDFs, PPTs, and review-question files. The C runner is Docker + GCC when available; the current machine has clang and no Docker, so a clearly-labelled local fallback is used for preview.

## Capabilities and Constraints
- Supabase Auth email/password login; profiles with student/admin roles.
- Lessons, questions, progress, settings, and chat history in Supabase when configured; local demo store otherwise.
- Admin console for lesson CRUD, publish state, user roles, AI settings, and seed data.
- AI chat via an OpenAI-compatible endpoint (default DeepSeek), with server-side encrypted API key.
- C runner: docker-first `gcc`, timeout and output limits; local `clang` fallback only for development.
- No public multi-tenant hardening in MVP; do not expose the local runner to untrusted networks.

## Brand Commitments
Follow the 02._.mock visual language: warm paper, near-black ink, IBM Plex Sans Thai + Kanit, restrained rules, generous margins, compact operational controls. No emoji-as-icon. The app should feel like a quiet study desk, not a gamified dashboard.

## Evidence on Hand
Source books, slides, and review questions are in the local course workspace; the visual reference is the 02._.mock study-app language.

## Product Principles
1. The current problem is always visible; the AI never answers out of context.
2. Run, read, ask, revise is one loop, not four disconnected screens.
3. Content and progress are durable; demo mode is only a preview.
4. Admin actions are explicit and reversible where possible.
5. Calm density over decoration.

## Accessibility & Inclusion
Keyboard-operable controls, visible focus, readable Thai/Chinese text, mobile stacking, and clear error messages.
