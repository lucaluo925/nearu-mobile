/**
 * Intent parser — ported directly from the NearU web app.
 * Pure TypeScript, no platform dependencies. Works identically on iOS.
 */

export interface ParsedIntent {
  categories:  string[]
  tags:        string[]
  exclusions:  string[]
  time:        'today' | 'tomorrow' | 'this-week' | null
  budget:      'free' | null
  region:      'on-campus' | 'davis' | 'sacramento' | null
  vibes:       string[]
  matched:     boolean
}

const VIBE_TAGS: Record<string, string[]> = {
  chill:     ['outdoor', 'study-spot', 'coffee', 'quiet', 'cafe', 'peaceful'],
  quiet:     ['study-spot', 'library', 'coffee', 'quiet', 'cafe'],
  social:    ['social-party', 'student-friendly', 'bar', 'live-music', 'club'],
  fun:       ['social-party', 'student-friendly', 'live-music', 'sports', 'comedy'],
  outdoorsy: ['outdoor', 'park', 'trail', 'hiking', 'nature', 'campus'],
  romantic:  ['cafe', 'fine-dining', 'outdoor', 'date', 'wine'],
  cozy:      ['cafe', 'coffee', 'indoor', 'quiet', 'warm'],
  active:    ['sports', 'outdoor', 'hiking', 'fitness', 'rec'],
  artsy:     ['art', 'gallery', 'music', 'theatre', 'culture'],
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  food: 'food', eat: 'food', eating: 'food', restaurant: 'food',
  restaurants: 'food', drink: 'food', drinks: 'food', coffee: 'food',
  cafe: 'food', cafes: 'food', boba: 'food', pizza: 'food',
  burger: 'food', tacos: 'food', ramen: 'food', sushi: 'food',
  lunch: 'food', dinner: 'food', brunch: 'food', breakfast: 'food',
  snack: 'food', snacks: 'food',
  event: 'events', events: 'events', concert: 'events', show: 'events',
  shows: 'events', performance: 'events', party: 'events', parties: 'events',
  festival: 'events', game: 'events', games: 'events',
  outdoor: 'outdoor', outdoors: 'outdoor', outside: 'outdoor', nature: 'outdoor',
  park: 'outdoor', parks: 'outdoor', hike: 'outdoor', hiking: 'outdoor',
  trail: 'outdoor', trails: 'outdoor',
  study: 'study', studying: 'study', library: 'study', workspace: 'study',
  workspaces: 'study',
  shop: 'shopping', shopping: 'shopping', store: 'shopping', stores: 'shopping',
  market: 'shopping',
  campus: 'campus',
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseIntent(input: string): ParsedIntent {
  const text   = normalize(input)
  const words  = text.split(' ').filter(Boolean)
  const phrase = ` ${text} `

  const result: ParsedIntent = {
    categories: [], tags: [], exclusions: [],
    time: null, budget: null, region: null, vibes: [], matched: false,
  }

  // Exclusions
  const exclusionRe = /\b(?:not|no|without|except|avoid|skip)\s+(\w+)/g
  let em: RegExpExecArray | null
  while ((em = exclusionRe.exec(text)) !== null) {
    const excl = CATEGORY_KEYWORDS[em[1]]
    if (excl && !result.exclusions.includes(excl)) result.exclusions.push(excl)
  }

  // Time (most specific first)
  if      (/\btonight\b|\btoday\b/.test(phrase))                                  result.time = 'today'
  else if (/\btomorrow\b|\btmr\b|\bnext\s+day\b/.test(phrase))                    result.time = 'tomorrow'
  else if (/\bthis\s+weekend\b|\bweekend\b|\bsaturday\b|\bsunday\b/.test(phrase)) result.time = 'this-week'
  else if (/\bthis\s+week\b|\bsoon\b|\bupcoming\b/.test(phrase))                  result.time = 'this-week'

  // Budget
  if (/\bfree\b/.test(phrase)) result.budget = 'free'

  // Location
  if      (/\bnear\s+campus\b|\bon\s+campus\b|\bon-campus\b/.test(phrase)) result.region = 'on-campus'
  else if (/\bnearby\b|\bnear\s+me\b|\bclose\b/.test(phrase))              result.region = 'on-campus'
  else if (/\bdavis\b/.test(phrase))                                        result.region = 'davis'
  else if (/\bsacramento\b|\bsac\b/.test(phrase))                           result.region = 'sacramento'

  // Vibes
  for (const [vibe, vibeTags] of Object.entries(VIBE_TAGS)) {
    if (new RegExp(`\\b${vibe}\\b`).test(phrase)) {
      if (!result.vibes.includes(vibe)) result.vibes.push(vibe)
      for (const t of vibeTags) {
        if (!result.tags.includes(t)) result.tags.push(t)
      }
    }
  }

  // Category keywords
  for (const word of words) {
    const cat = CATEGORY_KEYWORDS[word]
    if (cat && !result.exclusions.includes(cat) && !result.categories.includes(cat)) {
      result.categories.push(cat)
    }
  }

  // Budget → tag
  if (result.budget === 'free' && !result.tags.includes('free')) {
    result.tags.push('free')
  }

  result.matched =
    result.categories.length > 0 ||
    result.tags.length > 0 ||
    result.time !== null ||
    result.budget !== null ||
    result.region !== null ||
    result.vibes.length > 0

  return result
}

export function buildIntentResponse(intent: ParsedIntent, count: number): string {
  const parts: string[] = []
  if (intent.vibes.includes('chill') || intent.vibes.includes('quiet'))    parts.push('something chill')
  else if (intent.vibes.includes('cozy'))                                   parts.push('a cozy spot')
  else if (intent.vibes.includes('social') || intent.vibes.includes('fun')) parts.push('something social')
  else if (intent.vibes.includes('outdoorsy'))                              parts.push('outdoor spots')
  else if (intent.vibes.includes('romantic'))                               parts.push('something romantic')
  else if (intent.vibes.includes('artsy'))                                  parts.push('something artsy')
  else if (intent.vibes.includes('active'))                                 parts.push('something active')

  if (intent.categories.length > 0 && parts.length === 0) {
    const cat = intent.categories[0]
    parts.push(cat === 'food' ? 'food spots' : cat)
  }
  if (intent.budget === 'free')         parts.push('free')
  if (intent.time === 'today')          parts.push('tonight')
  else if (intent.time === 'tomorrow')  parts.push('tomorrow')
  else if (intent.time === 'this-week') parts.push('this weekend')
  if (intent.region === 'on-campus')    parts.push('near campus')
  else if (intent.region === 'davis')   parts.push('in Davis')

  const what = parts.length > 0 ? parts.join(', ') : 'something for you'
  const cap  = what.charAt(0).toUpperCase() + what.slice(1)
  if (count === 0) return `Looking for ${what}? Couldn't find a match 🐾`
  if (count === 1) return `${cap}? Found 1 that fits 🎯`
  return `${cap}? Found ${count} that fit 🎯`
}
