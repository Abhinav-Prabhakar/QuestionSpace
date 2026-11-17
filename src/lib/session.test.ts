import { describe, expect, it } from 'vitest'
import {
  EXPEDITION,
  ROUTES,
  getQuestion,
  type ChoiceId,
} from '../data/expedition'
import {
  INITIAL_STATE,
  activePassFor,
  activeQuestionId,
  anomalyIds,
  countCharted,
  dueAnomalyIds,
  eliminatedFor,
  expeditionProgress,
  reducer,
  statusOf,
  type ExpeditionState,
} from './session'
import { buildCaptainLog } from './log'

function begun(overrides: Partial<ExpeditionState> = {}): ExpeditionState {
  return {
    ...INITIAL_STATE,
    phase: 'underway',
    startedAt: 1000,
    ...overrides,
  }
}

const answer = (questionId: string, choiceId: ChoiceId, at = 2000) =>
  ({ type: 'answer', questionId, choiceId, at }) as const

function correctId(questionId: string): ChoiceId {
  return getQuestion(questionId).correctChoiceId
}

function wrongId(questionId: string): ChoiceId {
  return getQuestion(questionId).choices.find(
    (choice) => choice.id !== getQuestion(questionId).correctChoiceId,
  )!.id
}

function answerCorrect(state: ExpeditionState, questionId: string): ExpeditionState {
  return reducer(state, answer(questionId, correctId(questionId)))
}

describe('expedition reducer', () => {
  it('starts docked with fuel, crew, and no answers', () => {
    expect(INITIAL_STATE.version).toBe(2)
    expect(INITIAL_STATE.phase).toBe('preflight')
    expect(INITIAL_STATE.fuel).toBe(EXPEDITION.startFuel)
    expect(INITIAL_STATE.crew).toEqual(EXPEDITION.startingCrew)
    expect(countCharted(INITIAL_STATE.answers)).toBe(0)
  })

  it('begins a fresh expedition', () => {
    const state = reducer(INITIAL_STATE, { type: 'begin', at: 42 })
    expect(state.phase).toBe('underway')
    expect(state.cursor).toBe(0)
    expect(state.startedAt).toBe(42)
    expect(state.pass).toBe(1)
  })

  it('masters a first-pass correct answer without spending fuel', () => {
    const state = answerCorrect(begun(), 'mes-01')
    expect(state.answers['mes-01'].correct).toBe(true)
    expect(state.answers['mes-01'].attempt).toBe(1)
    expect(state.fuel).toBe(EXPEDITION.startFuel)
    expect(statusOf(state, 'mes-01')).toBe('mastered')
  })

  it('logs a wrong answer as an anomaly and never deducts fuel', () => {
    const state = reducer(begun(), answer('mes-01', wrongId('mes-01')))
    expect(state.answers['mes-01'].correct).toBe(false)
    expect(state.fuel).toBe(EXPEDITION.startFuel)
    expect(statusOf(state, 'mes-01')).toBe('anomaly')
    expect(state.anomalies['mes-01'].dueAt).toBe(3)
    expect(state.anomalies['mes-01'].returns).toBe(1)
  })

  it('salvages a fuel cell every third world charted', () => {
    let state = begun()
    for (const id of ['mes-01', 'dae-01', 'hub-01']) {
      state = answerCorrect(state, id)
    }
    expect(state.salvage).toBe(1)
    expect(state.fuel).toBe(EXPEDITION.startFuel + 1)
    expect(state.lastGain.fuel).toBe(1)
  })

  it('scans for the hint price and rules out exactly two choices', () => {
    const state = reducer(begun(), { type: 'scan', questionId: 'mes-01' })
    const eliminated = state.eliminated['mes-01']
    expect(state.hints).toContain('mes-01')
    expect(eliminated).toHaveLength(2)
    expect(eliminated).not.toContain(correctId('mes-01'))
    expect(state.fuel).toBe(EXPEDITION.startFuel - getQuestion('mes-01').hintCost)
    expect(state.spent).toBe(getQuestion('mes-01').hintCost)
  })

  it('cannot scan twice', () => {
    const once = reducer(begun(), { type: 'scan', questionId: 'mes-01' })
    const twice = reducer(once, { type: 'scan', questionId: 'mes-01' })
    expect(twice).toBe(once)
  })

  it('skips a world for fuel and leaves an anomaly behind', () => {
    const state = reducer(begun(), { type: 'skip', questionId: 'dae-01', at: 3000 })
    expect(state.fuel).toBe(EXPEDITION.startFuel - EXPEDITION.skipCost)
    expect(state.skips['dae-01'].pass).toBe(1)
    expect(statusOf(state, 'dae-01')).toBe('anomaly')
    expect(state.anomalies['dae-01'].dueAt).toBe(3)
  })

  it('opens a paid retry and recovers the world on the second attempt', () => {
    const missed = reducer(begun(), answer('mes-01', wrongId('mes-01')))
    const retry = reducer(missed, { type: 'retry', questionId: 'mes-01' })
    expect(retry.openRetry).toBe('mes-01')
    expect(retry.fuel).toBe(EXPEDITION.startFuel - EXPEDITION.retryCost)

    const recovered = reducer(retry, answer('mes-01', correctId('mes-01')))
    expect(recovered.openRetry).toBeNull()
    expect(recovered.answers['mes-01'].attempt).toBe(2)
    expect(recovered.anomalies['mes-01']).toBeUndefined()
    expect(statusOf(recovered, 'mes-01')).toBe('charted')
  })

  it('refuses a retry that has not been paid for', () => {
    const missed = reducer(begun(), answer('mes-01', wrongId('mes-01')))
    const blocked = reducer(missed, answer('mes-01', correctId('mes-01')))
    expect(blocked).toBe(missed)
  })

  it('pushes the anomaly further out on each return', () => {
    const first = reducer(begun(), answer('mes-01', wrongId('mes-01')))
    expect(first.anomalies['mes-01'].dueAt).toBe(3)

    const revisit = reducer(first, { type: 'revisit' })
    const second = reducer(revisit, answer('mes-01', wrongId('mes-01'), 5000))
    expect(second.anomalies['mes-01'].returns).toBe(2)
    expect(second.anomalies['mes-01'].dueAt).toBe(5)
  })

  it('opens a junction after four worlds and picks a route by difficulty', () => {
    let state = reducer(INITIAL_STATE, { type: 'begin', at: 1000 })
    for (let i = 0; i < 4; i += 1) state = reducer(state, { type: 'land' })

    expect(state.phase).toBe('junction')
    expect(state.cursor).toBe(4)
    expect(state.junction).not.toBeNull()
    const { safeId, riskyId } = state.junction!
    expect(getQuestion(safeId).difficulty).toBeLessThanOrEqual(
      getQuestion(riskyId).difficulty,
    )
  })

  it('moves the chosen route to the cursor and pays out on a clean pass', () => {
    let state = reducer(INITIAL_STATE, { type: 'begin', at: 1000 })
    for (let i = 0; i < 4; i += 1) state = reducer(state, { type: 'land' })
    const chosen = state.junction!.safeId
    state = reducer(state, { type: 'choose-route', route: 'safe' })

    expect(state.phase).toBe('underway')
    expect(state.itinerary[4]).toBe(chosen)
    expect(state.route[chosen]).toBe('safe')

    const before = state.fuel
    state = answerCorrect(state, chosen)
    expect(state.fuel).toBe(before + ROUTES.safe.rewardFuel)
    expect(state.crewEver).toContain(ROUTES.safe.recruit)
  })

  it('recruits only once, then converts a duplicate recruit to fuel', () => {
    let state = begun({
      crew: ['pip', 'bolt', 'vela'],
      crewEver: ['pip', 'bolt', 'vela'],
    })
    state = { ...state, route: { 'mes-01': 'safe' } }
    const before = state.fuel
    state = answerCorrect(state, 'mes-01')
    expect(state.crewEver.filter((id) => id === 'vela')).toHaveLength(1)
    expect(state.fuel).toBe(before + ROUTES.safe.rewardFuel + 1)
  })

  it('spends Bolt for two fuel cells and removes him from the dock', () => {
    const state = reducer(begun(), {
      type: 'use-crew',
      crewId: 'bolt',
      questionId: 'mes-01',
      at: 4000,
    })
    expect(state.fuel).toBe(EXPEDITION.startFuel + 2)
    expect(state.crew).not.toContain('bolt')
    expect(state.crewUsed).toContain('bolt')
    expect(state.crewEver).toContain('bolt')
  })

  it('spends Pip on a free skip that still leaves an anomaly', () => {
    const state = reducer(begun(), {
      type: 'use-crew',
      crewId: 'pip',
      questionId: 'mes-01',
      at: 4000,
    })
    expect(state.fuel).toBe(EXPEDITION.startFuel)
    expect(state.crew).not.toContain('pip')
    expect(state.skips['mes-01']).toBeTruthy()
    expect(state.anomalies['mes-01']).toBeTruthy()
  })

  it('spends Dr. Vela on a free scan', () => {
    const state = reducer(begun({ crew: ['vela'], crewEver: ['vela'] }), {
      type: 'use-crew',
      crewId: 'vela',
      questionId: 'mes-01',
      at: 4000,
    })
    expect(state.fuel).toBe(EXPEDITION.startFuel)
    expect(state.hints).toContain('mes-01')
    expect(state.eliminated['mes-01']).toEqual(eliminatedFor('mes-01'))
    expect(state.crew).not.toContain('vela')
  })

  it('spends Moss to reopen a missed sample for free', () => {
    let state = reducer(begun({ crew: ['moss'], crewEver: ['moss'] }), answer('mes-01', wrongId('mes-01')))
    state = reducer(state, {
      type: 'use-crew',
      crewId: 'moss',
      questionId: 'mes-01',
      at: 4000,
    })
    expect(state.openRetry).toBe('mes-01')
    expect(state.fuel).toBe(EXPEDITION.startFuel)
    expect(state.crew).not.toContain('moss')
  })

  it('revisits anomalies in a new pass and clears the recovered signal', () => {
    const missed = reducer(begun(), answer('mes-01', wrongId('mes-01')))
    const revisit = reducer(missed, { type: 'revisit' })
    expect(revisit.phase).toBe('underway')
    expect(revisit.pass).toBe(2)
    expect(revisit.itinerary).toEqual(['mes-01'])
    expect(activeQuestionId(revisit)).toBe('mes-01')
    expect(revisit.finishedAt).toBeNull()

    const recovered = reducer(revisit, answer('mes-01', correctId('mes-01')))
    expect(recovered.anomalies['mes-01']).toBeUndefined()
    expect(anomalyIds(recovered)).toHaveLength(0)
    expect(statusOf(recovered, 'mes-01')).toBe('charted')
  })

  it('tracks a due anomaly as a detour and returns to the same route spot', () => {
    const missed = reducer(begun(), answer('mes-01', wrongId('mes-01')))
    const atDue: ExpeditionState = { ...missed, cursor: 3 }
    expect(dueAnomalyIds(atDue)).toContain('mes-01')

    const detour = reducer(atDue, { type: 'track-anomaly', questionId: 'mes-01' })
    expect(detour.detour?.id).toBe('mes-01')
    expect(detour.detour?.returnCursor).toBe(3)
    expect(activeQuestionId(detour)).toBe('mes-01')
    expect(activePassFor(detour)).toBe(2)

    const back = reducer(detour, { type: 'land' })
    expect(back.detour).toBeNull()
    expect(back.cursor).toBe(3)
    expect(activeQuestionId(back)).toBe(back.itinerary[3])
  })

  it('does not track an anomaly before it is due', () => {
    const missed = reducer(begun(), answer('mes-01', wrongId('mes-01')))
    const early = reducer({ ...missed, cursor: 0 }, {
      type: 'track-anomaly',
      questionId: 'mes-01',
    })
    expect(early.detour).toBeNull()
  })

  it('only opens a junction on the first pass', () => {
    const firstPassJunction = begun({
      cursor: 8,
      pass: 2,
      junctionSeen: [4],
    })
    const state = reducer(firstPassJunction, { type: 'land' })
    expect(state.phase).toBe('underway')
    expect(state.cursor).toBe(9)
  })

  it('reports a diagnostic progress summary', () => {
    let state = begun()
    state = answerCorrect(state, 'mes-01')
    state = reducer(state, answer('dae-01', wrongId('dae-01')))
    const progress = expeditionProgress(state)
    expect(progress.total).toBe(EXPEDITION.itinerary.length)
    expect(progress.mastered).toBe(1)
    expect(progress.anomalies).toBe(1)
    expect(progress.known).toBe(1)
    expect(progress.accuracy).toBe(50)
  })

  it('resets to the dock', () => {
    const state = reducer(begun({ cursor: 4 }), { type: 'reset' })
    expect(state).toEqual(INITIAL_STATE)
  })
})

describe("captain's log", () => {
  it('summarises the chart, crew, and unresolved signals', () => {
    let state = begun({ startedAt: 0, finishedAt: 65_000 })
    state = answerCorrect(state, 'mes-01')
    state = reducer(state, answer('dae-01', wrongId('dae-01')))
    const log = buildCaptainLog(state)
    expect(log).toContain("CAPTAIN'S LOG")
    expect(log).toContain(EXPEDITION.title.toUpperCase())
    expect(log).toContain('charted 1 of 12')
    expect(log).toContain('Still singing')
    expect(log).toContain('PIP')
    expect(log).toContain('BOLT')
  })
})
