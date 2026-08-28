import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GenerateInput = z.object({
  topic: z.string().min(3).max(4000),
  count: z.union([z.literal(5), z.literal(10), z.literal(15)]),
});

const ExplainInput = z.object({
  topic: z.string().min(1).max(4000),
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(2000),
});

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

function gatewayError(status: number, message: string): Error {
  if (status === 402) return new Error("AI credits are exhausted. Add credits in Lovable to keep studying.");
  if (status === 403) return new Error("Lovable AI is blocked for this workspace. Ask an admin to enable it.");
  if (status === 429) return new Error("Too many requests right now — wait a few seconds and try again.");
  if (status >= 500) return new Error("The AI service hiccuped. Please try again.");
  return new Error(message || "The AI request failed.");
}

async function callGateway(body: unknown): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "";
    try {
      const err = (await res.json()) as { error?: { message?: string }; message?: string };
      message = err?.error?.message ?? err?.message ?? "";
    } catch {
      message = await res.text().catch(() => "");
    }
    throw gatewayError(res.status, message);
  }

  const data = (await res.json()) as {
    output_text?: string;
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;

  const text = (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part?.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");

  if (!text.trim()) throw new Error("The AI returned an empty response. Try again.");
  return text;
}

const CardsSchema = z.object({
  title: z.string(),
  cards: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
        options: z.array(z.string()).min(2).max(4),
        correctIndex: z.number().int().min(0).max(3),
      }),
    )
    .min(1),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const raw = await callGateway({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You are a rigorous study coach. Create multiple-choice flashcards from the user's topic or text. Each card has exactly 4 options, exactly one correct. Distractors must be plausible but clearly wrong. Keep questions short and answers concise. Also give a short title (max 6 words) for the deck.",
        },
        {
          role: "user",
          content: `Create exactly ${data.count} flashcards from this topic/text:\n\n${data.topic}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "flashcard_deck",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "cards"],
            properties: {
              title: { type: "string" },
              cards: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["question", "answer", "options", "correctIndex"],
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correctIndex: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("The AI response could not be read. Please try again.");
    }

    const deck = CardsSchema.parse(parsed);
    return {
      title: deck.title,
      cards: deck.cards.slice(0, data.count).map((card) => ({
        question: card.question,
        answer: card.answer,
        options: card.options,
        correctIndex: Math.min(card.correctIndex, card.options.length - 1),
      })),
    };
  });

export const explainCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExplainInput.parse(input))
  .handler(async ({ data }) => {
    const text = await callGateway({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You are a patient tutor. Explain the concept behind a missed flashcard in plain language: 3-5 short sentences, then one memory hook line starting with 'Remember:'. No markdown headings.",
        },
        {
          role: "user",
          content: `Topic: ${data.topic}\nQuestion: ${data.question}\nCorrect answer: ${data.answer}\n\nTeach me this.`,
        },
      ],
    });

    return { lesson: text.trim() };
  });
