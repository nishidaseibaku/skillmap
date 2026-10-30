import { useEffect, useState } from 'react'

export type Route = { page: 'team'; id?: string } | { page: 'person'; id: string }

export function parseHash(hash: string): Route {
  const [, page, id] = hash.replace(/^#/, '').split('/')
  if (page === 'person' && id) return { page: 'person', id: decodeURIComponent(id) }
  if (page === 'team') return { page: 'team', id: id ? decodeURIComponent(id) : undefined }
  return { page: 'team' }
}

export const teamHref = (id: string) => `#/team/${encodeURIComponent(id)}`
export const personHref = (id: string) => `#/person/${encodeURIComponent(id)}`

// アプリ内で画面遷移したか(直接URLで開いた場合は履歴を戻ってもアプリの外に出てしまう)
let navigatedInApp = false
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    navigatedInApp = true
  })
}

/** 元の画面へ戻る。アプリ内の遷移で来ていれば履歴を戻り、直接開いた場合は fallback へ移る */
export function goBack(fallbackHref: string) {
  if (navigatedInApp) window.history.back()
  else window.location.hash = fallbackHref
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
