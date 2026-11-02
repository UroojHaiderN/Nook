import { spokenSeconds } from './audio'
import type { Board, Member, VoiceClip } from './types'

const DAY = 86_400_000
const now = Date.now()

const wave = (seed: number, n = 44) =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin((i + seed) * 1.7) + Math.sin((i + seed) * 0.41) * 0.9
    return Math.min(1, Math.max(0.16, Math.abs(x) * 0.55 + 0.2))
  })

/** No audio files ship with the board, so seeded notes are spoken transcripts. */
const spoken = (id: string, seed: number, transcript: string): VoiceClip => ({
  id,
  authorId: YOU.id,
  transcript,
  seconds: spokenSeconds(transcript),
  wave: wave(seed),
})

/** Every board starts with one member: whoever is holding the phone. */
export const YOU: Member = { id: 'me', name: 'You', tint: '#111113', status: 'you' }

const brunch: Board = {
  id: 'board-brunch',
  title: 'Sunday Brunch Prep',
  color: 1,
  createdAt: now - 6 * DAY,
  updatedAt: now - 2 * DAY,
  members: [YOU],
  pieces: [
    {
      id: 'p1',
      kind: 'item',
      title: 'Fentimans Rose Lemonade',
      amount: '250ml',
      qty: 3,
      done: false,
      art: 'bottle',
      category: 'Drinks',
      createdAt: now - 2 * DAY,
    },
    {
      id: 'p2',
      kind: 'note',
      label: 'Note 1',
      body: 'Check the produce section for any discounts on fresh berries, and don’t get distracted by the snack aisle!',
      color: 'mint',
      authorId: YOU.id,
      collaborators: [],
      createdAt: now - 1 * DAY,
    },
    {
      id: 'p3',
      kind: 'voice',
      createdAt: now - 1 * DAY,
      clips: [
        spoken(
          'c1',
          3,
          'Note to self before the shop. The pastries are already sorted, so skip the bakery aisle. Still need the rose lemonade and a couple of cartons of oat milk, and if the blueberries look decent, grab an extra box for the compote.',
        ),
        spoken(
          'c2',
          11,
          'Second thing. Check the dates on everything from the chilled aisle. If they are out of Greek yoghurt, skyr is completely fine. Aiming to be back by eleven.',
        ),
      ],
    },
    {
      id: 'p4',
      kind: 'item',
      title: 'Boost powder Stamina',
      amount: '500g',
      qty: 1,
      done: false,
      art: 'tin',
      category: 'Pantry',
      createdAt: now - 3 * DAY,
    },
    {
      id: 'p5',
      kind: 'item',
      title: 'Monster Drink Energy Drink',
      amount: '120ml',
      qty: 1,
      done: false,
      art: 'can',
      category: 'Drinks',
      createdAt: now - 3 * DAY,
    },
    {
      id: 'p6',
      kind: 'note',
      label: 'Note 2',
      body: 'Don’t forget to check expiration dates, especially on dairy and meat!',
      color: 'pink',
      authorId: YOU.id,
      collaborators: [],
      createdAt: now - 2 * DAY,
    },
    {
      id: 'p7',
      kind: 'item',
      title: 'Dairy Milk Chocolate',
      amount: '180g',
      qty: 2,
      done: false,
      art: 'bar',
      category: 'Snacks',
      createdAt: now - 4 * DAY,
    },
    {
      id: 'p8',
      kind: 'item',
      title: 'Greek Yoghurt',
      amount: '400g',
      qty: 1,
      done: true,
      art: 'tub',
      category: 'Dairy & eggs',
      createdAt: now - 4 * DAY,
    },
    {
      id: 'p9',
      kind: 'item',
      title: 'Fresh Blueberries',
      amount: '125g',
      qty: 2,
      done: false,
      art: 'berries',
      category: 'Produce',
      createdAt: now - 5 * DAY,
    },
    {
      id: 'p10',
      kind: 'item',
      title: 'Paper Napkins',
      amount: '50 pcs',
      qty: 1,
      done: false,
      art: 'box',
      category: 'Household',
      createdAt: now - 5 * DAY,
    },
  ],
}

const weekly: Board = {
  id: 'board-weekly',
  title: 'Weekly shop',
  color: 0,
  createdAt: now - 20 * DAY,
  updatedAt: now - 5 * 3600_000,
  members: [YOU],
  pieces: [
    {
      id: 'w1',
      kind: 'item',
      title: 'Oat milk',
      amount: '1l',
      qty: 2,
      done: false,
      art: 'box',
      category: 'Dairy & eggs',
      createdAt: now - 5 * 3600_000,
    },
    {
      id: 'w2',
      kind: 'item',
      title: 'Ground coffee',
      amount: '250g',
      qty: 1,
      done: false,
      art: 'tin',
      category: 'Pantry',
      createdAt: now - 6 * 3600_000,
    },
    {
      id: 'w3',
      kind: 'note',
      label: 'Note 1',
      body: 'The good sourdough sells out by ten on Saturdays.',
      color: 'mint',
      authorId: YOU.id,
      collaborators: [],
      createdAt: now - 2 * 3600_000,
    },
    {
      id: 'w4',
      kind: 'item',
      title: 'Washing up liquid',
      amount: '500ml',
      qty: 1,
      done: true,
      art: 'bottle',
      category: 'Household',
      createdAt: now - 2 * DAY,
    },
  ],
}

const flat: Board = {
  id: 'board-flat',
  title: 'Flat restock',
  color: 2,
  createdAt: now - 30 * DAY,
  updatedAt: now - 9 * DAY,
  members: [YOU],
  pieces: [
    {
      id: 'f1',
      kind: 'item',
      title: 'Paper towels',
      amount: '6 pcs',
      qty: 1,
      done: false,
      art: 'box',
      category: 'Household',
      createdAt: now - 9 * DAY,
    },
    {
      id: 'f2',
      kind: 'item',
      title: 'Dishwasher tablets',
      amount: '40 pcs',
      qty: 1,
      done: false,
      art: 'box',
      category: 'Household',
      createdAt: now - 9 * DAY,
    },
  ],
}

export const seedBoards: Board[] = [brunch, weekly, flat]

/*
 * Keyword matching is word-bounded on purpose: plain substrings misfire badly —
 * "chocolate" contains "cola", "steak" contains "tea".
 */
export const artFor = (title: string): string => {
  const t = title.toLowerCase()
  if (/\b(lemonade|soda|juice|wine|water|bottle|kombucha|squash)s?\b/.test(t)) return 'bottle'
  if (/\b(energy|monster|cola|coke|can|beer|cider)s?\b/.test(t)) return 'can'
  if (/\b(powder|protein|coffee|tin|oats|cocoa)s?\b/.test(t)) return 'tin'
  if (/\b(chocolate|bar|candy|sweet|snack|biscuit)s?\b/.test(t)) return 'bar'
  if (/\b(yogurt|yoghurt|skyr|butter|cream|tub)s?\b/.test(t)) return 'tub'
  if (/\b(berry|berries|fruit|grape|cherry|cherries|blueberr\w*)s?\b/.test(t)) return 'berries'
  if (/\b(napkin|tissue|box|cereal|pasta|milk|rice)s?\b/.test(t)) return 'box'
  return 'bag'
}

/**
 * Which aisle a new item probably belongs in. Word-bounded like `artFor`, and
 * ordered from the most specific rule to the least — "oat milk" is dairy, not
 * pantry, and "apple juice" is a drink, not produce.
 */
export const aisleFor = (title: string): string => {
  const t = title.toLowerCase()
  if (/\b(lemonade|soda|juice|cola|coke|water|squash|beer|cider|ale|wine|prosecco|champagne|cocktail|gin|vodka|whisky|coffee|tea|smoothie|kombucha|energy)s?\b/.test(t))
    return 'Drinks'
  if (/\b(milk|yogurt|yoghurt|skyr|cheese|butter|cream|egg|custard)s?\b/.test(t)) return 'Dairy & eggs'
  if (/\b(bread|sourdough|baguette|bagel|croissant|flatbread|pitta|wrap|cake|bun|roll|pastry|doughnut|donut)s?\b/.test(t))
    return 'Bakery'
  if (/\b(chicken|turkey|beef|steak|mince|meat|lamb|pork|bacon|ham|sausage|fish|salmon|tuna|prawn|shrimp|crab|lobster|oyster|squid|tofu)s?\b/.test(t))
    return 'Meat & fish'
  if (/\b(apple|banana|grape|strawberry|strawberries|blueberry|blueberries|berry|berries|melon|watermelon|lemon|lime|orange|satsuma|pineapple|peach|cherry|cherries|mango|pear|kiwi|avocado|broccoli|carrot|tomato|potato|onion|garlic|pepper|chilli|cucumber|lettuce|spinach|salad|greens|herb|basil|mushroom|corn|aubergine|eggplant|bean|pea|ginger|coconut|fruit|veg|vegetable)s?\b/.test(t))
    return 'Produce'
  if (/\b(chocolate|candy|sweet|cookie|biscuit|crisp|chip|popcorn|nut|peanut|snack|lollipop|cupcake)s?\b/.test(t))
    return 'Snacks'
  if (/\b(soap|sponge|detergent|washing|dishwasher|tablet|tissue|napkin|towel|toilet|broom|mop|bucket|bin|binbag|toothbrush|toothpaste|shampoo|conditioner|lotion|razor|plaster|battery|bulb|candle|match|foil|clingfilm|bleach|cleaner)s?\b/.test(t))
    return 'Household'
  if (/\b(rice|pasta|spaghetti|noodle|flour|sugar|salt|oil|vinegar|sauce|jam|honey|jar|tin|tinned|can|canned|cereal|oat|stock|soup|spice|curry|lentil)s?\b/.test(t))
    return 'Pantry'
  return 'Other'
}
