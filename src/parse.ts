import { aisleFor, artFor } from './seed'

export type ParsedItem = {
  title: string
  amount: string
  qty: number
  art: string
  /** Which aisle it sits in — see AISLES. */
  category: string
}

/**
 * Turns what someone types into the search field into an item.
 * "2 rose lemonade 250ml" → 2 × "Rose lemonade", 250ml.
 */
/** "5litre" → "5l", "2 Liters" → "2l", "500 grams" → "500g": one way of writing each unit. */
const tidyAmount = (raw: string) =>
  raw
    .replace(/\s/g, '')
    .toLowerCase()
    .replace(/(litres?|liters?|ltrs?)$/, 'l')
    .replace(/grams?$/, 'g')
    .replace(/lbs?$/, 'lb')
    .replace(/packs$/, 'pack')

export function parseItemInput(raw: string): ParsedItem {
  // "250ml", "1.5 l", "5litre", "2 liters", "500 g", "6 pack"…
  const amountMatch = raw.match(
    /(\d+(?:[.,]\d+)?\s?(?:ml|cl|litres?|liters?|ltrs?|l|kg|g|grams?|oz|lbs?|pcs|packs?))\b/i,
  )
  // A leading number is a count — unless it's the start of a size ("2 liters milk").
  const sizeFirst = amountMatch?.index === raw.search(/\S/)
  const qtyMatch = sizeFirst ? null : raw.match(/^\s*(\d{1,2})\s+/)
  const stripped = raw
    .replace(qtyMatch?.[0] ?? '', '')
    .replace(amountMatch?.[0] ?? '', '')
    .trim()
    .replace(/\s+/g, ' ')
  const title = stripped.charAt(0).toUpperCase() + stripped.slice(1)

  return {
    title: title || 'New item',
    // No size typed means no size shown — "1 pc" on every card was noise.
    amount: amountMatch ? tidyAmount(amountMatch[1]) : '',
    qty: qtyMatch ? Math.min(99, Math.max(1, Number(qtyMatch[1]))) : 1,
    art: artFor(title),
    category: aisleFor(title),
  }
}
