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

export const fetchPage = async (request: unknown): Promise<IFetchMessageResult> => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const url = requestURL(request)
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), 15000)
    // Reuse age-confirmed sessions; never set or read age/login cookies ourselves.
    const credentials = ['dmm.co.jp', 'sofmap.com', 'suruga-ya.jp'].some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ? 'include' : 'omit'
    const response = await fetch(url.href, { signal: controller.signal, credentials })
    // Surugaya also returns 404 when safe search hides all matching items.
    const surugayaSearch = url.hostname === 'www.suruga-ya.jp' && url.pathname === '/search'
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
