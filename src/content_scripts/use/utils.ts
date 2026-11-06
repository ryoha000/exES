import { RowInfo } from "../components/table_row"
import { PriceInfo, SaleInfo } from "../store"
import { IFetchMessageRequest, IFetchMessageResult } from '../../utils'

export const getASINFromAmazonURL = (url: URL) => {
  const target = unwrapURL(url)
  const path = target.searchParams.get('redirectUrl') || target.pathname
  return path.match(/\/(?:ASIN|dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1] || ''
}

export const unwrapURL = (url: URL): URL => {
  let result = url
  for (let i = 0; i < 3; i++) {
    const nested = result.searchParams.get('lurl') || result.searchParams.get('url') || result.pathname.split('/url/')[1]
    if (!nested) break
    try {
      const next = new URL(nested.startsWith('http') && !nested.startsWith('http%') ? nested : decodeURIComponent(nested))
      if (!/^https?:$/.test(next.protocol)) break
      result = next
    } catch { break }
  }
  return result
}

export const getGetchuIDFromURL = (url: URL) => {
  const target = unwrapURL(url)
  const id = target.searchParams.get('id') || target.pathname.match(/\/(?:item|id)\/(\d+)/)?.[1] || ''
  return /^\d+$/.test(id) ? id : ''
}

export const getDlsiteIDFromURL = (url: URL) => {
  return unwrapURL(url).pathname.match(/\/(?:product_id|id)\/([VRB]J\d+)\.html/i)?.[1].toUpperCase() || ''
}

export const getDlsiteRequestURL = (url: URL) => {
  const target = unwrapURL(url)
  const site = target.pathname.split('/')[1]
  const id = getDlsiteIDFromURL(target)
  if (!id || !/^[a-z]+$/.test(site) || !/(^|\.)dlsite\.com$/.test(target.hostname)) throw new Error('Invalid DLsite product URL')
  return `https://www.dlsite.com/${site}/product/info/ajax?product_id=${id}&cdn_cache_min=1`
}

export const convertPriceInfosToRowInfos = (pis: PriceInfo[]) => {
  const rowInfos: RowInfo[] = []
  for (const pi of pis) {
    rowInfos.push([
      { text: pi.title, url: pi.titleURL },
      { text: pi.price === null ? (pi.message || '価格を取得できません') :
        `${pi.price.toLocaleString('ja-JP')}${pi.priceMax !== undefined ? `～${pi.priceMax.toLocaleString('ja-JP')}` : ''}円${pi.priceFrom && pi.priceMax === undefined ? '～' : ''}`, url: pi.priceURL }
    ])
  }
  return rowInfos
}

export const convertSaleInfosToRowInfos = (sis: SaleInfo[]) => {
  const rowInfos: RowInfo[] = []
  for (const si of sis) {
    const day = `${si.start.slice(0, 10)} ～ ${si.end.slice(0, 10)}`
    rowInfos.push([
      { text: day },
      { text: si.content }
    ])
  }
  return rowInfos
}

export const backgroundFetch = (req: IFetchMessageRequest) => {
  return new Promise<string>((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(req, (data: IFetchMessageResult | undefined) => {
        const error = chrome.runtime.lastError
        if (error) {
          reject(new Error(error.message || 'Background request failed'))
        } else if (!data) {
          reject(new Error('No response from background service worker'))
        } else if (data.type === 'error') {
          reject(new Error(data.body))
        } else {
          resolve(data.body)
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}
