/**
 * QuestionSpace — expedition content & map data.
 *
 * The model is deliberately a little larger than the demo:
 *  - `topic` groups questions into chart regions (constellations).
 *  - `map` coordinates are in the star-map's 1000×1000 viewBox space.
 *  - `hintCost` is fuel, not health. A wrong answer never removes fuel.
 *  - every question is a node; nodes that are answered wrong become
 *    "unexplored" and can be revisited in a later pass.
 */

export type TopicId = 'messenger' | 'daedalus' | 'hubble' | 'galileo'
export type ChoiceId = 'a' | 'b' | 'c' | 'd'
export type Difficulty = 1 | 2 | 3
export type CrewId = 'pip' | 'bolt' | 'vela' | 'moss'
export type RouteKind = 'safe' | 'risky'

export interface Topic {
  id: TopicId
  /** Name of the chart region, after a mission or instrument. */
  name: string
  /** The discipline the region surveys. */
  discipline: string
  /** One line used in the briefing. */
  blurb: string
  /** Pale hue used for the region's chart marks. Never used alone to mean anything. */
  hue: string
  /** Survey sector drawn around the region's stars, in map units. */
  sector: { x: number; y: number; radius: number }
  /** Where the region's label sits, in map units. */
  labelAt: { x: number; y: number }
}

export interface Choice {
  id: ChoiceId
  label: string
}

export interface Question {
  id: string
  topicId: TopicId
  /** Destination the node is named for. */
  destination: string
  /** Short instrument-style kicker, e.g. "ORBITAL DECAY". */
  tag: string
  difficulty: Difficulty
  prompt: string
  choices: Choice[]
  correctChoiceId: ChoiceId
  /** Shown only after answering. */
  explanation: string
  /** A nudge, not the answer. Bought with fuel. */
  hint: string
  hintCost: number
  /** Position on the chart (1000×1000 viewBox). */
  map: { x: number; y: number }
}

export interface Expedition {
  id: string
  sheet: string
  title: string
  subtitle: string
  startFuel: number
  maxFuel: number
  /** Every third node charted salvages one fuel cell. */
  salvageEvery: number
  maxSalvage: number
  /** Question ids in flight order. Interleaved so the whole chart fills at once. */
  itinerary: string[]
  /** Cursors that open a safe / risky route choice. */
  junctions: number[]
  /** Fuel price of skipping a world (it becomes an anomaly). */
  skipCost: number
  /** Fuel price of a retry after a wrong sample. */
  retryCost: number
  /** Crew aboard at launch. */
  startingCrew: CrewId[]
}

export interface CrewMember {
  id: CrewId
  name: string
  role: string
  /** Bright sticker colour, always paired with a name and a role. */
  color: string
  perk: string
  quip: string
  /** What the one-shot actually does, in player language. */
  effect: string
}

export interface RouteChoice {
  id: RouteKind
  name: string
  sub: string
  blurb: string
  color: string
  rewardFuel: number
  recruit: CrewId
}

export const TOPICS: Record<TopicId, Topic> = {
  messenger: {
    id: 'messenger',
    name: 'MESSENGER',
    discipline: 'Orbital mechanics',
    blurb: 'Gravity, decay, and the geometry of falling around a world.',
    hue: '#9BD3E6',
    sector: { x: 230, y: 300, radius: 146 },
    labelAt: { x: 230, y: 128 },
  },
  daedalus: {
    id: 'daedalus',
    name: 'DAEDALUS',
    discipline: 'Propulsion',
    blurb: 'Mass ratios, patient engines, and stolen momentum.',
    hue: '#E9C188',
    sector: { x: 770, y: 300, radius: 146 },
    labelAt: { x: 770, y: 128 },
  },
  hubble: {
    id: 'hubble',
    name: 'HUBBLE',
    discipline: 'Deep field',
    blurb: 'Lookback time, lensed light, and the expansion of everything.',
    hue: '#B4B7EA',
    sector: { x: 230, y: 730, radius: 146 },
    labelAt: { x: 230, y: 906 },
  },
  galileo: {
    id: 'galileo',
    name: 'GALILEO',
    discipline: 'Exobiology',
    blurb: 'Oceans under ice, and the chemistry that might wake in them.',
    hue: '#A8CBB6',
    sector: { x: 770, y: 730, radius: 146 },
    labelAt: { x: 770, y: 906 },
  },
}

export const CREW: Record<CrewId, CrewMember> = {
  pip: {
    id: 'pip',
    name: 'PIP',
    role: 'Navigator',
    color: '#63E6C3',
    perk: 'Slipstream',
    quip: 'Shortcut? I know a shortcut. Probably.',
    effect: 'Skip this world free. It stays on the chart as an anomaly.',
  },
  bolt: {
    id: 'bolt',
    name: 'BOLT',
    role: 'Engineer',
    color: '#FFD166',
    perk: 'Patch job',
    quip: 'Give me a wrench and a minute.',
    effect: '+2 fuel cells. No questions asked.',
  },
  vela: {
    id: 'vela',
    name: 'DR. VELA',
    role: 'Science officer',
    color: '#C0B0FF',
    perk: 'Deep scan',
    quip: 'Sample first. Panic later.',
    effect: 'Free scan: eliminate two wrong choices and reveal the hint.',
  },
  moss: {
    id: 'moss',
    name: 'MOSS',
    role: 'Medic',
    color: '#FF8D7A',
    perk: 'Steady hands',
    quip: 'Breathe. We get one more go.',
    effect: 'After a miss, retry this world for free.',
  },
}

export const ROUTES: Record<RouteKind, RouteChoice> = {
  safe: {
    id: 'safe',
    name: 'The Quiet Belt',
    sub: 'Calm lane · lower difficulty',
    blurb: 'Long way round. Plenty of time for tea and a tidy survey.',
    color: '#63E6C3',
    rewardFuel: 1,
    recruit: 'vela',
  },
  risky: {
    id: 'risky',
    name: 'The Ion Storm',
    sub: 'Hot lane · harder question',
    blurb: 'Straight through the static. Faster, louder, worth more.',
    color: '#FF8D7A',
    rewardFuel: 2,
    recruit: 'moss',
  },
}

export const QUESTIONS: Question[] = [
  {
    id: 'mes-01',
    topicId: 'messenger',
    destination: 'KEPLER-16 b',
    tag: 'Orbital decay',
    difficulty: 1,
    prompt: 'The station is losing altitude. What is actually pulling it down?',
    choices: [
      { id: 'a', label: "The Moon's gravity, on a slow cycle" },
      { id: 'b', label: 'Drag from the faint upper atmosphere' },
      { id: 'c', label: 'Solar wind pressing on the solar arrays' },
      { id: 'd', label: "Earth's magnetic field, acting as a brake" },
    ],
    correctChoiceId: 'b',
    explanation:
      'At 400 km there is still measurable gas. The station sweeps through it at 7.7 km/s, and that drag bleeds orbital energy — so it must be reboosted.',
    hint: 'Low orbit is not empty. At 400 km there is still enough gas to feel at 7.7 km/s.',
    hintCost: 1,
    map: { x: 215, y: 255 },
  },
  {
    id: 'dae-01',
    topicId: 'daedalus',
    destination: 'CERES',
    tag: 'Rocket equation',
    difficulty: 2,
    prompt: 'Why does a chemical rocket need so much more propellant than payload?',
    choices: [
      { id: 'a', label: 'Engines lose most of their energy as light' },
      { id: 'b', label: 'Exhaust is fast, but the mass ratio grows exponentially' },
      { id: 'c', label: 'Fuel tanks become heavier in vacuum' },
      { id: 'd', label: "Gravity bends the exhaust plume backwards" },
    ],
    correctChoiceId: 'b',
    explanation:
      'The rocket equation is exponential: delta-v rises with the logarithm of the mass ratio. Slow exhaust means a staggering amount of propellant for each extra km/s.',
    hint: "Tsiolkovsky's equation has a logarithm in it. Logarithms are unkind.",
    hintCost: 1,
    map: { x: 705, y: 220 },
  },
  {
    id: 'hub-01',
    topicId: 'hubble',
    destination: 'GN-z11',
    tag: 'Lookback time',
    difficulty: 2,
    prompt: 'Light from a galaxy at redshift 1 has been travelling for roughly how long?',
    choices: [
      { id: 'a', label: '700 million years' },
      { id: 'b', label: '8 billion years' },
      { id: 'c', label: '13.8 billion years' },
      { id: 'd', label: '100 million years' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Redshift 1 puts the galaxy at about 8 billion light-years of lookback time — we see it as it was when the universe was roughly 6 billion years old.',
    hint: 'Redshift 1 is not the edge of the universe. It is a little past halfway back.',
    hintCost: 1,
    map: { x: 190, y: 675 },
  },
  {
    id: 'gal-01',
    topicId: 'galileo',
    destination: 'ENCELADUS',
    tag: 'Plume sampling',
    difficulty: 1,
    prompt:
      'Cassini flew through plumes above which moon and found salts, silica, and organic molecules?',
    choices: [
      { id: 'a', label: 'Titan' },
      { id: 'b', label: 'Enceladus' },
      { id: 'c', label: 'Io' },
      { id: 'd', label: 'Callisto' },
    ],
    correctChoiceId: 'b',
    explanation:
      "Enceladus vents water vapour from a subsurface ocean through fractures at its south pole. Cassini's passes sampled ocean material directly, without ever landing.",
    hint: 'A small, brilliant moon with tiger stripes at its south pole.',
    hintCost: 1,
    map: { x: 715, y: 690 },
  },
  {
    id: 'mes-02',
    topicId: 'messenger',
    destination: 'TRAPPIST-1 e',
    tag: 'Orbital period',
    difficulty: 2,
    prompt:
      'You fire prograde in a circular orbit. Your speed rises — what happens to your orbital period?',
    choices: [
      { id: 'a', label: 'It shortens' },
      { id: 'b', label: 'It lengthens' },
      { id: 'c', label: 'It stays exactly the same' },
      { id: 'd', label: 'It becomes infinite' },
    ],
    correctChoiceId: 'b',
    explanation:
      'The burn raises your apoapsis. The new orbit is larger, and a larger orbit always takes longer — even though you are moving fastest at the point where you burned.',
    hint: 'You have not gained a higher gear. You have gained a taller orbit.',
    hintCost: 1,
    map: { x: 320, y: 200 },
  },
  {
    id: 'dae-02',
    topicId: 'daedalus',
    destination: 'VESTA',
    tag: 'Ion propulsion',
    difficulty: 1,
    prompt:
      'An ion engine produces about as much thrust as the weight of a sheet of paper. Why is it still useful?',
    choices: [
      { id: 'a', label: 'It fires in short, powerful pulses' },
      { id: 'b', label: 'It expels propellant far faster, so it sips fuel for years' },
      { id: 'c', label: 'It needs no propellant at all' },
      { id: 'd', label: 'It borrows momentum from sunlight' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Ion drives trade thrust for exhaust velocity. Weeks of gentle push add up to enormous delta-v on a fraction of the propellant — ideal for long-haul cargo and outer-planet cruises.',
    hint: 'It is not strong. It is patient, and it is frugal.',
    hintCost: 1,
    map: { x: 850, y: 300 },
  },
  {
    id: 'hub-02',
    topicId: 'hubble',
    destination: 'MACS J1149',
    tag: 'Gravitational lensing',
    difficulty: 2,
    prompt: 'Why can a massive galaxy cluster make a background galaxy appear brighter?',
    choices: [
      { id: 'a', label: "It reflects the galaxy's light back toward us" },
      { id: 'b', label: "It acts as a gravitational lens" },
      { id: 'c', label: "It heats the galaxy's dust until it glows" },
      { id: 'd', label: 'It slows the light and concentrates it' },
    ],
    correctChoiceId: 'b',
    explanation:
      "The cluster's mass curves spacetime, bending and magnifying light from behind it. Some faint early galaxies are only visible because of this cosmic lens.",
    hint: 'Mass bends the path of light. Enough mass makes a telescope out of empty space.',
    hintCost: 1,
    map: { x: 310, y: 800 },
  },
  {
    id: 'gal-02',
    topicId: 'galileo',
    destination: 'EUROPA',
    tag: 'Habitability',
    difficulty: 2,
    prompt:
      "What makes a subsurface ocean a better bet for life than a planet's exposed surface?",
    choices: [
      { id: 'a', label: 'It is warmer than any surface environment' },
      { id: 'b', label: 'Ice shields the chemistry and water stays liquid' },
      { id: 'c', label: 'It contains no oxygen whatsoever' },
      { id: 'd', label: 'The pressure is too high for chemistry to break down' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Ice and rock absorb radiation and hold heat. A subsurface ocean offers a stable solvent, energy gradients, and protection — three things these moons\u2019 surfaces lack.',
    hint: 'Consider what the ice is doing: blocking radiation, holding heat, keeping water liquid.',
    hintCost: 1,
    map: { x: 850, y: 745 },
  },
  {
    id: 'mes-03',
    topicId: 'messenger',
    destination: 'PROXIMA b',
    tag: 'Transfer orbits',
    difficulty: 2,
    prompt:
      'To move from one circular orbit to a higher one, how many engine burns does the cheapest transfer need?',
    choices: [
      { id: 'a', label: 'One long continuous burn' },
      { id: 'b', label: 'Two: raise the far side, then circularise there' },
      { id: 'c', label: 'Four, one at each quarter of the orbit' },
      { id: 'd', label: 'None — altitude simply follows thrust' },
    ],
    correctChoiceId: 'b',
    explanation:
      'A Hohmann transfer: burn prograde to stretch the orbit into an ellipse, coast half a revolution, then burn again at apoapsis to round it out.',
    hint: 'An ellipse touches both circles. You need one burn for each touch.',
    hintCost: 1,
    map: { x: 148, y: 372 },
  },
  {
    id: 'dae-03',
    topicId: 'daedalus',
    destination: 'PSYCHE',
    tag: 'Gravity assists',
    difficulty: 3,
    prompt: "During a gravity assist, where does the spacecraft's extra speed come from?",
    choices: [
      { id: 'a', label: "The planet's gravity field, which it keeps" },
      { id: 'b', label: "The planet's orbital momentum around the Sun" },
      { id: 'c', label: "The Sun's thermal radiation" },
      { id: 'd', label: "The spacecraft's own propellant" },
    ],
    correctChoiceId: 'b',
    explanation:
      'The flyby is an elastic exchange: the craft gains heliocentric speed while the planet loses an imperceptible amount of orbital momentum. Nothing is created — it is borrowed.',
    hint: 'A planet is not a fuel station. It is a moving mass with momentum to spare.',
    hintCost: 1,
    map: { x: 748, y: 382 },
  },
  {
    id: 'hub-03',
    topicId: 'hubble',
    destination: 'GOODS-S',
    tag: 'Standard candles',
    difficulty: 2,
    prompt: 'A Type Ia supernova is useful to astronomers because…',
    choices: [
      { id: 'a', label: 'it always occurs at the same distance from us' },
      { id: 'b', label: 'its peak brightness is predictable, so it reveals distance' },
      { id: 'c', label: 'it outshines its entire host galaxy' },
      { id: 'd', label: 'it can only be seen in the nearby universe' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Type Ia explosions reach a consistent peak luminosity. Comparing apparent and intrinsic brightness gives a distance — and those distances revealed that cosmic expansion is accelerating.',
    hint: 'You know exactly how bright it should be. That is the whole trick.',
    hintCost: 1,
    map: { x: 145, y: 618 },
  },
  {
    id: 'gal-03',
    topicId: 'galileo',
    destination: 'TITAN',
    tag: 'Biosignatures',
    difficulty: 2,
    prompt: 'CHNOPS names the six elements most central to life on Earth. Which set is it?',
    choices: [
      { id: 'a', label: 'Carbon, hydrogen, nitrogen, oxygen, phosphorus, sulfur' },
      { id: 'b', label: 'Calcium, helium, neon, oxygen, potassium, silicon' },
      { id: 'c', label: 'Carbon, hydrogen, neon, oxygen, phosphorus, sodium' },
      { id: 'd', label: 'Copper, hydrogen, nitrogen, oxygen, potassium, sulfur' },
    ],
    correctChoiceId: 'a',
    explanation:
      'Carbon, hydrogen, nitrogen, oxygen, phosphorus and sulfur build proteins, nucleic acids, and cell membranes. Anywhere all six meet liquid water, chemistry gets interesting.',
    hint: 'Four are the familiar stuff of water and air. The last two build DNA and proteins.',
    hintCost: 1,
    map: { x: 752, y: 840 },
  },
]

export const EXPEDITION: Expedition = {
  id: 'near-universe',
  sheet: 'SHEET 01 / 04',
  title: 'The Near Universe',
  subtitle: 'A field guide to gravity, light, and the places between.',
  startFuel: 5,
  maxFuel: 8,
  salvageEvery: 3,
  maxSalvage: 4,
  junctions: [4, 8],
  skipCost: 2,
  retryCost: 1,
  startingCrew: ['pip', 'bolt'],
  itinerary: [
    'mes-01',
    'dae-01',
    'hub-01',
    'gal-01',
    'mes-02',
    'dae-02',
    'hub-02',
    'gal-02',
    'mes-03',
    'dae-03',
    'hub-03',
    'gal-03',
  ],
}

export const STATION = { x: 500, y: 486 }

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Survey',
  2: 'Deep',
  3: 'Frontier',
}

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]))
const TOPIC_BY_ID = new Map(Object.values(TOPICS).map((t) => [t.id, t]))

export function getQuestion(id: string): Question {
  const q = QUESTION_BY_ID.get(id)
  if (!q) throw new Error(`Unknown question: ${id}`)
  return q
}

export function getTopic(id: TopicId): Topic {
  const t = TOPIC_BY_ID.get(id)
  if (!t) throw new Error(`Unknown topic: ${id}`)
  return t
}

/** Questions of one region, in chart order (itinerary order). */
export function topicQuestions(topicId: TopicId): Question[] {
  return EXPEDITION.itinerary
    .map(getQuestion)
    .filter((q) => q.topicId === topicId)
}
