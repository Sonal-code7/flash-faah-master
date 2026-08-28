import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Check, Loader2, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { explainCard } from "@/lib/ai-flashcards.functions";
import { playFaah } from "@/lib/faah";
import type { Deck } from "@/lib/flashcard-history";
import { updateDeckResult } from "@/lib/flashcard-history";
import { cn } from "@/lib/utils";

type Props = {
  deck: Deck;
  onExit: () => void;
};

export function QuizPlayer({ deck, onExit }: Props) {
  const explain = useServerFn(explainCard);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [shake, setShake] = useState(false);
  const [lesson, setLesson] = useState<string | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  const card = deck.cards[index];
  const isWrongPick = picked !== null && picked !== card?.correctIndex;

  function choose(option: number) {
    if (picked !== null || !card) return;
    setPicked(option);
    if (option === card.correctIndex) {
      setScore((s) => s + 1);
      setCorrect((c) => c + 1);
    } else {
      setScore((s) => s - 1);
      setWrong((w) => w + 1);
      playFaah();
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
    }
  }

  async function learnIt() {
    if (!card) return;
    setLessonLoading(true);
    try {
      const res = await explain({
        data: {
          topic: deck.topic.slice(0, 2000),
          question: card.question,
          answer: card.options[card.correctIndex] ?? card.answer,
        },
      });
      setLesson(res.lesson);
    } catch (error) {
      setLesson(error instanceof Error ? error.message : "Could not load the lesson.");
    } finally {
      setLessonLoading(false);
    }
  }

  function next() {
    setPicked(null);
    setLesson(null);
    if (index + 1 >= deck.cards.length) {
      updateDeckResult(deck.id, { score, correct, wrong });
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  if (finished) {
    return (
      <div className="surface-card animate-pop-in rounded-3xl p-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Deck complete</p>
        <h2 className="mt-3 text-4xl font-bold">{score} points</h2>
        <p className="mt-2 text-muted-foreground">
          {correct} correct · {wrong} wrong · {deck.cards.length} cards
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onExit}>
            <RotateCcw className="size-4" /> New deck
          </Button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">
          Card {index + 1} / {deck.cards.length}
        </span>
        <span className="rounded-full border border-border bg-secondary px-3 py-1 font-display font-semibold text-primary">
          {score} pts
        </span>
      </div>
      <Progress value={((index + (picked !== null ? 1 : 0)) / deck.cards.length) * 100} />

      <div
        className={cn(
          "surface-card rounded-3xl p-6 sm:p-8",
          shake && "animate-shake border-destructive/60",
        )}
      >
        <h2 className="text-2xl font-semibold leading-snug">{card.question}</h2>

        <div className="mt-6 grid gap-3">
          {card.options.map((option, i) => {
            const isCorrect = i === card.correctIndex;
            const revealed = picked !== null;
            return (
              <button
                key={option + i}
                type="button"
                onClick={() => choose(i)}
                disabled={revealed}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-left transition-all",
                  !revealed && "hover:border-primary/60 hover:bg-secondary",
                  revealed && isCorrect && "border-success/70 bg-success/15 text-success",
                  revealed &&
                    !isCorrect &&
                    picked === i &&
                    "border-destructive/70 bg-destructive/15 text-destructive",
                  revealed && !isCorrect && picked !== i && "opacity-55",
                )}
              >
                <span>{option}</span>
                {revealed && isCorrect ? <Check className="size-4 shrink-0" /> : null}
                {revealed && !isCorrect && picked === i ? <X className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>

        {picked !== null ? (
          <div className="animate-pop-in mt-6 space-y-4 border-t border-border pt-5">
            {isWrongPick ? (
              <div className="space-y-3">
                <p className="font-display text-xl text-destructive">FAAAAAAH! −1 point.</p>
                <p className="text-sm text-muted-foreground">
                  Correct answer: <span className="text-foreground">{card.options[card.correctIndex]}</span>
                </p>
                {!lesson ? (
                  <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                    <p className="text-sm">Want me to teach you this topic before moving on?</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={learnIt} disabled={lessonLoading}>
                        {lessonLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <BookOpen className="size-4" />
                        )}
                        Yes, teach me
                      </Button>
                      <Button size="sm" variant="ghost" onClick={next}>
                        No thanks
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="font-display text-xl text-success">Correct! +1 point.</p>
            )}

            {lesson ? (
              <div className="animate-pop-in rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed whitespace-pre-line">
                {lesson}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={next} variant={isWrongPick ? "secondary" : "default"}>
                {index + 1 >= deck.cards.length ? "See results" : "Next card"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onExit}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Quit this deck
      </button>
    </div>
  );
}
