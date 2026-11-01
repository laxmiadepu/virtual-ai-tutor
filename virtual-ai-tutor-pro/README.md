# 🎓 Virtual AI Tutor Pro

**An AI-powered learning platform for personalized tutoring, interactive quizzes, guided learning roadmaps, hands-on programming practice, and progress tracking.**

Virtual AI Tutor Pro is a web application designed to help students learn at their own pace. It combines conversational AI with structured practice: students can ask questions, understand code, generate topic-based quizzes, follow a learning plan, and track what they have completed.

> **Project status:** Academic/hackathon project. This README describes functionality present in the supplied source code. Some features require API configuration, browser downloads, or optional local tools; the full application has not been independently end-to-end tested here.

## 📌 Project Overview

Traditional learning resources often give all students the same materials, regardless of their current understanding. Virtual AI Tutor Pro aims to make self-learning more interactive through:

- Simple, step-by-step AI explanations with follow-up questions.
- Automatically generated quizzes at different difficulty levels.
- Personalized, topic-wise learning roadmaps.
- Programming exercises that learners can edit, run, and check against test cases.
- A dashboard showing quiz performance, learning streaks, and roadmap completion.

The application is intended for students and beginner programmers, as well as anyone learning a new subject.

## ✨ Main Features

| Module | Route | Functionality |
| --- | --- | --- |
| **Learning Dashboard** | `/` | Displays learning level, quizzes taken, average score, study streak, recent quizzes, and next roadmap topic. |
| **AI Tutor** | `/tutor` | Answers subject-related questions with streamed explanations; supports follow-up conversations and starting a new chat. |
| **Quiz Generator** | `/quiz` | Creates **5 or 10** multiple-choice questions by topic and difficulty (**easy, medium, hard**); shows answers, explanations, and scores. |
| **Learning Roadmap** | `/roadmap` | Requests a sequence of learning steps based on a subject and estimated student level, with topic descriptions and suggested study times. |
| **Programming Practice** | Inside `/roadmap` | Generates examples, starter code, exercises, sample input/output, and test cases; saves code drafts and tracks passed topics. |
| **Progress Tracker** | `/progress` | Displays lesson completion, quiz history, quiz-score charts, learning level, and study streak. |
| **Code Explainer** | `/code` | Explains pasted code for beginners; maintains code-explanation history in the browser. |

### Additional behavior

- **Interactive AI chat:** The `/api/chat` server endpoint streams Gemini responses to the browser.
- **Roadmap assistance:** There is a clearly labeled **offline sample Python roadmap** for demonstrations when AI roadmap generation is unavailable.
- **Program validation:** In coding topics, **Run code** displays execution results; **Check my solution** compares program output with generated test cases before marking a topic complete.
- **Local persistence:** Chat data, quiz scores, roadmap progress, practice drafts, and code history are saved using browser `localStorage`.
- **Responsive interface:** The application uses a sidebar-based layout with reusable UI components.

## 🧰 Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, HTML, CSS |
| Web framework / routing | TanStack Start, TanStack Router |
| Development tooling | Vite, Bun (recommended), npm-compatible scripts |
| Styling and components | Tailwind CSS, Radix UI, Lucide React |
| AI integration | Google Gemini through the `@google/genai` SDK |
| Validation | Zod |
| Visualization | Recharts |
| Python execution | Pyodide in a browser Web Worker |
| JavaScript execution | Browser Web Worker |
| C / C++ execution | Clang WebAssembly via `@live-codes/clang-wasm` |
| Optional Java execution | Local JDK (`javac` / `java`) in a restricted development-only server path |
| Data storage | Browser `localStorage` (no configured database or cross-device sync) |
| Testing | Vitest, React Testing Library |
| Development environment | Visual Studio Code, Git / GitHub |

## 🏗️ System Architecture

```text
                       STUDENT / WEB BROWSER
                                |
                       React + TanStack UI
                                |
              +-----------------+------------------+
              |                 |                  |
        AI learning       Code practice      Learning progress
        experiences       and execution      and saved history
              |                 |                  |
       TanStack server     Browser workers     Browser localStorage
       routes/functions    (Python, JS, C/C++)
              |                 |
        Google Gemini      Optional localhost-only
        API (server-side)   Java runner / JDK
```

**Important:** The Gemini API key stays on the server. It must never be placed in frontend code or exposed through a `VITE_` environment variable.

## 📂 Project Structure

```text
virtual-ai-tutor-pro/
├── public/
│   ├── clang/                 # WebAssembly compiler assets
│   └── ...
├── src/
│   ├── components/
│   │   ├── AppSidebar.tsx     # Main navigation
│   │   ├── CodeEditor.tsx     # Programming editor
│   │   ├── PracticePanel.tsx  # Generated exercises and tests
│   │   ├── StreamChat.tsx     # AI chat and streaming UI
│   │   └── ui/                # Reusable components
│   ├── lib/
│   │   ├── ai.server.ts       # Gemini client and tutor prompts
│   │   ├── ai.functions.ts    # Quiz, roadmap, practice generation
│   │   ├── runCode.ts         # Language execution dispatcher
│   │   ├── python.worker.ts   # Browser-based Python execution
│   │   ├── clang.worker.ts    # Browser-based C/C++ execution
│   │   ├── java.local.*       # Optional development-only Java
│   │   ├── practice.ts        # Practice logic, tests, draft storage
│   │   ├── codeHistory.ts     # Code explanation history
│   │   └── store.ts           # Browser learning data
│   ├── routes/
│   │   ├── api/chat.ts        # Gemini streaming API endpoint
│   │   ├── index.tsx          # Dashboard
│   │   ├── tutor.tsx          # AI Tutor
│   │   ├── quiz.tsx           # Quiz Generator
│   │   ├── roadmap.tsx        # Roadmap and Practice
│   │   ├── progress.tsx       # Learning progress
│   │   └── code.tsx           # Code Explainer
│   ├── test/                  # Automated tests
│   └── styles.css
├── .env.example              # Example environment variables
├── .gitignore
├── bun.lock
├── package.json
├── vite.config.ts
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

- A recent Node.js version and **Bun** (recommended) or npm.
- Visual Studio Code or another code editor.
- A modern browser and an internet connection.
- A **Google AI Studio Gemini API key** for AI-generated content.
- **Optional:** A JDK with `java` and `javac` available on your system path for localhost-only Java practice.

### 1. Extract or clone the project

If using the supplied `.rar` archive, extract it to a new folder and open the folder containing `package.json` in VS Code.

Or, after uploading the project to your GitHub repository:

```bash
git clone <your-repository-url>
cd virtual-ai-tutor-pro
```

> Do not copy `node_modules` or any existing private `.env` file into a public GitHub repository.

### 2. Install dependencies

**With Bun (recommended):**

```bash
bun install
```

**Or with npm:**

```bash
npm install
```

### 3. Configure Gemini

Copy `.env.example` to `.env` **in the project root**, next to `package.json`.

**Windows Command Prompt:**

```bat
copy .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Open `.env` and set:

```dotenv
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL=your_supported_gemini_model_id
```

Create or manage your key in [Google AI Studio](https://aistudio.google.com/). Replace the model placeholder with an actual model ID accessible to your API key. The archive's `.env.example` contains a default model name, but **model availability must be checked in your own AI Studio account**.

Do not commit `.env`, `src/.env`, or any API key. Restart the development server whenever you change environment variables.

### 4. Start the application

With Bun:

```bash
bun run dev
```

Or with npm:

```bash
npm run dev
```

Open the **Local** URL displayed by the terminal. On this project it may be something like `http://localhost:8080`, but use the actual URL shown by Vite.

### 5. Try the features

1. Open **AI Tutor** and ask: `Explain Python loops with an example.`
2. Open **Quizzes**, choose a topic, difficulty, and question count, then submit your answers.
3. Open **Roadmap** and enter `Python Programming` to generate a learning plan.
4. Expand a coding topic, open its practice panel, and try **Run code**.
5. Click **Check my solution** to evaluate the exercise against test cases.
6. Open **Progress** to see quiz scores and completed lessons.
7. Open **Code Explainer**, paste a program, and request a line-by-line explanation.

If AI roadmap generation is temporarily unavailable, select **Use sample Python roadmap (offline)** for the built-in demonstration roadmap.

## 💻 Programming Language Support

| Language | Execution method | Requirements / notes |
| --- | --- | --- |
| **Python** | Pyodide browser Web Worker | First execution downloads Pyodide assets from the internet unless cached. |
| **JavaScript** | Browser Web Worker | Runs browser-supported JavaScript; not a Node.js terminal environment. |
| **C** | Clang WebAssembly browser worker | Requires the bundled `public/clang/` compiler assets to be served correctly. |
| **C++** | Clang WebAssembly browser worker | Requires the same WebAssembly compiler assets and browser compatibility. |
| **Java** | Optional local server-side JDK runner | Disabled by default; requires JDK and explicit development-only configuration. |

The code includes a `LOCAL_JAVA_EXECUTION` environment flag. **Do not enable this on a public server or for untrusted users.** The local Java runner is not a security sandbox and executes with the development server's operating-system permissions. For a public deployment, use a properly isolated code-execution service instead.

> A browser Web Worker or a WebAssembly runtime should not be treated as a complete production-grade sandbox for arbitrary user code.

## 🧪 Available Commands

Run these from the folder containing `package.json`:

```bash
bun run dev       # Start local development
bun run build     # Create a production build
bun run preview   # Preview a build locally
bun run test      # Run Vitest tests
bun run lint      # Check code with ESLint
bun run format    # Format the codebase
```

The same scripts can be run as `npm run dev`, `npm run build`, `npm run test`, and so on.

The repository includes tests for routing, code history, learning levels, practice logic, practice panels, and code execution helpers. **Included tests do not mean every third-party service or language runtime has been verified in every environment.**

## 🔄 How It Works

1. **Start learning:** The student opens the dashboard and selects a subject or module.
2. **Get an explanation:** The frontend sends chat requests to the server, which calls Gemini and streams a response.
3. **Test understanding:** The quiz generator requests questions from Gemini and records the score after submission.
4. **Create a study plan:** The roadmap generator requests topic-wise steps appropriate to the student's estimated level.
5. **Practice programming:** For coding topics, the practice panel provides sample code, an exercise, and test cases.
6. **Validate a solution:** The student's code is executed using the selected language runtime. Only passing the relevant tests allows automatic completion of a coding topic.
7. **Track progress:** The browser saves learning activity and shows the results in the dashboard and progress view.

## 🛠️ Troubleshooting

| Problem | What to check |
| --- | --- |
| Gemini API key is missing or invalid | Confirm `.env` is in the project root and `GEMINI_API_KEY` is correct, then restart the app. |
| Gemini model not found (404) | Change `GEMINI_MODEL` to a supported model ID available to your account. |
| Gemini quota/rate-limit error (429) | Review Google AI Studio API usage, access, and applicable limits. |
| Roadmap/quiz generation returns invalid JSON | Retry with a simpler topic; inspect the server terminal for validation errors. The offline sample Python roadmap remains available. |
| Python code takes a long time on first run | Allow time for the initial Pyodide download; check network access. |
| C/C++ compiler cannot load | Verify `public/clang/` files were retained and are accessible when the app runs. |
| Java execution is disabled | This is expected by default. The optional runner is only for trusted, localhost development with a JDK. |
| Learning progress is missing on another device | Data is stored in the original browser's `localStorage`; there is no automatic account-based sync. |

## 🔐 Security and Deployment Notes

- Keep all Gemini credentials **server-side**, and use your hosting provider's secret/environment-variable settings for deployment.
- The application uses **server routes/functions**; it is not only a static HTML site. Choose hosting compatible with your TanStack Start/Nitro build and verify the server runtime after deployment.
- Add authentication, server-side rate limiting, logging, and abuse protection before offering a public AI service to untrusted users.
- Do not expose the development-only Java runner over the internet.
- Review and test the C/C++ compiler assets and browser permissions on the target host.
- The supplied `.rar` archive includes environment-file entries. **Check for real credentials and exclude those files before uploading the source or archive publicly. Rotate any API key that has already been exposed.**
- Large folders such as `node_modules` should **not** be committed to GitHub; users should install dependencies themselves.

## 🚀 Future Enhancements

Potential improvements (not claimed as implemented in this version):

- Student accounts and secure cloud synchronization.
- Teacher dashboards and assignment management.
- Additional practice problems and more extensive automated evaluation.
- Multilingual tutoring and voice-based interaction.
- Course recommendations based on long-term performance.
- Hardened remote code execution for publicly hosted Java and other languages.

## 🎯 Project Outcome

Virtual AI Tutor Pro demonstrates the integration of **AI-assisted tutoring, automatic assessment, guided self-study, interactive coding practice, and learning analytics** in one web application. It is intended as a practical foundation for a student-focused e-learning system and can be expanded with authentication, persistent storage, and deployment-grade security.

---

**Developed using React, TypeScript, TanStack Start, Google Gemini, and browser-based programming runtimes.**

*This README was prepared from the supplied `virtual-ai-tutor-pro.rar` project files. It replaces the minimal existing README without changing the application source code.*
