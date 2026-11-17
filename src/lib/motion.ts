import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'
const STORAGE_KEY = 'questionspace.motion.v1'

/** Live system preference. */
export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** Optional in-app override, so motion can be calmed without an OS trip. */
export function useMotionOverride(): [boolean | null, (value: boolean | null) => void] {
  const [override, setOverride] = useState<boolean | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'reduced') return true
      if (raw === 'full') return false
      return null
    } catch {
      return null
    }
  })

  const update = (value: boolean | null) => {
    setOverride(value)
    try {
      if (value === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, value ? 'reduced' : 'full')
    } catch {
      /* ignore */
    }
  }

  return [override, update]
}
