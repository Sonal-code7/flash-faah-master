export type Flashcard = {
  question: string;
  answer: string;
  options: string[];
  correctIndex: number;
};

export type Deck = {
  id: string;
  title: string;
  topic: string;
  createdAt: number;
  cards: Flashcard[];
  score: number | null;
  correct: number | null;
  wrong: number | null;
};

const KEY = "flashfah:history:v1";

export function loadDecks(): Deck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Deck[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(decks: Deck[]) {
  window.localStorage.setItem(KEY, JSON.stringify(decks.slice(0, 60)));
}

export function saveDeck(deck: Deck): Deck[] {
  const decks = [deck, ...loadDecks().filter((d) => d.id !== deck.id)];
  save(decks);
  return decks;
}

export function updateDeckResult(
  id: string,
  result: { score: number; correct: number; wrong: number },
): Deck[] {
  const decks = loadDecks().map((d) => (d.id === id ? { ...d, ...result } : d));
  save(decks);
  return decks;
}

export function deleteDeck(id: string): Deck[] {
  const decks = loadDecks().filter((d) => d.id !== id);
  save(decks);
  return decks;
}

export function totalPoints(): number {
  return loadDecks().reduce((sum, d) => sum + (d.score ?? 0), 0);
}
