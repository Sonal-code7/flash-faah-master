import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { QuizPlayer } from "@/components/QuizPlayer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateFlashcards } from "@/lib/ai-flashcards.functions";
import type { Deck } from "@/lib/flashcard-history";
import { saveDeck } from "@/lib/flashcard-history";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlashFAAH — AI Flashcards With Points" },
      {
        name: "description",
        content:
          "Paste any topic or text and get instant AI flashcards. Earn a point per correct answer, lose one per miss — complete with the famous fail horn.",
      },
      { property: "og:title", content: "FlashFAAH — AI Flashcards With Points" },
      {
        property: "og:description",
        content: "Instant AI flashcards from any topic, scored answers, and a tutor for every miss.",
      },
    ],
  }),
  component: Index,
});

const COUNTS = [5, 10, 15] as const;

function Index() {
  const generate = useServerFn(generateFlashcards);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);

  async function onGenerate() {
    if (topic.trim().length < 3) {
      setError("Give me a topic or some text first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await generate({ data: { topic: topic.trim(), count } });
      const newDeck: Deck = {
        id: crypto.randomUUID(),
        title: res.title,
        topic: topic.trim(),
        createdAt: Date.now(),
        cards: res.cards,
        score: null,
        correct: null,
        wrong: null,
      };
      saveDeck(newDeck);
      setDeck(newDeck);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong generating cards.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
            F
          </span>
          <span className="font-display text-lg font-bold tracking-tight">FlashFAAH</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">
            <History className="size-4" /> History
          </Link>
        </Button>
      </header>

      {deck ? (
        <section className="mt-10">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {deck.title}
          </p>
          <div className="mt-5">
            <QuizPlayer deck={deck} onExit={() => setDeck(null)} />
          </div>
        </section>
      ) : (
        <>
          <section className="hero-glow mt-12 rounded-3xl px-1 py-2">
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl">
              Paste a topic.
              <br />
              Get flashcards that keep score.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              +1 point for every right answer, −1 for every miss — and yes, a miss triggers the
              FAAAAAAH. Then your AI tutor offers to teach you the bit you fumbled.
            </p>
          </section>

          <section className="surface-card mt-8 rounded-3xl p-6 sm:p-8">
            <label htmlFor="topic" className="font-display text-sm font-semibold">
              Your topic or text
            </label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, the French Revolution, or paste your lecture notes here…"
              className="mt-3 min-h-36 resize-y bg-secondary/50"
            />

            <p className="mt-6 font-display text-sm font-semibold">How many questions?</p>
            <div className="mt-3 flex gap-3">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  className={cn(
                    "flex-1 rounded-2xl border border-border bg-secondary/50 py-3 font-display text-lg font-semibold transition-all",
                    count === c
                      ? "border-primary bg-primary/15 text-primary shadow-glow"
                      : "hover:border-primary/50",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {error ? <p className="mt-5 text-sm text-destructive">{error}</p> : null}

            <Button className="mt-7 w-full" size="lg" onClick={onGenerate} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Building your deck…" : `Generate ${count} flashcards`}
            </Button>
          </section>
        </>
      )}
    </main>
  );
}
