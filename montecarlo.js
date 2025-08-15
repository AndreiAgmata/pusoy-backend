// src/montecarlo.js
const RANK_ORDER = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function runFastMonteCarlo(myCards, iterations) {
  if (myCards.length !== 13) throw new Error("Provide 13 cards");

  // Auto-win detection
  const autoWin = detectAutoWin(myCards);
  if (autoWin) {
    return {
      iterations,
      winRate: 1,
      autoWin: autoWin.type,
      front: myCards.slice(0, 3),
      middle: myCards.slice(3, 8),
      back: myCards.slice(8, 13),
    };
  }

  // Generate valid splits
  const validSplits = generateValidSplits(myCards);

  if (!validSplits.length) throw new Error("No valid splits found");

  // --- SAMPLE TOP SPLITS using heuristic ---
  const TOP_SPLITS = 50;
  const rankedSplits = validSplits
    .map((split) => ({ split, score: heuristicSplitScore(split) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_SPLITS);

  let bestSplit = null;
  let bestWinRate = -1;

  // --- Approximate Monte Carlo ---
  for (const { split } of rankedSplits) {
    let wins = 0;
    const deck = generateDeck().filter((c) => !myCards.includes(c));

    for (let i = 0; i < iterations; i++) {
      const dealerSample = sampleDealerHands(deck);
      if (compareSplit(split, dealerSample)) wins++;
    }

    const winRate = wins / iterations;
    if (winRate > bestWinRate) {
      bestWinRate = winRate;
      bestSplit = split;
    }
  }

  return {
    iterations,
    winRate: bestWinRate,
    front: bestSplit.front,
    middle: bestSplit.middle,
    back: bestSplit.back,
  };
}

// --- Quick heuristic: sum of hand scores ---
function heuristicSplitScore(split) {
  return (
    compareHand(split.front) +
    compareHand(split.middle) +
    compareHand(split.back)
  );
}

// --- Sample dealer hands approximately ---
function sampleDealerHands(deck) {
  const shuffled = shuffle(deck);
  const front = shuffled.slice(0, 3);
  const middle = shuffled.slice(3, 8);
  const back = shuffled.slice(8, 13);
  return { front, middle, back };
}

// --- Compare splits: player wins all 3 hands? ---
function compareSplit(player, dealer) {
  const f = compareHand(player.front) > compareHand(dealer.front);
  const m = compareHand(player.middle) > compareHand(dealer.middle);
  const b = compareHand(player.back) > compareHand(dealer.back);
  return f && m && b; // ties go to dealer
}

// --- Deck and shuffle ---
function generateDeck() {
  const suits = ["H", "D", "C", "S"];
  const ranks = Object.keys(RANK_ORDER);
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(r + s);
  return deck;
}
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Auto-win detection ---
function detectAutoWin(cards) {
  const ranks = cards.map((c) => c[0]);
  const suits = cards.map((c) => c[1]);

  // Quads
  const counts = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  for (let r in counts) if (counts[r] === 4) return { type: "Quads" };

  // Straight flush
  const suitGroups = {};
  cards.forEach((c) => {
    const s = c[1];
    if (!suitGroups[s]) suitGroups[s] = [];
    suitGroups[s].push(RANK_ORDER[c[0]]);
  });
  for (let s in suitGroups)
    if (isStraight(suitGroups[s]) && suitGroups[s].length >= 5)
      return { type: "Straight Flush" };

  return null;
}

// --- Valid splits ---
function generateValidSplits(cards) {
  const splits = [];
  const frontCombos = combinations(cards, 3);
  frontCombos.forEach((front) => {
    const remaining = cards.filter((c) => !front.includes(c));
    const middleCombos = combinations(remaining, 5);
    middleCombos.forEach((middle) => {
      const back = remaining.filter((c) => !middle.includes(c));
      if (back.length !== 5) return;
      if (
        compareHand(front) <= compareHand(middle) &&
        compareHand(middle) <= compareHand(back)
      ) {
        splits.push({ front, middle, back });
      }
    });
  });
  return splits;
}

// --- Hand evaluation ---
function compareHand(hand) {
  if (hand.length === 3) return evalThree(hand);
  return evalFive(hand);
}

function evalThree(hand) {
  const ranks = hand.map((c) => RANK_ORDER[c[0]]);
  const counts = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  if (Object.values(counts).includes(3)) return 3000 + Math.max(...ranks);
  if (Object.values(counts).includes(2)) return 2000 + Math.max(...ranks);
  return Math.max(...ranks);
}

function evalFive(hand) {
  const ranks = hand.map((c) => RANK_ORDER[c[0]]).sort((a, b) => b - a);
  const suits = hand.map((c) => c[1]);
  const counts = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const countVals = Object.values(counts).sort((a, b) => b - a);
  const uniqueRanks = Object.keys(counts)
    .map(Number)
    .sort((a, b) => b - a);
  const isFlush = new Set(suits).size === 1;
  const isStraightHand = isStraight(ranks);

  if (isFlush && isStraightHand) return 9000 + Math.max(...ranks);
  if (countVals[0] === 4) return 8000 + uniqueRanks[0];
  if (countVals[0] === 3 && countVals[1] === 2) return 7000 + uniqueRanks[0];
  if (isFlush) return 6000 + Math.max(...ranks);
  if (isStraightHand) return 5000 + Math.max(...ranks);
  if (countVals[0] === 3) return 4000 + uniqueRanks[0];
  if (countVals[0] === 2 && countVals[1] === 2) return 3000 + uniqueRanks[0];
  if (countVals[0] === 2) return 2000 + uniqueRanks[0];
  return Math.max(...ranks);
}

function isStraight(ranks) {
  const r = [...new Set(ranks)].sort((a, b) => a - b);
  for (let i = 0; i <= r.length - 5; i++) {
    if (
      r[i] + 1 === r[i + 1] &&
      r[i] + 2 === r[i + 2] &&
      r[i] + 3 === r[i + 3] &&
      r[i] + 4 === r[i + 4]
    )
      return true;
  }
  // A2345
  if (
    r.includes(14) &&
    r.includes(2) &&
    r.includes(3) &&
    r.includes(4) &&
    r.includes(5)
  )
    return true;
  return false;
}

// --- Combinations ---
function combinations(array, k) {
  const results = [];
  const combo = [];
  function backtrack(start, depth) {
    if (depth === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      backtrack(i + 1, depth + 1);
      combo.pop();
    }
  }
  backtrack(0, 0);
  return results;
}
