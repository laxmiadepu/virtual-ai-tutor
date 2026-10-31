import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { languageForSubject } from "@/lib/practice";

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answerIndex: z.number(),
      explanation: z.string(),
    }),
  ),
});
export type Quiz = z.infer<typeof QuizSchema>;

const RoadmapSchema = z.object({
  steps: z.array(z.object({ title: z.string(), description: z.string(), minutes: z.number() })),
});
export type Roadmap = z.infer<typeof RoadmapSchema>;
const RoadmapResponseJsonSchema = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          minutes: { type: "integer" },
        },
        required: ["title", "description", "minutes"],
      },
    },
  },
  required: ["steps"],
};
async function structured<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
  const { getGeminiClient, MODEL, friendlyError } = await import("@/lib/ai.server");
  try {
    const response = await getGeminiClient().models.generateContent({
      model: MODEL,
      contents: `${prompt}\nReturn a valid JSON object with the exact required keys; no markdown.`,
      config: {
  responseMimeType: "application/json",
  responseJsonSchema:
    Object.is(schema, RoadmapSchema)
      ? RoadmapResponseJsonSchema
      : undefined,
  temperature: 0.2,
        maxOutputTokens: 6000,
        
httpOptions: {
  timeout: 120_000,
  retryOptions: {
    attempts: 2,
    initialDelay: 2,
    maxDelay: 4,
    httpStatusCodes: [503, 504],
  },
},

      },
    });
    if (!response.text?.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

const parsed: unknown = JSON.parse(response.text);

let normalized: unknown = parsed;

const root =
  parsed !== null &&
  typeof parsed === "object" &&
  !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;

// Fix quiz responses that are arrays.
if (Object.is(schema, QuizSchema)) {
  const questions = Array.isArray(parsed)
    ? parsed
    : root?.["questions"] ?? root?.["quiz"];

  if (Array.isArray(questions)) {
    normalized = { questions };
  }
}

// Fix roadmap responses that are arrays
// or use alternative root keys.
if (Object.is(schema, RoadmapSchema)) {
  const candidate = Array.isArray(parsed)
    ? parsed
    : root?.["steps"] ??
      root?.["roadmap"] ??
      root?.["topics"];

  const steps =
    candidate !== null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)["steps"]
      : candidate;

  if (Array.isArray(steps)) {
    normalized = { steps };
  }
}

return schema.parse(normalized);


if (Object.is(schema, RoadmapSchema)) {
  const root =
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  const candidate = Array.isArray(parsed)
    ? parsed
    : root?.["steps"] ??
      root?.["roadmap"] ??
      root?.["topics"];

  const steps =
    candidate !== null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)["steps"]
      : candidate;

  if (Array.isArray(steps)) {
    return schema.parse({ steps });
  }

  console.error(
    "Unexpected roadmap JSON keys:",
    root ? Object.keys(root ?? {}) : typeof parsed
  );
}

return schema.parse(parsed);


if (Object.is(schema, RoadmapSchema)) {
  const root =
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

 const candidate = Array.isArray(parsed)
  ? parsed
  : root?.["steps"] ??
    root?.["roadmap"] ??
    root?.["topics"];

  const steps =
    candidate !== null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)["steps"]    : candidate;

  if (Array.isArray(steps)) {
    return schema.parse({ steps });
  }

  console.error(
    "Unexpected roadmap JSON keys:",
    Object.keys(root ?? {})
  );
}

return schema.parse(parsed);
  } catch (error) {
    // Print validation errors in the server terminal without printing private API keys.
    if (error instanceof z.ZodError) {
      console.error("Gemini response schema validation failed:", error.issues);
      throw new Error("Gemini returned JSON that does not match the required format. Check the server terminal for details.");
    }
    if (error instanceof SyntaxError) {
      console.error("Gemini returned invalid JSON:", error.message);
      throw new Error("Gemini returned invalid JSON. Please try again.");
    }
    console.error("Gemini request issue:", error);
    throw new Error(friendlyError(error).message);
  }
}

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        topic: z.string().min(2).max(200),
        difficulty: z.enum(["easy", "medium", "hard"]),
        count: z.number().int().min(5).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    structured(
      QuizSchema,
      `Create exactly ${data.count} ${data.difficulty} multiple-choice questions about "${data.topic}" for a student.
Each question has exactly 4 distinct options, answerIndex is the 0-based index of the correct option, and explanation briefly says why it's correct. Vary the question formats and avoid repeating near-identical questions.`,
    ),
  );


export const generateRoadmap = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      subject: z.string().min(2).max(200),
      level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    try {
      const r = await structured(
        RoadmapSchema,
        `Create exactly 8 learning roadmap steps for a ${data.level}
student learning "${data.subject}".

Rules:
- Return exactly 8 different, meaningful topics.
- Order topics from basic to advanced.
- Each title must contain at least 3 characters.
- Never use only a number as a title.
- Do not include "Step 1", "Step 2", etc. in titles.
- Provide a useful description for each topic.
- Estimate study time in minutes, between 15 and 90.
- Return valid structured data matching the required schema.`
      );

      const steps = r.steps.slice(0, 8).map((step) => ({
        ...step,
        title: step.title
          .replace(/^\s*step\s*\d+\s*[:.)-]\s*/i, "")
          .trim(),
        minutes: Number.isFinite(step.minutes)
          ? Math.min(90, Math.max(15, Math.round(step.minutes)))
          : 45,
      }));

      const valid =
        steps.length >= 6 &&
        steps.every(
          (step) =>
            step.title.length >= 3 &&
            !/^\d+$/.test(step.title) &&
            step.description.trim().length >= 10
        ) &&
        new Set(
          steps.map((step) => step.title.toLowerCase())
        ).size === steps.length;

      if (!valid) {
        throw new Error("AI generated an incomplete roadmap.");
      }

      return { steps };
    } catch (error) {
      console.error("Roadmap generation issue:", error);

      // Show the actual Gemini/validation error instead of a generic message.
      throw new Error(
        error instanceof Error ? error.message : "Roadmap generation failed."
      );
    }
  });


const PracticeSchema = z.object({
  isCodingTopic: z.boolean(),
  language: z.enum(["python", "java", "c", "cpp", "javascript"]).nullable(),
  concept: z.string().nullable(),
  example: z.object({ title: z.string(), code: z.string(), explanation: z.string() }).nullable(),
  practice: z
    .object({
      question: z.string(),
      referenceSolution: z.string().min(1),
      starterCode: z.string(),
      sampleInput: z.string(),
      expectedOutput: z.string(),
      testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).min(2).max(3),
    })
    .nullable(),
});
export type Practice = z.infer<typeof PracticeSchema>;

export const generatePractice = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        subject: z.string().min(2).max(200),
        level: z.enum(["Beginner", "Intermediate", "Advanced"]),
        title: z.string().min(2).max(200),
        description: z.string().max(500),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Determine programming subjects from the roadmap itself, not from a
    // small model's occasionally incorrect isCodingTopic flag.
    const lang = languageForSubject(data.subject) ?? languageForSubject(data.title);
    try {
      const practice = await structured(
      PracticeSchema,
      `Create a coding practice for a ${data.level} student learning "${data.subject}" for the roadmap topic "${data.title}" (${data.description}).

IMPORTANT RULES:
- When the subject is Python, Java, C, C++ or JavaScript programming, isCodingTopic MUST be true, even for installation, getting started, environment setup, variables and data types.
- Variables, Data Types, Operators, Loops, Functions, Arrays and Basic Syntax are coding topics.
- Introductory topics should have a beginner-friendly Hello World or basic variables exercise.
- Set isCodingTopic false ONLY for genuinely non-programming subjects.
- ${lang ? `The detected language is ${lang}. Use this language; isCodingTopic MUST be true.` : "Use the language named in the subject or topic if it is programming-related."}

If the subject and topic are genuinely not about programming, set isCodingTopic to false and the other fields to null.

Otherwise set isCodingTopic to true and fill in:
- language: the main language for this topic (default python).
- concept: 2-4 simple sentences explaining the concept.
- example: { title, code: a complete runnable program in that language, explanation: 1-2 sentences }.
- practice: { question: one clear task a beginner can code, referenceSolution: a complete correct runnable solution used to validate test cases, starterCode: a compilable skeleton with a TODO comment, sampleInput: what the program reads from standard input (may be empty), expectedOutput: the exact expected standard output for sampleInput,testCases: Exactly 3 objects, each containing input
and expectedOutput.

IMPORTANT:
- Always generate at least 2 complete test cases.
- Prefer 3 distinct test cases.
- Include the sample case as the first test case.
- Every expectedOutput must be the actual output
  of referenceSolution for that input.
- For Hello World programs with no input, use
  empty input strings.
- Never return an empty testCases array.
- Never return only one test case. { input, expectedOutput }, the first one being the sample case }.
For Java put everything in one "public class Main". For C and C++ include the needed headers. Read input with the language's standard input: input() in Python, Scanner in Java, scanf or cin in C/C++, and Node.js require('fs').readFileSync(0, 'utf8') in JavaScript. Do not print input prompts.
Keep every expectedOutput exact: only what the program prints, with no trailing explanation.`,
      );
      // Do not show "not a coding topic" for a known programming roadmap.
      if (lang && (!practice.isCodingTopic || practice.language !== lang || !practice.practice?.referenceSolution || practice.practice.testCases.length < 2)) {
        throw new Error("The AI returned an invalid exercise for a programming topic.");
      }
      return practice;
    } catch (error) {
      // Explicitly labeled starter exercises for introductory Python/Java topics.
      // Other errors are rethrown so Gemini connection problems are visible.
      if (lang === "python") return pythonStarter(data.title);
      if (lang === "java" && /introduc|getting started|basic|variable|data type|class|object|encapsulat/i.test(data.title)) {
        return javaStarter(data.title);
      }
      throw error;
    }
  });

/** Deterministic, explicitly labeled Python starter exercises. */
function pythonStarter(title: string): Practice {
  const topic = title.toLowerCase();
  const note = "Built-in Python starter exercise (used when the AI couldn't create a valid exercise). ";
  if (/loop|iteration|control structure/.test(topic)) {
    return {
      isCodingTopic: true, language: "python",
      concept: note + "A for loop repeats an action. Use range(1, n + 1) to visit every number from 1 through n.",
      example: { title: "Sum using a loop", code: "n = 5\ntotal = 0\nfor i in range(1, n + 1):\n    total += i\nprint(total)", explanation: "The loop adds each number to the total." },
      practice: {
        question: "Read a positive integer n. Using a loop, print the sum of all integers from 1 to n.",
        referenceSolution: "n = int(input())\nresult = 0\nfor i in range(1, n + 1):\n    result += i\nprint(result)",
        starterCode: "n = int(input())\n# TODO: calculate the sum with a loop\n",
        sampleInput: "5", expectedOutput: "15\n",
        testCases: [{ input: "5", expectedOutput: "15\n" }, { input: "3", expectedOutput: "6\n" }, { input: "10", expectedOutput: "55\n" }],
      },
    };
  }
  if (/function|method/.test(topic)) {
    return {
      isCodingTopic: true, language: "python",
      concept: note + "Functions package reusable code. Practice defining and calling a function.",
      example: { title: "A square function", code: "def square(n):\n    return n * n\n\nprint(square(4))", explanation: "The function returns a number multiplied by itself." },
      practice: {
        question: "Read one integer, define a function named square, and print its square.",
        referenceSolution: "def square(n):\n    return n * n\n\nprint(square(int(input())))",
        starterCode: "def square(n):\n    # TODO: return n squared\n    pass\n\nprint(square(int(input())))\n",
        sampleInput: "4", expectedOutput: "16\n",
        testCases: [{ input: "4", expectedOutput: "16\n" }, { input: "7", expectedOutput: "49\n" }, { input: "-3", expectedOutput: "9\n" }],
      },
    };
  }
  if (/list|array|collection/.test(topic)) {
    return {
      isCodingTopic: true, language: "python",
      concept: note + "A Python list holds several items. The built-in max() returns the largest item.",
      example: { title: "Maximum in a list", code: "numbers = [2, 7, 3]\nprint(max(numbers))", explanation: "The result is the largest value, 7." },
      practice: {
        question: "Read a single line containing space-separated integers and print the largest number.",
        referenceSolution: "nums = list(map(int, input().split()))\nprint(max(nums))",
        starterCode: "nums = list(map(int, input().split()))\n# TODO: print the largest number\n",
        sampleInput: "2 7 3", expectedOutput: "7\n",
        testCases: [{ input: "2 7 3", expectedOutput: "7\n" }, { input: "-4 -2 -9", expectedOutput: "-2\n" }, { input: "10 1 8", expectedOutput: "10\n" }],
      },
    };
  }
  if (/condition|if.else|comparison|branch/.test(topic)) {
    return {
      isCodingTopic: true, language: "python",
      concept: note + "An if/else statement chooses between two possible paths.",
      example: { title: "Even or odd", code: "n = 4\nif n % 2 == 0:\n    print('Even')\nelse:\n    print('Odd')", explanation: "The remainder tells us if a number is even." },
      practice: {
        question: "Read an integer and print Even if it is divisible by 2; otherwise print Odd.",
        referenceSolution: "n = int(input())\nif n % 2 == 0:\n    print('Even')\nelse:\n    print('Odd')",
        starterCode: "n = int(input())\n# TODO: print Even or Odd\n",
        sampleInput: "4", expectedOutput: "Even\n",
        testCases: [{ input: "4", expectedOutput: "Even\n" }, { input: "7", expectedOutput: "Odd\n" }, { input: "-2", expectedOutput: "Even\n" }],
      },
    };
  }
  if (/install|setup|environment|getting started|introduction|hello/.test(topic)) {
    return {
      isCodingTopic: true, language: "python",
      concept: note + "The print() function displays text. Start with your first working program.",
      example: { title: "Hello World", code: 'print("Hello, World!")', explanation: "This displays a message in the output console." },
      practice: {
        question: 'Print exactly "Hello, World!" (without quotation marks).',
        referenceSolution: 'print("Hello, World!")', starterCode: '# TODO: print Hello, World!\n',
        sampleInput: "", expectedOutput: "Hello, World!\n",
        testCases: [{ input: "", expectedOutput: "Hello, World!\n" }, { input: "", expectedOutput: "Hello, World!\n" }],
      },
    };
  }

  


  return {
    isCodingTopic: true, language: "python",
    concept: note + "Variables store values, and int(input()) reads integer input. Practice a simple calculation.",
    example: { title: "Add two values", code: "a = 2\nb = 3\nprint(a + b)", explanation: "The + operator adds two numbers." },
    practice: {
      question: "Read two integers on separate lines and print their sum.",
      referenceSolution: "a = int(input())\nb = int(input())\nprint(a + b)",
      starterCode: "a = int(input())\nb = int(input())\n# TODO: print the sum\n",
      sampleInput: "2\n3", expectedOutput: "5\n",
      testCases: [{ input: "2\n3", expectedOutput: "5\n" }, { input: "10\n20", expectedOutput: "30\n" }, { input: "-4\n2", expectedOutput: "-2\n" }],
    },
  };
}

/** Explicitly labeled Java starter exercise, used only if Gemini practice generation fails. */
function javaStarter(title: string): Practice {
  const note =
    "Built-in Java starter exercise (used when AI generation fails). ";

  const topic = title.toLowerCase();

  if (/class|object|encapsulat|inherit|polymorph|interface|abstract/.test(topic)) {
    const solution = `import java.util.Scanner;

class NumberBox {
    private int number;

    NumberBox(int number) {
        this.number = number;
    }

    int doubleValue() {
        return number * 2;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        NumberBox box = new NumberBox(n);
        System.out.println(box.doubleValue());
    }
}`;

    return {
      isCodingTopic: true,
      language: "java",
      concept: note +
        "A Java class can contain private fields, constructors, and methods. " +
        "Encapsulation keeps data inside an object and exposes useful methods.",
      example: {
        title: "Java class and object",
        code: solution,
        explanation:
          "NumberBox stores an integer in a private field. " +
          "Its doubleValue method returns twice that number.",
      },
      practice: {
        question:
          "Read an integer and use a NumberBox object with a private field " +
          "and a doubleValue method to print twice the number.",
        referenceSolution: solution,
        starterCode: `import java.util.Scanner;

class NumberBox {
    // TODO: Add a private int field,
    // constructor and doubleValue method.
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // TODO: Create NumberBox and print its double value.
    }
}`,
        sampleInput: "5",
        expectedOutput: "10\n",
        testCases: [
          { input: "5", expectedOutput: "10\n" },
          { input: "8", expectedOutput: "16\n" },
          { input: "-3", expectedOutput: "-6\n" },
        ],
      },
    };
  }

  const solution = `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}`;

  return {
    isCodingTopic: true,
    language: "java",
    concept: note +
      "Java uses classes, variables, and statements. " +
      "Scanner reads input, and System.out.println displays output.",
    example: {
      title: "Add two numbers in Java",
      code: solution,
      explanation:
        "The program reads two integers and prints their sum.",
    },
    practice: {
      question:
        "Read two integers and print their sum.",
      referenceSolution: solution,
      starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();

        // TODO: Print the sum.
    }
}`,
      sampleInput: "2 3",
      expectedOutput: "5\n",
      testCases: [
        { input: "2 3", expectedOutput: "5\n" },
        { input: "10 20", expectedOutput: "30\n" },
        { input: "-4 2", expectedOutput: "-2\n" },
      ],
    },
  };
}
