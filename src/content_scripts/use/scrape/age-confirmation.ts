import { IFetchMessageRequest } from '../../../utils'
import { backgroundFetch } from '../utils'
import { documentFrom, linkURL } from './price'

const endpoint = (href: string | undefined, origin: string, path: string): URL => {
  if (!href) throw new Error('Age-confirmation link not found')
  const url = new URL(href, origin)
  if (url.origin !== origin || url.pathname !== path || url.username || url.password) {
    throw new Error('Unexpected age-confirmation endpoint')
  }
  return url
}

export const confirmFanzaAge = async (body: string, productURL: string): Promise<string> => {
  const dom = documentFrom(body)
  if (!/年齢認証|年齢確認/.test(dom.title)) return body
  const origin = 'https://www.dmm.co.jp'
  const link = dom.querySelector('a[href*="/age_check/=/declared=yes/"]')
  const url = endpoint(linkURL(link, origin), origin, '/age_check/=/declared=yes/')
  const product = new URL(productURL)
  if (!/(^|\.)dmm\.co\.jp$/.test(product.hostname) || product.username || product.password || product.port) {
    throw new Error('Invalid FANZA product URL')
  }
  product.protocol = 'https:'
  url.searchParams.set('rurl', product.href)
  return backgroundFetch({ url: url.href })
}

export const confirmSofmapAge = async (
  body: string, searchURL: string, request: IFetchMessageRequest
): Promise<string> => {
  const dom = documentFrom(body)
  if (!dom.querySelector('.adult_on')) return body
  const origin = 'https://a.sofmap.com'
  const url = endpoint(linkURL(dom.querySelector('.adult_on a'), origin), origin, '/adult_confirm.aspx')
  const search = endpoint(searchURL, origin, '/search_result.aspx')
  const returnPath = search.pathname + search.search
  url.searchParams.set('url', returnPath)
  // The search shell establishes the site's session before opening its age form.
  try {
    await backgroundFetch({ url: search.href })
  } catch (error) {
    // Sofmap can return its temporary 404 page during simultaneous initialization.
    // The age form may still be available, so continue to that single attempt.
    if (!(error instanceof Error) || error.message !== 'HTTP 404') throw error
  }
  const gate = documentFrom(await backgroundFetch({ url: url.href }))
  const yesLink = gate.querySelector('a[href*="/xt_adult_confirm.aspx"]')
  // Another tab may have confirmed the shared session while this request was in flight.
  if (yesLink) {
    const yes = endpoint(linkURL(yesLink, origin), origin, '/xt_adult_confirm.aspx')
    yes.searchParams.set('url', returnPath)
    await backgroundFetch({ url: yes.href })
  }
  return backgroundFetch(request)
}

const safeSearchForm = (dom: Document, stage: 'settings' | 'confirm'): NonNullable<IFetchMessageRequest['surugayaForm']> => {
  const id = stage === 'settings' ? 'safe_search_form' : 'safe_search_confirm_form'
  const form = dom.querySelector(`input[name="form_id"][value="${id}"]`)?.closest('form')
  const buildId = form?.querySelector('input[name="form_build_id"]')?.getAttribute('value')
  if (!buildId) throw new Error('Safe-search form not found')
  const token = form?.querySelector('input[name="form_token"]')?.getAttribute('value')
  return { stage, buildId, ...(token ? { token } : {}) }
}

export const confirmSurugayaAge = async (body: string, searchURL: string): Promise<string> => {
  const dom = documentFrom(body)
  const link = Array.from(dom.querySelectorAll('a[href*="/safe_search/config"]')).find(link => /によって/.test(link.textContent || ''))
  if (!link) return body
  const origin = 'https://www.suruga-ya.jp'
  const url = endpoint(linkURL(link, origin), origin, '/safe_search/config')
  const search = endpoint(searchURL, origin, '/search')
  url.searchParams.set('return_url', search.pathname + search.search)
  const settings = documentFrom(await backgroundFetch({ url: url.href }))
  const result = documentFrom(await backgroundFetch({ url: url.href, surugayaForm: safeSearchForm(settings, 'settings') }))
  if (result.querySelector('input[name="form_id"][value="safe_search_confirm_form"]')) {
    const confirmURL = new URL('/safe_search/config/confirm', origin)
    confirmURL.search = url.search
    await backgroundFetch({ url: confirmURL.href, surugayaForm: safeSearchForm(result, 'confirm') })
  }
  // Re-fetch the requested search even when the form redirected to another page.
  return backgroundFetch({ url: search.href })
}
