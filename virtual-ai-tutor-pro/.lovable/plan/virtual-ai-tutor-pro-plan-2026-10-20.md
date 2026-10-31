# Virtual AI Tutor Pro — Plan

## What students get (5 tools, one sidebar)

```text
+-----------+----------------------------------+
| Sidebar   |  Dashboard (home)                |
| Dashboard |  - Welcome + current level       |
| AI Tutor  |  - Progress ring, recent scores  |
| Quizzes   |  - "Next topic" from roadmap     |
| Roadmap   |                                  |
| Progress  |                                  |
| Code Help |                                  |
+-----------+----------------------------------+
```
On phones, the sidebar folds into a menu button.

1. **Dashboard** – a quick overview: level, progress and the next suggested topic.
2. **AI Tutor Chat** – ask about any subject. Answers are written simply, with examples.
3. **Quiz Generator** – type a topic and pick easy, medium or hard. You get 5–10 multiple-choice questions, a score, and the right answer explained for each.
4. **Learning Roadmap** – a list of steps for a chosen subject. Your level (Beginner, Intermediate or Advanced) comes from your quiz scores and changes as you improve.
5. **Progress Tracker** – lessons marked done, a chart of quiz scores, and a streak counter.
6. **Code Explainer** – paste code to get a plain-language, line-by-line explanation.

## Decisions made
- No login. Progress is saved in your browser, so it stays on that one device.
- Any subject.
- Level is worked out from quiz scores: an average under 50% is Beginner, 50–79% is Intermediate, and 80% or more is Advanced.

## Missing decisions (defaults I will use unless you change them)
- **Chat history**: one ongoing conversation per device, with a "New chat" button.
- **Look**: white background with blue-to-purple accents, rounded cards and a clean modern font (Plus Jakarta Sans). Light mode only.
- **Language**: English only.
- **AI cost**: the AI comes with a small free monthly allowance. Heavy use during a demo may need paid credits.
- **Not included for now**: teacher accounts, uploading files, voice, and certificates.

## Spec-driven approach (how we build)
1. Write a short spec for each feature: what it does, its inputs and outputs, and how we know it works.
2. Build one feature at a time in this order: layout and dashboard, Tutor Chat, Quiz, Code Explainer, Roadmap, Progress.
3. Test each feature against its spec, including an automatic test for the level rule.
4. You review each step before we continue.

## Technical details
- TanStack Start routes: `/`, `/tutor`, `/quiz`, `/roadmap`, `/progress`, `/code`. Uses the shadcn Sidebar.
- AI runs through the Lovable AI Gateway inside server functions, with streaming chat. The API key stays on the server.
- Quizzes and roadmaps use a strict JSON schema so their output always has the same structure.
- Progress, quiz results and chat are saved in the browser's localStorage. The level is calculated by a pure function covered by a Vitest test.
- Colors are defined as oklch design tokens in `styles.css`, and every page has its own title and description for search results and link previews.
