import { Price, ResultResponse } from './types'

// Read currency amounts, never concatenate digits from ranges, points, dates or markup.
export const parsePrice = (text: string | null | undefined): Price | null => {
  if (!text) return null
  const normalized = text.normalize('NFKC').replace(/\s+/g, ' ').trim()
  const amount = '(\\d{1,3}(?:,\\d{3})+|\\d+)'
  const range = normalized.match(new RegExp('(?:[¥￥]\\s*)?' + amount + '\\s*円?\\s*[~〜～–-]\\s*[¥￥]?\\s*' + amount + '\\s*円?'))
  const match = normalized.match(new RegExp('[¥￥]\\s*' + amount)) ||
    normalized.match(new RegExp(amount + '\\s*円')) || normalized.match(/^(\d+(?:,\d{3})*)$/)
  if (!match) return null
  const price = Number(match[1].replace(/,/g, ''))
  if (!Number.isSafeInteger(price) || price < 0) return null
  if (range) {
    const low = Number(range[1].replace(/,/g, ''))
    const high = Number(range[2].replace(/,/g, ''))
    if (low === price && high >= low && Number.isSafeInteger(high)) {
      return high === low ? { price } : { price, priceMax: high }
    }
  }
  return /[~〜～]\s*$/.test(normalized) ? { price, priceFrom: true } : { price }
}

export const documentFrom = (body: string): Document => new DOMParser().parseFromString(body, 'text/html')

export const linkURL = (element: Element | null, base: string): string | undefined => {
  const href = element?.getAttribute('href')
  if (!href) return undefined
  try {
    const url = new URL(href, base)
    return /^https?:$/.test(url.protocol) ? url.href : undefined
  } catch { return undefined }
}

export const unavailable = (title: string, priceURL: string, message = '価格を取得できません'): ResultResponse =>
  ({ title, price: null, priceURL, message })

export const withFailure = async (
  title: string, url: string, request: () => Promise<ResultResponse | ResultResponse[]>
): Promise<ResultResponse[]> => {
  try {
    const result = await request()
    return Array.isArray(result) ? result : [result]
  } catch (error) {
    console.error(`${title}:`, error)
    return [unavailable(title, url, '取得失敗（サイトで確認）')]
  }
}
