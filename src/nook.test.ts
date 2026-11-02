import { describe, expect, it } from 'vitest'
import { parseItemInput } from './parse'
import { resample, spokenSeconds } from './audio'
import { catalogIcon, resolveProductIcon } from './producticons'
import { aisleFor, artFor } from './seed'
import {
  countPieces,
  isEmail,
  nameFromEmail,
  newInviteToken,
  slugFor,
  pieceName,
  tintFor,
  TINTS,
} from './types'
import type { Piece } from './types'
import { boardToRow, rowToBoard } from './backend'

describe('parseItemInput', () => {
  it('reads sizes however they are written', () => {
    expect(parseItemInput('oat milk 5litre')).toMatchObject({ title: 'Oat milk', amount: '5l', qty: 1 })
    expect(parseItemInput('2 liters milk')).toMatchObject({ title: 'Milk', amount: '2l', qty: 1 })
    expect(parseItemInput('3 cheddar 400 grams')).toMatchObject({ title: 'Cheddar', amount: '400g', qty: 3 })
    expect(parseItemInput('juice 1.5l')).toMatchObject({ amount: '1.5l' })
  })

  it('pulls quantity, size and title out of one line', () => {
    expect(parseItemInput('2 rose lemonade 250ml')).toMatchObject({
      title: 'Rose lemonade',
      amount: '250ml',
      qty: 2,
    })
  })

  it('defaults quantity and size when they are not given', () => {
    expect(parseItemInput('sourdough')).toMatchObject({ title: 'Sourdough', amount: '', qty: 1 })
  })

  it('reads a size with a space in it', () => {
    expect(parseItemInput('flour 1 kg').amount).toBe('1kg')
  })

  it('does not treat a size at the front as a quantity', () => {
    expect(parseItemInput('500g pasta')).toMatchObject({ title: 'Pasta', amount: '500g', qty: 1 })
  })

  it('never produces a nameless item', () => {
    expect(parseItemInput('   ').title).toBe('New item')
  })

  it('clamps an absurd quantity', () => {
    expect(parseItemInput('99 napkins').qty).toBe(99)
  })
})

describe('classification', () => {
  it('picks an illustration from the name', () => {
    expect(artFor('Fentimans Rose Lemonade')).toBe('bottle')
    expect(artFor('Dairy Milk Chocolate')).toBe('bar')
    expect(artFor('something unheard of')).toBe('bag')
  })

  it('does not match keywords buried inside other words', () => {
    // "chocolate" contains "cola", "steak" contains "tea"
    expect(artFor('Dairy Milk Chocolate')).not.toBe('can')
    expect(aisleFor('Ribeye steak')).toBe('Meat & fish')
  })

  it('files items in the aisle they are actually found in', () => {
    expect(aisleFor('Cold brew coffee')).toBe('Drinks')
    expect(aisleFor('Oat milk')).toBe('Dairy & eggs')
    expect(aisleFor('Sourdough bread')).toBe('Bakery')
    expect(aisleFor('Chicken thighs')).toBe('Meat & fish')
    expect(aisleFor('Fresh blueberries')).toBe('Produce')
    expect(aisleFor('Dishwasher tablets')).toBe('Household')
    expect(aisleFor('Basmati rice')).toBe('Pantry')
    expect(aisleFor('Dark chocolate')).toBe('Snacks')
  })

  it('puts an unknown thing in Other rather than guessing', () => {
    expect(aisleFor('zzqq widget')).toBe('Other')
  })

  it('reads the whole name, so a drink beats the fruit in it', () => {
    // "apple juice" is a drink; "apple" alone is produce.
    expect(aisleFor('Apple juice')).toBe('Drinks')
    expect(aisleFor('Apples')).toBe('Produce')
  })
})

describe('voice helpers', () => {
  it('estimates read-aloud length from word count', () => {
    expect(spokenSeconds('one two three four five six seven eight nine ten')).toBe(4)
    expect(spokenSeconds('hi')).toBeGreaterThanOrEqual(2)
  })

  it('squeezes any number of level samples into a fixed bar count', () => {
    const bars = resample(Array.from({ length: 500 }, (_, i) => (i % 10) / 10), 44)
    expect(bars).toHaveLength(44)
    expect(bars.every((b) => b >= 0.16 && b <= 1)).toBe(true)
  })

  it('still returns bars when nothing was sampled', () => {
    expect(resample([], 44)).toHaveLength(44)
  })
})

describe('board counting', () => {
  const pieces: Piece[] = [
    {
      id: 'a',
      kind: 'item',
      title: 'Lemonade',
      amount: '250ml',
      qty: 3,
      done: false,
      art: 'bottle',
      category: 'Drinks',
      createdAt: 0,
    },
    {
      id: 'b',
      kind: 'note',
      label: 'Note 1',
      body: '',
      color: 'amber',
      authorId: 'me',
      collaborators: [],
      createdAt: 0,
    },
    {
      id: 'c',
      kind: 'voice',
      createdAt: 0,
      clips: [
        { id: 'c1', authorId: 'me', seconds: 4, wave: [] },
        { id: 'c2', authorId: 'me', seconds: 5, wave: [] },
      ],
    },
  ]

  it('counts quantities and each clip, not just cards', () => {
    expect(countPieces(pieces)).toBe(6)
  })

  it('names every kind of piece', () => {
    expect(pieces.map(pieceName)).toEqual(['Lemonade', 'Note 1', 'Voice note'])
  })
})

describe('people', () => {
  it('knows an address when it sees one', () => {
    expect(isEmail('a@b.co')).toBe(true)
    expect(isEmail('a@b.c')).toBe(false)
    expect(nameFromEmail('ana.gomez99@work.com')).toBe('Ana Gomez')
  })

  it('gives the same person the same colour every time', () => {
    expect(tintFor('ana.gomez@work.com')).toBe(tintFor('ana.gomez@work.com'))
    expect(TINTS).toContain(tintFor('whoever'))
  })
})

describe('sharing by link', () => {
  const row = {
    id: 'board-a',
    owner: 'u1',
    owner_email: 'ana@work.com',
    invite_token: 'secret',
    title: 'Weekly shop',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    data: { pieces: [], members: [], color: 2 },
    board_members: [
      { email: 'Sam@Work.com', user_id: 'u2', invited_at: '2026-09-03T00:00:00Z' },
      { email: 'old@invite.com', user_id: null, invited_at: '2026-09-03T00:00:00Z' },
    ],
  }

  it('keeps who owns a board, so a member saving it cannot take it over', () => {
    const board = rowToBoard(row)
    expect(board.owner).toBe('u1')
    expect(boardToRow(board, board.owner!).owner).toBe('u1')
  })

  it('lists only people who actually joined', () => {
    expect(rowToBoard(row).joined).toEqual([
      { email: 'sam@work.com', userId: 'u2', at: Date.parse('2026-09-03T00:00:00Z') },
    ])
  })

  it('never writes membership or the owner’s address back from a device', () => {
    const out = boardToRow(rowToBoard(row), 'u1') as Record<string, unknown>
    expect(out).not.toHaveProperty('board_members')
    expect(out).not.toHaveProperty('owner_email')
    expect(out.invite_token).toBe('secret')
    expect((out.data as { color: number }).color).toBe(2)
  })

  it('puts the board’s name in the link, readably', () => {
    expect(slugFor('Sunday Brunch Prep')).toBe('sunday-brunch-prep')
    expect(slugFor('  Café & Co!! ')).toBe('cafe-co')
    expect(slugFor('🎉')).toBe('')
    expect(slugFor('a'.repeat(40)).length).toBeLessThanOrEqual(28)
  })

  it('makes link codes that are short and unguessable', () => {
    const a = newInviteToken()
    expect(a).toMatch(/^[a-z0-9]{12}$/)
    expect(newInviteToken()).not.toBe(a)
  })
})

describe('product icons', () => {
  it('matches the most specific word, reading right to left', () => {
    expect(catalogIcon('organic oat milk')).toBe('glass-of-milk')
    expect(catalogIcon('Dairy Milk Chocolate')).toBe('chocolate-bar')
    expect(catalogIcon('Fresh blueberries')).toBe('blueberries')
  })

  it('covers household things, not just food', () => {
    expect(catalogIcon('Dishwasher tablets')).toBe('bubbles')
    expect(catalogIcon('AA batteries')).toBe('battery')
    expect(catalogIcon('Paper napkins')).toBe('roll-of-paper')
  })

  it('returns nothing rather than a bad guess', () => {
    expect(catalogIcon('zzqq widget')).toBeNull()
    expect(catalogIcon('')).toBeNull()
  })

  it('ignores short filler words', () => {
    expect(catalogIcon('a of the')).toBeNull()
  })

  it('falls back to the drawn art when the network is gone, without throwing', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch
    try {
      await expect(resolveProductIcon('fresh carrots')).resolves.toBeNull()
      await expect(resolveProductIcon('zzqq offline widget')).resolves.toBeNull()
    } finally {
      globalThis.fetch = original
    }
  })
})
