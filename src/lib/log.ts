import {
  CREW,
  EXPEDITION,
  TOPICS,
  getQuestion,
  topicQuestions,
} from '../data/expedition'
import {
  anomalyIds,
  expeditionProgress,
  regionStats,
  type ExpeditionState,
} from './session'

export function formatElapsed(
  startedAt: number | null,
  finishedAt: number | null,
): string {
  if (!startedAt) return '—'
  const end = finishedAt ?? Date.now()
  const seconds = Math.max(0, Math.round((end - startedAt) / 1000))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** A shareable end-of-run log, in the voice of the crew. */
export function buildCaptainLog(state: ExpeditionState): string {
  const progress = expeditionProgress(state)
  const anomalies = anomalyIds(state)
  const crew = state.crewEver.map((id) => CREW[id].name)
  const routeBrag =
    progress.riskyRoutes > progress.safeRoutes
      ? 'We took the storms more often than the calm lanes.'
      : progress.safeRoutes > progress.riskyRoutes
        ? 'We kept mostly to the quiet belts. Sensible, mostly.'
        : 'We split the route evenly between calm and static.'

  const regions = Object.values(TOPICS)
    .map((topic) => {
      const ids = topicQuestions(topic.id).map((question) => question.id)
      const stats = regionStats(state, ids)
      return { topic, stats }
    })
    .sort((a, b) => b.stats.mastered - a.stats.mastered)
  const best = regions[0]

  const lines = [
    `CAPTAIN'S LOG — ${EXPEDITION.sheet}`,
    `${EXPEDITION.title.toUpperCase()} · ${formatElapsed(state.startedAt, state.finishedAt)} elapsed`,
    '',
    `We charted ${progress.known} of ${progress.total} worlds.`,
    `${progress.mastered} ${progress.mastered === 1 ? 'was' : 'were'} mastered first pass; ${
      progress.charted
    } came back from anomaly.`,
    routeBrag,
    `${progress.crewUsed} crew perk${progress.crewUsed === 1 ? '' : 's'} spent. ${progress.fuelSpent} fuel burned.`,
    `Strongest signal: ${best.topic.name} — ${best.stats.mastered}/${topicQuestions(best.topic.id).length} mastered first pass.`,
  ]

  if (anomalies.length > 0) {
    lines.push(
      `Still singing: ${anomalies
        .map((id) => getQuestion(id).destination)
        .join(', ')}. We left the lights on for them.`,
    )
  } else {
    lines.push('No anomalies left unresolved. The chart is quiet.')
  }

  lines.push(
    crew.length > 0 ? `Crew aboard: ${crew.join(', ')}.` : 'Crew: none listed.',
    '',
    '— signed, the crew of Meridian Station',
  )

  return lines.join('\n')
}
