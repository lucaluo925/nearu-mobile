// Ported from the NearU web app — single source of truth for data shapes.

export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'flagged'

export interface Item {
  id:              string
  title:           string
  category:        string
  subcategory:     string
  description?:    string
  location_name?:  string
  address:         string
  city?:           string
  region?:         string
  latitude?:       number
  longitude?:      number
  start_time?:     string
  end_time?:       string
  external_link?:  string
  flyer_image_url?: string
  source:          string
  source_type?:    string
  tags:            string[]
  created_at:      string
  status?:         ItemStatus
  // Computed at query time
  avg_rating?:     number | null
  review_count?:   number
  distance_miles?: number
  // Food enrichment
  menu_link?:      string | null
  known_for?:      string[] | null
}

export interface ItemWithDistance extends Item {
  distance_miles?: number
}

export type SortMode = 'upcoming' | 'nearest' | 'newest' | 'top-rated' | 'popular'
export type TimeFilter = 'today' | 'tomorrow' | 'this-week' | null

/** UC Davis center coordinates */
export const UC_DAVIS_LAT = 38.5382
export const UC_DAVIS_LNG = -121.7617

export const CATEGORY_LABELS: Record<string, string> = {
  food:     'Food & Drink',
  events:   'Events',
  outdoor:  'Outdoor',
  study:    'Study',
  shopping: 'Shopping',
  campus:   'Campus',
}

export const CATEGORY_EMOJI: Record<string, string> = {
  food:     '🍜',
  events:   '🎉',
  outdoor:  '🌿',
  study:    '📚',
  shopping: '🛍️',
  campus:   '🏫',
}

// ── Pet types (ported from lib/pet.ts) ───────────────────────────────────────

export const PET_TYPES = [
  'dog', 'cat', 'bird', 'fox', 'bunny',
  'frog', 'panda', 'monkey', 'tiger',
] as const
export type PetType = (typeof PET_TYPES)[number]

export const PET_EMOJI: Record<PetType, string> = {
  dog:    '🐶',
  cat:    '🐱',
  bird:   '🐦',
  fox:    '🦊',
  bunny:  '🐰',
  frog:   '🐸',
  panda:  '🐼',
  monkey: '🐵',
  tiger:  '🐯',
}

export type PetMood = 'idle' | 'happy' | 'excited'
export const EGG_PRICE = 40

export function computeLevel(xp: number): number {
  if (xp >= 50) return 3
  if (xp >= 20) return 2
  return 1
}

export function computeMood(lastActionAt: string | null | undefined): PetMood {
  if (!lastActionAt) return 'idle'
  const diffH = (Date.now() - new Date(lastActionAt).getTime()) / 3_600_000
  if (diffH < 1)  return 'excited'
  if (diffH < 24) return 'happy'
  return 'idle'
}

export interface LevelProgress {
  current: number
  needed:  number
  pct:     number
  maxed:   boolean
}

export function levelProgress(xp: number): LevelProgress {
  const level = computeLevel(xp)
  if (level >= 3) return { current: xp - 50, needed: 0, pct: 100, maxed: true }
  if (level === 2) {
    const done = xp - 20
    return { current: done, needed: 30, pct: Math.round((done / 30) * 100), maxed: false }
  }
  return { current: xp, needed: 20, pct: Math.round((xp / 20) * 100), maxed: false }
}
