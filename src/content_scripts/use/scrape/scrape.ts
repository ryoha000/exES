import { getASINFromAmazonURL, getDlsiteIDFromURL, getDlsiteRequestURL, getGetchuIDFromURL, unwrapURL } from '../utils'
import scrapeAmazon from './amazon'
import scrapeSofmap, { sofmapURL } from './sofmap'
import scrapeGetchu from './getchu'
import scrapeSurugaya, { surugayaURL } from './surugaya'
import scrapeFanza from './fanza'
import scrapeDlsite from './dlsite'
import { unavailable, withFailure, documentFrom } from './price'
import { ResultResponse } from './types'
export type { ResultResponse, JANCodeWithAssociatedPrices } from './types'

export const getJANCodeWithAssociatedPrice = async (url: URL): Promise<ResultResponse[]> => {
  const id = getGetchuIDFromURL(url)
  if (!id) return [unavailable('Getchu', url.href, '商品IDを取得できません')]
  try {
    const { janCode, getchu } = await scrapeGetchu(id)
    if (!janCode) return [getchu,
      unavailable('駿河屋', 'https://www.suruga-ya.jp/', 'GetchuのJANコードがありません'),
      unavailable('Sofmap', 'https://a.sofmap.com/', 'GetchuのJANコードがありません')]
    const prices = await Promise.all([
      withFailure('駿河屋', surugayaURL(janCode), () => scrapeSurugaya(janCode)),
      withFailure('Sofmap', sofmapURL(janCode), () => scrapeSofmap(janCode))
    ])
    return [getchu, ...prices.flat()]
  } catch (error) {
    console.error(error)
    return [unavailable('Getchu', url.href, '取得失敗（サイトで確認）'),
      unavailable('駿河屋', 'https://www.suruga-ya.jp/', 'GetchuのJANコードを取得できません'),
      unavailable('Sofmap', 'https://a.sofmap.com/', 'GetchuのJANコードを取得できません')]
  }
}

export const getAmazonPrice = async (url: URL): Promise<ResultResponse[]> => {
  const asin = getASINFromAmazonURL(url)
  if (!asin) return [unavailable('Amazon', url.href, '商品IDを取得できません')]
  return withFailure('Amazon', url.href, async () => {
    const result = await scrapeAmazon(asin)
    if (result.price === null) return result
    const gameTitle = document.title.replace(/\s*ErogameScape.*$/, '').trim()
    const detail = result.title.startsWith(gameTitle) ? result.title.slice(gameTitle.length).trim() : result.title
    return { ...result, title: detail ? `Amazon（${detail}）` : 'Amazon' }
  })
}

export const getFanzaPrice = async (url: URL): Promise<ResultResponse[]> => {
  const target = unwrapURL(url)
  return withFailure('FANZA', target.href, () => scrapeFanza(target.href))
}

export const getDlsitePrice = async (url: URL): Promise<ResultResponse[]> => {
  const target = unwrapURL(url)
  return withFailure('DLsite', target.href, () => scrapeDlsite(getDlsiteRequestURL(target), getDlsiteIDFromURL(target), target.href))
}

export interface SaleInfo { content: string; start: string; end: string }

export const parseSaleInfo = (body: string): SaleInfo[] => {
  const dom = documentFrom(body)
  const result = dom.querySelector('#query_result_main')
  // A successful zero-row query has a query plan and an empty result container.
  if (result && result.childElementCount === 0 && !result.textContent?.trim() && dom.querySelector('#queryplan_main pre')) return []
  const table = result?.querySelector('table')
  if (!table) throw new Error('キャンペーン情報を取得できません')
  const rows = Array.from(table.querySelectorAll('tr'))
  const headers = Array.from(rows[0]?.querySelectorAll('th') || []).map(e => e.textContent?.trim())
  const contentIndex = headers.indexOf('content')
  const startIndex = headers.indexOf('start_timestamp')
  const endIndex = headers.indexOf('end_timestamp')
  if ([contentIndex, startIndex, endIndex].some(index => index < 0)) throw new Error('キャンペーンの形式を確認できません')
  return rows.slice(1).flatMap(row => {
    const cells = row.querySelectorAll('td')
    const content = cells[contentIndex]?.textContent?.trim() || ''
    const start = cells[startIndex]?.textContent?.trim() || ''
    const end = cells[endIndex]?.textContent?.trim() || ''
    return /^\d{4}-\d{2}-\d{2}/.test(start) && /^\d{4}-\d{2}-\d{2}/.test(end) ? [{ content, start, end }] : []
  }).sort((a, b) => b.start.localeCompare(a.start))
}

export const getPastSaleInfo = async (): Promise<SaleInfo[]> => {
  const id = new URL(location.href).searchParams.get('game')
  if (!id || !/^\d+$/.test(id)) return []
  const formData = new FormData()
  formData.append('sql', `SELECT campaign_game.content, campaignlist.start_timestamp, campaignlist.end_timestamp FROM campaign_game INNER JOIN campaignlist ON campaignlist.id = campaign_game.campaign WHERE game = ${id} ORDER BY campaignlist.start_timestamp DESC;`)
  const response = await fetch(new URL('sql_for_erogamer_form.php', location.href), {
    method: 'POST', body: formData, signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return parseSaleInfo(await response.text())
}

export interface ExternalLinks { amazon: URL[]; getchu?: URL; dlsite?: URL; fanza?: URL }

export const getExternalLinks = (dom: Document = document): ExternalLinks => {
  const container = dom.getElementById('bottom_inter_links_main')
  if (!container) throw new Error('通販リンクを取得できません')
  const links: ExternalLinks = { amazon: [] }
  container.querySelectorAll('a').forEach(link => {
    let url: URL
    try { url = new URL(link.getAttribute('href') || '', dom.baseURI) } catch { return }
    if (!/^https?:$/.test(url.protocol)) return
    const label = link.textContent?.trim()
    const target = unwrapURL(url)
    if (label === 'Amazon' || /(^|\.)amazon\.(co\.jp|jp)$/.test(target.hostname)) {
      if (!links.amazon.some(existing => getASINFromAmazonURL(existing) === getASINFromAmazonURL(url))) links.amazon.push(url)
    }
    if (!links.getchu && (label === 'Getchu.com' || /(^|\.)getchu\.com$/.test(target.hostname))) links.getchu = url
    if (!links.dlsite && (label === 'DLsite.com' || /(^|\.)dlsite\.com$/.test(target.hostname))) links.dlsite = url
    if (!links.fanza && (label === 'DMM' || label === 'FANZA')) links.fanza = url
  })
  return links
}
