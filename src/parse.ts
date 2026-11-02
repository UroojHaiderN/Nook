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
export function parseItemInput(raw: string): ParsedItem {
  const qtyMatch = raw.match(/^\s*(\d{1,2})\s+/)
  const amountMatch = raw.match(/(\d+\s?(?:ml|l|g|kg|pcs|pack))\b/i)
  const stripped = raw
    .replace(qtyMatch?.[0] ?? '', '')
    .replace(amountMatch?.[0] ?? '', '')
    .trim()
    .replace(/\s+/g, ' ')
  const title = stripped.charAt(0).toUpperCase() + stripped.slice(1)

  return {
    title: title || 'New item',
    // No size typed means no size shown — "1 pc" on every card was noise.
    amount: amountMatch?.[1]?.replace(/\s/g, '') ?? '',
    qty: qtyMatch ? Math.min(99, Math.max(1, Number(qtyMatch[1]))) : 1,
    art: artFor(title),
    category: aisleFor(title),
  }
}
