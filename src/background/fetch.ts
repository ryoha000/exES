import * as Encoding from 'encoding-japanese'
import { IFetchMessageRequest, IFetchMessageResult } from '../utils'

const allowedDomains = [
  'erogamescape.dyndns.org', 'erogamescape.org', 'amazon.jp', 'amazon.co.jp', 'getchu.com',
  'sofmap.com', 'suruga-ya.jp', 'dmm.co.jp', 'dlsite.com'
]

const requestURL = (request: unknown): URL => {
  if (!request || typeof request !== 'object' ||
      !('url' in request) || typeof request.url !== 'string') {
    throw new Error('Invalid fetch request')
  }

  const url = new URL(request.url)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      !allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
    throw new Error('Unsupported request URL')
  }

  const params = (request as IFetchMessageRequest).params
  if (params !== undefined) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      throw new Error('Invalid query parameters')
    }
    for (const [key, value] of Object.entries(params)) {
      if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) {
        throw new Error('Invalid query parameter')
      }
      url.searchParams.append(key, String(value))
    }
  }
  return url
}

const requestOptions = (request: unknown, url: URL): RequestInit => {
  const form = (request as IFetchMessageRequest).surugayaForm
  if (form === undefined) return {}
  if (!form || typeof form !== 'object' || Array.isArray(form) ||
      !['settings', 'confirm'].includes(form.stage) ||
      typeof form.buildId !== 'string' || !/^form-[A-Za-z0-9_-]{1,200}$/.test(form.buildId) ||
      (form.token !== undefined && (typeof form.token !== 'string' || form.token.length > 1024)) ||
      Object.keys(form).some(key => !['stage', 'buildId', 'token'].includes(key))) {
    throw new Error('Invalid safe-search form')
  }
  const path = form.stage === 'settings' ? '/safe_search/config' : '/safe_search/config/confirm'
  if (url.origin !== 'https://www.suruga-ya.jp' || url.pathname !== path) {
    throw new Error('Unsupported form destination')
  }
  const returnURL = new URL(url.searchParams.get('return_url') || '', url.origin)
  if (returnURL.origin !== url.origin || returnURL.pathname !== '/search') {
    throw new Error('Invalid safe-search return URL')
  }
  // This extension is distributed to adults only. Submit only the site's two
  // safe-search forms, using the current session rather than a permanent setting.
  const data = new URLSearchParams({
    form_id: form.stage === 'settings' ? 'safe_search_form' : 'safe_search_confirm_form',
    form_build_id: form.buildId,
    expired_date: '2',
    op: form.stage === 'settings' ? '設定する' : 'はい'
  })
  if (form.stage === 'settings') data.set('sexualExpression', '3')
  if (form.token) data.set('form_token', form.token)
  return { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() }
}

export const fetchPage = async (request: unknown): Promise<IFetchMessageResult> => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const url = requestURL(request)
    const options = requestOptions(request, url)
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), 15000)
    // The browser stores the site's confirmation cookies; no cookies permission is needed.
    const credentials = ['dmm.co.jp', 'sofmap.com', 'suruga-ya.jp'].some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ? 'include' : 'omit'
    const response = await fetch(url.href, { ...options, signal: controller.signal, credentials })
    // Surugaya also returns 404 when safe search hides all matching items.
    const surugayaSearch = (url.hostname === 'www.suruga-ya.jp' && url.pathname === '/search') ||
      (url.origin === 'https://www.suruga-ya.jp' && /^https:\/\/www\.suruga-ya\.jp\/search(?:\?|$)/.test(response.url))
    if (!response.ok && !(response.status === 404 && surugayaSearch)) throw new Error(`HTTP ${response.status}`)

    const codes = new Uint8Array(await response.arrayBuffer())
    if (codes.length === 0) return { type: 'success', body: '' }
    const encoding = Encoding.detect(codes)
    if (!encoding) throw new Error("Couldn't detect response encoding")

    return {
      type: 'success',
      body: Encoding.convert(codes, { to: 'UNICODE', from: encoding, type: 'string' })
    }
  } catch (error) {
    // Chrome messages use JSON serialization, which does not preserve Error objects.
    return { type: 'error', body: error instanceof Error ? error.message : String(error) }
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}
