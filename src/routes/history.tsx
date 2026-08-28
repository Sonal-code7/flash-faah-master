import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { QuizPlayer } from "@/components/QuizPlayer";
import { Button } from "@/components/ui/button";
import type { Deck } from "@/lib/flashcard-history";
import { deleteDeck, loadDecks } from "@/lib/flashcard-history";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Flashcard History — FlashFAAH" },
      {
        name: "description",
        content: "Revisit every flashcard deck you generated, replay it, and review your points.",
      },
      { property: "og:title", content: "Flashcard History — FlashFAAH" },
      {
        property: "og:description",
        content: "Every past deck, score and replay in one place.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [replay, setReplay] = useState<Deck | null>(null);

  useEffect(() => {
    setDecks(loadDecks());
  }, []);

  const totalPoints = decks.reduce((sum, d) => sum + (d.score ?? 0), 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12">
      <header className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
        <span className="rounded-full border border-border bg-secondary px-3 py-1 font-display text-sm font-semibold text-primary">
          {totalPoints} total pts
        </span>
      </header>

      {replay ? (
        <section className="mt-10">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {replay.title}
          </p>
          <div className="mt-5">
            <QuizPlayer
              deck={replay}
              onExit={() => {
                setReplay(null);
                setDecks(loadDecks());
              }}
            />
          </div>
        </section>
      ) : (
        <>
          <h1 className="mt-10 text-4xl font-bold">History</h1>
          <p className="mt-3 text-muted-foreground">
            Every deck you've generated, stored on this device.
          </p>

          {decks.length === 0 ? (
            <div className="surface-card mt-8 rounded-3xl p-8 text-center text-muted-foreground">
              No decks yet.{" "}
              <Link to="/" className="text-primary underline-offset-4 hover:underline">
                Make your first one.
              </Link>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {decks.map((deck) => (
                <li key={deck.id} className="surface-card rounded-3xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">{deck.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{deck.topic}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(deck.createdAt).toLocaleString()} · {deck.cards.length} cards
                        {deck.score !== null
                          ? ` · ${deck.score} pts (${deck.correct}✓ / ${deck.wrong}✗)`
                          : " · not played yet"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setReplay(deck)}>
                        <Play className="size-4" /> Replay
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Delete deck"
                        onClick={() => setDecks(deleteDeck(deck.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
