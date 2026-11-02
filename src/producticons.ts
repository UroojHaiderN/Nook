/**
 * Product icons, fetched from the Iconify API.
 *
 * Set: Fluent Emoji Flat (Microsoft, MIT). Iconify serves it free with no key.
 * Three rules keep this from becoming a liability:
 *   1. Everything is cached in localStorage, so an icon is fetched once, ever.
 *   2. A miss is cached too — an unmatched item never asks twice.
 *   3. Any failure (offline, rate limit, no match) falls back to the drawn art,
 *      so the grid never waits on the network and never shows a hole.
 */

const API = 'https://api.iconify.design'
const SET = 'fluent-emoji-flat'
const NAME_CACHE = 'nook.icons.names.v1'
const SVG_CACHE = 'nook.icons.svg.v1'
const MAX_CACHED_SVGS = 150

/** Word → icon name. Every value was checked against the set's real name list. */
const CATALOG: Record<string, string> = {
  ale: 'beer-mug',
  apple: 'red-apple',
  apples: 'red-apple',
  aubergine: 'eggplant',
  avocado: 'avocado',
  avocados: 'avocado',
  bacon: 'bacon',
  bag: 'shopping-bags',
  bagel: 'bagel',
  bagels: 'bagel',
  bags: 'shopping-bags',
  baguette: 'baguette-bread',
  balloon: 'balloon',
  balloons: 'balloon',
  banana: 'banana',
  bananas: 'banana',
  bandages: 'adhesive-bandage',
  basil: 'herb',
  basket: 'basket',
  batteries: 'battery',
  battery: 'battery',
  beans: 'beans',
  beef: 'cut-of-meat',
  beer: 'beer-mug',
  beers: 'beer-mug',
  berries: 'blueberries',
  bin: 'wastebasket',
  binbags: 'wastebasket',
  birdseed: 'bird',
  biscuits: 'cookie',
  blueberries: 'blueberries',
  book: 'closed-book',
  books: 'books',
  box: 'package',
  bread: 'bread',
  broccoli: 'broccoli',
  broom: 'broom',
  bubbles: 'bubbles',
  bucket: 'bucket',
  bulb: 'light-bulb',
  bulbs: 'light-bulb',
  butter: 'butter',
  cake: 'birthday-cake',
  candle: 'candle',
  candles: 'candle',
  candy: 'candy',
  canned: 'canned-food',
  card: 'envelope',
  cards: 'envelope',
  carrot: 'carrot',
  carrots: 'carrot',
  cat: 'cat',
  catfood: 'cat',
  champagne: 'bottle-with-popping-cork',
  cheese: 'cheese-wedge',
  cherries: 'cherries',
  chestnuts: 'chestnut',
  chicken: 'poultry-leg',
  chilli: 'hot-pepper',
  chillies: 'hot-pepper',
  chocolate: 'chocolate-bar',
  chopsticks: 'chopsticks',
  cider: 'beer-mug',
  clothes: 't-shirt',
  cocktail: 'cocktail-glass',
  coconut: 'coconut',
  coffee: 'hot-beverage',
  cola: 'cup-with-straw',
  conditioner: 'lotion-bottle',
  confetti: 'confetti-ball',
  cookie: 'cookie',
  cookies: 'cookie',
  corn: 'ear-of-corn',
  crab: 'crab',
  cream: 'glass-of-milk',
  crisps: 'popcorn',
  croissant: 'croissant',
  croissants: 'croissant',
  cucumber: 'cucumber',
  cupcake: 'cupcake',
  cupcakes: 'cupcake',
  cups: 'cup-with-straw',
  curry: 'curry-rice',
  custard: 'custard',
  cutlery: 'fork-and-knife',
  detergent: 'bubbles',
  dishwasher: 'bubbles',
  dog: 'dog',
  donuts: 'doughnut',
  doughnut: 'doughnut',
  drink: 'cup-with-straw',
  drinks: 'cup-with-straw',
  dumplings: 'dumpling',
  egg: 'egg',
  eggplant: 'eggplant',
  eggs: 'egg',
  falafel: 'falafel',
  fish: 'fish',
  flatbread: 'flatbread',
  flour: 'salt',
  flowers: 'bouquet',
  formula: 'baby-bottle',
  garlic: 'garlic',
  gift: 'wrapped-gift',
  gin: 'tumbler-glass',
  ginger: 'ginger-root',
  glasses: 'glasses',
  gloves: 'gloves',
  grapes: 'grapes',
  greens: 'leafy-green',
  ham: 'bacon',
  handwash: 'soap',
  herbs: 'herb',
  honey: 'honey-pot',
  honeyjar: 'jar',
  ice: 'ice',
  jam: 'jar',
  jar: 'jar',
  juice: 'beverage-box',
  key: 'key',
  keys: 'key',
  kitchenroll: 'roll-of-paper',
  kiwi: 'kiwi-fruit',
  lamb: 'meat-on-bone',
  lemon: 'lemon',
  lemonade: 'cup-with-straw',
  lemons: 'lemon',
  lettuce: 'leafy-green',
  lime: 'lime',
  limes: 'lime',
  lobster: 'lobster',
  lollipop: 'lollipop',
  lotion: 'lotion-bottle',
  mango: 'mango',
  matches: 'candle',
  meat: 'cut-of-meat',
  medicine: 'pill',
  melon: 'melon',
  milk: 'glass-of-milk',
  mince: 'cut-of-meat',
  moisturiser: 'lotion-bottle',
  mop: 'broom',
  mushroom: 'mushroom',
  mushrooms: 'mushroom',
  napkins: 'roll-of-paper',
  newspaper: 'newspaper',
  noodles: 'steaming-bowl',
  notebook: 'notebook',
  notepad: 'spiral-notepad',
  nuts: 'peanuts',
  oil: 'olive',
  olives: 'olive',
  onion: 'onion',
  onions: 'onion',
  orange: 'tangerine',
  oranges: 'tangerine',
  oysters: 'oyster',
  pancakes: 'pancakes',
  paracetamol: 'pill',
  party: 'party-popper',
  pasta: 'spaghetti',
  peach: 'peach',
  peaches: 'peach',
  peanuts: 'peanuts',
  pear: 'pear',
  pears: 'pear',
  peas: 'pea-pod',
  pen: 'pen',
  pencil: 'pencil',
  pens: 'pen',
  pepper: 'bell-pepper',
  peppers: 'bell-pepper',
  pickles: 'jar',
  pie: 'pie',
  pills: 'pill',
  pineapple: 'pineapple',
  pitta: 'flatbread',
  plant: 'potted-plant',
  plasters: 'adhesive-bandage',
  plates: 'fork-and-knife-with-plate',
  popcorn: 'popcorn',
  potato: 'potato',
  potatoes: 'potato',
  prawns: 'shrimp',
  present: 'wrapped-gift',
  pretzel: 'pretzel',
  prosecco: 'bottle-with-popping-cork',
  ramen: 'steaming-bowl',
  raspberries: 'blueberries',
  razor: 'razor',
  razors: 'razor',
  ribbon: 'ribbon',
  ribs: 'meat-on-bone',
  rice: 'cooked-rice',
  roses: 'rose',
  sake: 'sake',
  salad: 'green-salad',
  salmon: 'fish',
  salt: 'salt',
  satsumas: 'tangerine',
  sauce: 'jar',
  scarf: 'scarf',
  scissors: 'scissors',
  seedlings: 'seedling',
  shampoo: 'lotion-bottle',
  shirt: 't-shirt',
  shortcake: 'shortcake',
  shower: 'shower',
  shrimp: 'shrimp',
  skyr: 'glass-of-milk',
  smoothie: 'cup-with-straw',
  soap: 'soap',
  socks: 'socks',
  soda: 'cup-with-straw',
  soup: 'pot-of-food',
  sourdough: 'bread',
  spaghetti: 'spaghetti',
  spinach: 'leafy-green',
  sponge: 'sponge',
  sponges: 'sponge',
  spoons: 'spoon',
  squash: 'cup-with-straw',
  squid: 'squid',
  stamps: 'envelope',
  steak: 'cut-of-meat',
  stock: 'pot-of-food',
  strawberries: 'strawberry',
  strawberry: 'strawberry',
  sugar: 'salt',
  sunflowers: 'sunflower',
  sunglasses: 'sunglasses',
  sushi: 'sushi',
  sweetcorn: 'ear-of-corn',
  sweets: 'candy',
  tablets: 'bubbles',
  takeaway: 'takeout-box',
  tape: 'adhesive-bandage',
  tea: 'teacup-without-handle',
  teabags: 'teapot',
  teapot: 'teapot',
  tin: 'canned-food',
  tinned: 'canned-food',
  tins: 'canned-food',
  tissues: 'roll-of-paper',
  tofu: 'beans',
  toilet: 'roll-of-paper',
  tomato: 'tomato',
  tomatoes: 'tomato',
  toothbrush: 'toothbrush',
  toothpaste: 'toothbrush',
  towels: 'roll-of-paper',
  trolley: 'shopping-cart',
  tulips: 'tulip',
  tuna: 'canned-food',
  turkey: 'poultry-leg',
  vitamins: 'pill',
  vodka: 'tumbler-glass',
  waffles: 'waffle',
  washing: 'bubbles',
  water: 'cup-with-straw',
  watermelon: 'watermelon',
  whisky: 'tumbler-glass',
  wine: 'wine-glass',
  wrap: 'flatbread',
  wraps: 'flatbread',
  yoghurt: 'glass-of-milk',
  yogurt: 'glass-of-milk',
}

/*
 * One shared copy of each cache in memory. Several cards resolve at once, so
 * read-modify-write against localStorage would let the last writer erase the
 * others' entries.
 */
const load = (key: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}')
  } catch {
    return {}
  }
}

const memory: Record<string, Record<string, string>> = {
  [NAME_CACHE]: load(NAME_CACHE),
  [SVG_CACHE]: load(SVG_CACHE),
}

const persist = (key: string) => {
  try {
    localStorage.setItem(key, JSON.stringify(memory[key]))
  } catch {
    /* storage full or blocked — icons are optional, carry on */
  }
}

const remember = (key: string, field: string, value: string) => {
  if (key === SVG_CACHE && Object.keys(memory[key]).length >= MAX_CACHED_SVGS)
    memory[key] = {}
  memory[key][field] = value
  persist(key)
}

const words = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)

/** Catalog match, last word first: "organic oat milk" should find the milk. */
export function catalogIcon(title: string): string | null {
  const parts = words(title)
  for (const w of [...parts].reverse()) if (CATALOG[w]) return CATALOG[w]
  return null
}

const inFlight = new Map<string, Promise<string | null>>()

const get = async (url: string, signal?: AbortSignal) => {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(String(res.status))
  return res
}

/** Ask Iconify for the closest icon to a word we do not have in the catalog. */
async function searchIcon(title: string): Promise<string | null> {
  const parts = words(title)
  if (!parts.length) return null
  const term = parts[parts.length - 1]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await get(
      `${API}/search?query=${encodeURIComponent(term)}&prefix=${SET}&limit=1`,
      controller.signal,
    )
    const data = (await res.json()) as { icons?: string[] }
    return data.icons?.[0]?.split(':')[1] ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchSvg(name: string): Promise<string | null> {
  const cached = memory[SVG_CACHE][name]
  if (cached) return cached
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await get(`${API}/${SET}/${name}.svg?height=128`, controller.signal)
    const svg = await res.text()
    if (!svg.startsWith('<svg')) return null
    remember(SVG_CACHE, name, svg)
    return svg
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve an item title to a ready-to-render image, or null to use the drawing.
 * The SVG goes in an <img>, which cannot run scripts — third-party markup never
 * touches the document.
 */
export function resolveProductIcon(title: string): Promise<string | null> {
  const key = title.trim().toLowerCase()
  if (!key) return Promise.resolve(null)

  const existing = inFlight.get(key)
  if (existing) return existing

  const job = (async () => {
    let name: string | null | undefined = memory[NAME_CACHE][key]

    if (name === undefined) {
      name = catalogIcon(title) ?? (await searchIcon(title))
      remember(NAME_CACHE, key, name ?? '')
    }
    if (!name) return null

    const svg = await fetchSvg(name)
    return svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : null
  })()

  inFlight.set(key, job)
  return job
}

/** Whatever is already cached, for a first paint with no flicker. */
export function cachedProductIcon(title: string): string | null {
  const name = memory[NAME_CACHE][title.trim().toLowerCase()]
  if (!name) return null
  const svg = memory[SVG_CACHE][name]
  return svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : null
}
