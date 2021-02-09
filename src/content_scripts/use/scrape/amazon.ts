import { backgroundFetch } from '../utils'
import { ResultResponse, getNumber, removeNewLine } from './scrape'

const scrapeAmazon = async (asin: string): Promise<ResultResponse> => {
  const body = await backgroundFetch({ url: `http://amazon.jp/gp/product/black-curtain-redirect.html?ie=UTF8&redirectUrl=/gp/product/${asin}` })
  const doms = new DOMParser().parseFromString(body, 'text/html')

  // TODO: id が priceblock_ourprice じゃないことがあるかも？要調査
  const priceDOM = doms.querySelector("#priceblock_ourprice")
  const titleDOM = doms.querySelector("#productTitle")
  if (!priceDOM || !titleDOM) {
    return { price: 0, title: "" }
  }
  const price = getNumber(priceDOM.innerHTML)
  const title = removeNewLine(titleDOM.innerHTML)
  return { price: price, title: title, priceURL: `http://amazon.jp/gp/product/black-curtain-redirect.html?ie=UTF8&redirectUrl=/gp/product/${asin}` }
}

export default scrapeAmazon
