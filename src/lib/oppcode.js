// Abbreviating a European opponent for the Home board, which has no crest for them.
//
// This lives in its own module so verify.js can test the SHIPPED function rather than a copy
// of it. The first version of that check re-implemented the rule, passed happily, and the
// front page went on showing a side called "I(" — a check that owns its own copy of the logic
// only ever proves the copy is right.

// A club-type prefix carries no identity of its own: the first word of "FC Iberia 1999" is
// "FC", which names nothing.
export const CLUB_TYPE = /^(fc|afc|ac|sc|cf|fk|sk|nk|cd|ud|us|as|if|bk|sv)$/i;

export function oppCode(name) {
  // Tokens must START with a letter. CLUB_FIXTURES bakes the venue into the name — "FC
  // Iberia 1999 (a)" — and a looser test counted "(a)" as a word, giving "I(": the I of
  // Iberia and the bracket of the venue tag. The founding year goes the same way.
  const words = String(name).split(/\s+/).filter((w) => /^[a-z]/i.test(w) && !CLUB_TYPE.test(w));
  if (!words.length) return String(name).replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  const first = words[0];
  // Already an abbreviation in the source — HJK, RFS — so leave it alone.
  if (first === first.toUpperCase() && first.length <= 4) return first;
  // One meaningful word: take three letters (Iberia → IBE). Several: take initials
  // (Red Star Belgrade → RSB, Tre Fiori → TF, Nõmme Kalju → NK).
  if (words.length === 1) return first.slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 3);
}
