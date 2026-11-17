import type { ChoiceId, CrewId, RouteKind } from '../data/expedition'
import {
  CREW,
  EXPEDITION,
  ROUTES,
  getQuestion,
  type Difficulty,
} from '../data/expedition'

export type Phase = 'preflight' | 'junction' | 'underway' | 'debrief'
export type NodeStatus = 'mastered' | 'charted' | 'anomaly' | 'uncharted'

export interface AnswerRecord {
  choiceId: ChoiceId
  correct: boolean
  /** How many times this node has been answered, across passes. */
  attempt: number
  /** Which pass produced this record. */
  pass: number
  at: number
  route?: RouteKind
}

export interface SkipRecord {
  pass: number
  at: number
}

export interface Anomaly {
  /** Cursor position after which the signal can be tracked. */
  dueAt: number
  /** How many times this anomaly has come back. */
  returns: number
  at: number
}

export interface Junction {
  cursor: number
  safeId: string
  riskyId: string
}

export interface Detour {
  id: string
  pass: number
  returnCursor: number
}

export interface Gain {
  fuel: number
  crew: CrewId | null
}

export interface ExpeditionState {
  version: 2
  phase: Phase
  /** Main route pass. Revisits increment this. */
  pass: number
  itinerary: string[]
  cursor: number
  /** Spendable hint / shortcut currency. Never a life total. */
  fuel: number
  /** Salvage cells already awarded, capped by the expedition. */
  salvage: number
  /** Question ids whose hint has been bought. */
  hints: string[]
  /** Wrong choices ruled out per question. */
  eliminated: Record<string, ChoiceId[]>
  answers: Record<string, AnswerRecord>
  /** Worlds left without an answer; they still become anomalies. */
  skips: Record<string, SkipRecord>
  /** Unresolved discoveries waiting to resurface. */
  anomalies: Record<string, Anomaly>
  /** One-shot crew still aboard. */
  crew: CrewId[]
  /** Every crew member ever collected, for the log. */
  crewEver: CrewId[]
  crewUsed: CrewId[]
  /** Route chosen for a node, if it came from a junction. */
  route: Record<string, RouteKind>
  junctionSeen: number[]
  junction: Junction | null
  detour: Detour | null
  /** When set, the current wrong answer can be replaced (paid retry). */
  openRetry: string | null
  startedAt: number | null
  finishedAt: number | null
  /** Fuel gained by the last action, for the feedback line. */
  lastGain: Gain
  /** Crew member used by the last action, for a little feedback. */
  lastPerk: CrewId | null
  /** Fuel spent across scans, skips, and retries. */
  spent: number
}

export type Action =
  | { type: 'begin'; at: number }
  | { type: 'answer'; questionId: string; choiceId: ChoiceId; at: number }
  | { type: 'scan'; questionId: string }
  | { type: 'retry'; questionId: string }
  | { type: 'skip'; questionId: string; at: number }
  | { type: 'use-crew'; crewId: CrewId; questionId: string; at: number }
  | { type: 'choose-route'; route: RouteKind }
  | { type: 'track-anomaly'; questionId: string }
  | { type: 'land' }
  | { type: 'revisit' }
  | { type: 'reset' }

const EMPTY_GAIN: Gain = { fuel: 0, crew: null }

export const INITIAL_STATE: ExpeditionState = {
  version: 2,
  phase: 'preflight',
  pass: 1,
  itinerary: EXPEDITION.itinerary,
  cursor: 0,
  fuel: EXPEDITION.startFuel,
  salvage: 0,
  hints: [],
  eliminated: {},
  answers: {},
  skips: {},
  anomalies: {},
  crew: [...EXPEDITION.startingCrew],
  crewEver: [...EXPEDITION.startingCrew],
  crewUsed: [],
  route: {},
  junctionSeen: [],
  junction: null,
  detour: null,
  openRetry: null,
  startedAt: null,
  finishedAt: null,
  lastGain: EMPTY_GAIN,
  lastPerk: null,
  spent: 0,
}

/* --------------------------------- helpers ---------------------------------- */

function difficulty(id: string): Difficulty {
  return getQuestion(id).difficulty
}

function activePass(state: ExpeditionState): number {
  return state.detour?.pass ?? state.pass
}

function scheduleAnomaly(
  state: ExpeditionState,
  questionId: string,
  at: number,
): Record<string, Anomaly> {
  const previous = state.anomalies[questionId]
  const returns = (previous?.returns ?? 0) + 1
  const base = state.detour?.returnCursor ?? state.cursor
  return {
    ...state.anomalies,
    [questionId]: {
      dueAt: base + 3 + (returns - 1) * 2,
      returns,
      at,
    },
  }
}

function withoutAnomaly(
  anomalies: Record<string, Anomaly>,
  questionId: string,
): Record<string, Anomaly> {
  if (!anomalies[questionId]) return anomalies
  const next = { ...anomalies }
  delete next[questionId]
  return next
}

/** Two wrong choices, deterministic per question. */
export function eliminatedFor(questionId: string): ChoiceId[] {
  const question = getQuestion(questionId)
  return question.choices
    .filter((choice) => choice.id !== question.correctChoiceId)
    .slice(0, 2)
    .map((choice) => choice.id)
}

function branchCandidates(state: ExpeditionState, cursor: number): string[] {
  return state.itinerary
    .slice(cursor)
    .filter((id) => !state.answers[id] && !state.skips[id])
}

function buildJunction(state: ExpeditionState, cursor: number): Junction | null {
  const candidates = branchCandidates(state, cursor)
  if (candidates.length < 2) return null
  const order = new Map(state.itinerary.map((id, index) => [id, index]))
  const safe = [...candidates].sort(
    (a, b) =>
      difficulty(a) - difficulty(b) ||
      (order.get(a) ?? 0) - (order.get(b) ?? 0),
  )[0]
  const risky = [...candidates].sort(
    (a, b) =>
      difficulty(b) - difficulty(a) ||
      (order.get(a) ?? 0) - (order.get(b) ?? 0),
  )[0]
  if (safe === risky) return null
  return { cursor, safeId: safe, riskyId: risky }
}

function moveQuestionTo(itinerary: string[], questionId: string, cursor: number): string[] {
  const next = [...itinerary]
  const from = next.indexOf(questionId)
  if (from === -1) return next
  next.splice(from, 1)
  next.splice(cursor, 0, questionId)
  return next
}

/* --------------------------------- reducer ---------------------------------- */

export function reducer(state: ExpeditionState, action: Action): ExpeditionState {
  switch (action.type) {
    case 'begin': {
      return {
        ...INITIAL_STATE,
        phase: 'underway',
        startedAt: action.at,
      }
    }

    case 'answer': {
      if (state.phase !== 'underway') return state
      const question = getQuestion(action.questionId)
      const pass = activePass(state)
      if (!state.itinerary.includes(action.questionId) && state.detour?.id !== action.questionId) {
        return state
      }
      const previous = state.answers[action.questionId]
      if (previous?.pass === pass && state.openRetry !== action.questionId) return state

      const correct = action.choiceId === question.correctChoiceId
      const answers: Record<string, AnswerRecord> = {
        ...state.answers,
        [action.questionId]: {
          choiceId: action.choiceId,
          correct,
          attempt: (previous?.attempt ?? 0) + 1,
          pass,
          at: action.at,
          route: state.route[action.questionId],
        },
      }

      let fuel = state.fuel
      let salvage = state.salvage
      let crew = state.crew
      let crewEver = state.crewEver
      let anomalies = state.anomalies
      let gain: Gain = EMPTY_GAIN
      let lastPerk: CrewId | null = null

      if (correct) {
        anomalies = withoutAnomaly(anomalies, action.questionId)
        const charted = countCharted(answers)
        if (
          charted % EXPEDITION.salvageEvery === 0 &&
          salvage < EXPEDITION.maxSalvage
        ) {
          fuel += 1
          salvage += 1
          gain = { ...gain, fuel: gain.fuel + 1 }
        }

        const route = state.route[action.questionId]
        if (route && previous?.correct !== true) {
          const reward = ROUTES[route]
          if (!crewEver.includes(reward.recruit)) {
            crew = [...crew, reward.recruit]
            crewEver = [...crewEver, reward.recruit]
            gain = { ...gain, crew: reward.recruit }
          } else {
            fuel += 1
            gain = { ...gain, fuel: gain.fuel + 1 }
          }
          fuel += reward.rewardFuel
          gain = { ...gain, fuel: gain.fuel + reward.rewardFuel }
        }

        fuel = Math.min(EXPEDITION.maxFuel, fuel)
      } else {
        anomalies = scheduleAnomaly(state, action.questionId, action.at)
        gain = EMPTY_GAIN
      }

      return {
        ...state,
        answers,
        fuel,
        salvage,
        anomalies,
        crew,
        crewEver,
        openRetry: null,
        lastGain: gain,
        lastPerk,
      }
    }

    case 'scan': {
      if (state.phase !== 'underway') return state
      const question = getQuestion(action.questionId)
      if (state.answers[action.questionId]?.pass === activePass(state)) return state
      if (state.hints.includes(question.id)) return state
      if (state.fuel < question.hintCost) return state
      return {
        ...state,
        fuel: state.fuel - question.hintCost,
        spent: state.spent + question.hintCost,
        hints: [...state.hints, question.id],
        eliminated: {
          ...state.eliminated,
          [question.id]: eliminatedFor(question.id),
        },
        lastGain: EMPTY_GAIN,
        lastPerk: null,
      }
    }

    case 'retry': {
      if (state.phase !== 'underway') return state
      const record = state.answers[action.questionId]
      if (!record || record.correct || record.pass !== activePass(state)) return state
      if (state.openRetry === action.questionId) return state
      if (state.fuel < EXPEDITION.retryCost) return state
      return {
        ...state,
        fuel: state.fuel - EXPEDITION.retryCost,
        spent: state.spent + EXPEDITION.retryCost,
        openRetry: action.questionId,
        lastGain: EMPTY_GAIN,
        lastPerk: null,
      }
    }

    case 'skip': {
      if (state.phase !== 'underway') return state
      const pass = activePass(state)
      if (state.answers[action.questionId]?.pass === pass) return state
      if (state.skips[action.questionId]?.pass === pass) return state
      if (state.fuel < EXPEDITION.skipCost) return state
      return {
        ...state,
        fuel: state.fuel - EXPEDITION.skipCost,
        spent: state.spent + EXPEDITION.skipCost,
        skips: {
          ...state.skips,
          [action.questionId]: { pass, at: action.at },
        },
        anomalies: scheduleAnomaly(state, action.questionId, action.at),
        openRetry: null,
        lastGain: EMPTY_GAIN,
        lastPerk: null,
      }
    }

    case 'use-crew': {
      if (state.phase !== 'underway') return state
      if (!state.crew.includes(action.crewId)) return state
      const member = CREW[action.crewId]
      const record = state.answers[action.questionId]
      const isAnswered = record?.pass === activePass(state)
      const nextCrew = state.crew.filter((id) => id !== action.crewId)
      const used = [...state.crewUsed, action.crewId]
      let next: ExpeditionState = {
        ...state,
        crew: nextCrew,
        crewUsed: used,
        lastGain: EMPTY_GAIN,
        lastPerk: member.id,
      }

      if (member.id === 'bolt') {
        const fuel = Math.min(EXPEDITION.maxFuel, state.fuel + 2)
        next = {
          ...next,
          fuel,
          crewEver: state.crewEver,
          lastGain: { fuel: fuel - state.fuel, crew: null },
        }
        return next
      }

      if (member.id === 'vela') {
        if (isAnswered || state.hints.includes(action.questionId)) return state
        return {
          ...next,
          hints: [...state.hints, action.questionId],
          eliminated: {
            ...state.eliminated,
            [action.questionId]: eliminatedFor(action.questionId),
          },
          crewEver: state.crewEver,
        }
      }

      if (member.id === 'pip') {
        if (isAnswered) return state
        return {
          ...next,
          skips: {
            ...state.skips,
            [action.questionId]: {
              pass: activePass(state),
              at: action.at,
            },
          },
          anomalies: scheduleAnomaly(state, action.questionId, action.at),
          crewEver: state.crewEver,
        }
      }

      if (member.id === 'moss') {
        if (!record || record.correct || isAnswered === false) return state
        if (record.pass !== activePass(state)) return state
        if (state.openRetry === action.questionId) return state
        return {
          ...next,
          openRetry: action.questionId,
          crewEver: state.crewEver,
        }
      }

      return state
    }

    case 'choose-route': {
      if (state.phase !== 'junction' || !state.junction) return state
      const { safeId, riskyId, cursor } = state.junction
      const chosen = action.route === 'safe' ? safeId : riskyId
      if (!state.itinerary.includes(chosen)) return state
      return {
        ...state,
        phase: 'underway',
        itinerary: moveQuestionTo(state.itinerary, chosen, cursor),
        route: { ...state.route, [chosen]: action.route },
        junctionSeen: [...state.junctionSeen, cursor],
        junction: null,
        cursor,
        openRetry: null,
        lastGain: EMPTY_GAIN,
        lastPerk: null,
      }
    }

    case 'track-anomaly': {
      if (state.phase !== 'underway' || state.detour) return state
      const anomaly = state.anomalies[action.questionId]
      if (!anomaly || anomaly.dueAt > state.cursor) return state
      const previous = state.answers[action.questionId]
      return {
        ...state,
        detour: {
          id: action.questionId,
          pass: (previous?.pass ?? 0) + 1,
          returnCursor: state.cursor,
        },
        openRetry: null,
        lastGain: EMPTY_GAIN,
        lastPerk: null,
      }
    }

    case 'land': {
      if (state.phase !== 'underway') return state

      /* A detour returns to the exact place it left. */
      if (state.detour) {
        return {
          ...state,
          detour: null,
          openRetry: null,
          lastGain: EMPTY_GAIN,
          lastPerk: null,
        }
      }

      const next = state.cursor + 1
      if (next >= state.itinerary.length) {
        return {
          ...state,
          phase: 'debrief',
          finishedAt: Date.now(),
          openRetry: null,
          lastGain: EMPTY_GAIN,
          lastPerk: null,
        }
      }

      /* Junctions only appear on the first route, not on revisits. */
      if (
        state.pass === 1 &&
        EXPEDITION.junctions.includes(next) &&
        !state.junctionSeen.includes(next)
      ) {
        const junction = buildJunction(state, next)
        if (junction) {
          return {
            ...state,
            phase: 'junction',
            cursor: next,
            junction,
            openRetry: null,
            lastGain: EMPTY_GAIN,
            lastPerk: null,
          }
        }
      }

      return {
        ...state,
        cursor: next,
        openRetry: null,
        lastGain: EMPTY_GAIN,
        lastPerk: null,
      }
    }

    case 'revisit': {
      const anomalies = anomalyIds(state)
      if (anomalies.length === 0) return state
      return {
        ...state,
        phase: 'underway',
        pass: state.pass + 1,
        itinerary: anomalies,
        cursor: 0,
        junction: null,
        detour: null,
        openRetry: null,
        finishedAt: null,
        lastGain: EMPTY_GAIN,
        lastPerk: null,
      }
    }

    case 'reset':
      return { ...INITIAL_STATE }
  }
}

/* ---------------------------------- selectors -------------------------------- */

export function activeQuestionId(state: ExpeditionState): string {
  if (state.detour) return state.detour.id
  return state.itinerary[state.cursor] ?? state.itinerary[state.itinerary.length - 1]
}

export function activePassFor(state: ExpeditionState): number {
  return activePass(state)
}

export function answerFor(
  state: ExpeditionState,
  questionId: string,
): AnswerRecord | undefined {
  return state.answers[questionId]
}

export function statusOf(state: ExpeditionState, questionId: string): NodeStatus {
  const record = state.answers[questionId]
  if (record) {
    if (!record.correct) return 'anomaly'
    return record.attempt === 1 && !state.skips[questionId] ? 'mastered' : 'charted'
  }
  if (state.skips[questionId]) return 'anomaly'
  return 'uncharted'
}

export function countCharted(answers: Record<string, AnswerRecord>): number {
  return Object.values(answers).filter((answer) => answer.correct).length
}

export function anomalyIds(state: ExpeditionState): string[] {
  return EXPEDITION.itinerary.filter((id) => Boolean(state.anomalies[id]))
}

export function dueAnomalyIds(state: ExpeditionState): string[] {
  const active = state.detour?.id
  return anomalyIds(state).filter(
    (id) => id !== active && state.anomalies[id].dueAt <= state.cursor,
  )
}

export function isDue(state: ExpeditionState, questionId: string): boolean {
  const anomaly = state.anomalies[questionId]
  return Boolean(anomaly && anomaly.dueAt <= state.cursor)
}

export function regionStats(state: ExpeditionState, ids: string[]) {
  return ids.reduce(
    (stats, id) => {
      const status = statusOf(state, id)
      stats[status] += 1
      return stats
    },
    { mastered: 0, charted: 0, anomaly: 0, uncharted: 0 },
  )
}

export function expeditionProgress(state: ExpeditionState) {
  const total = EXPEDITION.itinerary.length
  const statuses = EXPEDITION.itinerary.map((id) => statusOf(state, id))
  const answered = EXPEDITION.itinerary.filter((id) => state.answers[id])
  const correct = answered.filter((id) => state.answers[id].correct)
  return {
    total,
    mastered: statuses.filter((status) => status === 'mastered').length,
    charted: statuses.filter((status) => status === 'charted').length,
    known: statuses.filter(
      (status) => status === 'mastered' || status === 'charted',
    ).length,
    anomalies: statuses.filter((status) => status === 'anomaly').length,
    answered: answered.length,
    accuracy: answered.length ? Math.round((correct.length / answered.length) * 100) : 0,
    fuelSpent: state.spent,
    crewUsed: state.crewUsed.length,
    safeRoutes: Object.values(state.route).filter((route) => route === 'safe').length,
    riskyRoutes: Object.values(state.route).filter((route) => route === 'risky').length,
  }
}

/* --------------------------------- persistence -------------------------------- */

const STORAGE_KEY = 'questionspace.session.v2'

export function loadState(): ExpeditionState {
  if (typeof localStorage === 'undefined') return { ...INITIAL_STATE }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...INITIAL_STATE }
    const parsed = JSON.parse(raw) as Partial<ExpeditionState>
    if (parsed.version !== 2) return { ...INITIAL_STATE }
    if (!Array.isArray(parsed.itinerary) || parsed.itinerary.length === 0) {
      return { ...INITIAL_STATE }
    }
    if (parsed.itinerary.some((id) => !EXPEDITION.itinerary.includes(id))) {
      return { ...INITIAL_STATE }
    }
    const phase =
      parsed.phase === 'underway' ||
      parsed.phase === 'debrief' ||
      (parsed.phase === 'junction' && parsed.junction)
        ? parsed.phase
        : 'preflight'
    return {
      ...INITIAL_STATE,
      ...parsed,
      itinerary: parsed.itinerary,
      phase,
      junction: phase === 'junction' ? parsed.junction ?? null : null,
      cursor: Math.min(parsed.cursor ?? 0, parsed.itinerary.length - 1),
      crew: Array.isArray(parsed.crew) ? parsed.crew : [...EXPEDITION.startingCrew],
      crewEver: Array.isArray(parsed.crewEver)
        ? parsed.crewEver
        : [...EXPEDITION.startingCrew],
      detour: parsed.detour ?? null,
      openRetry: parsed.openRetry ?? null,
    }
  } catch {
    return { ...INITIAL_STATE }
  }
}

export function saveState(state: ExpeditionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* private mode / quota — the expedition still works in memory */
  }
}

export function clearSavedState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
