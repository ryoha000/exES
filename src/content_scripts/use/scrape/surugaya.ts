import { backgroundFetch } from '../utils'
import { getNumber, ResultResponse } from './scrape'

const scrapeSurugaya = async (jan: string): Promise<ResultResponse[]> => {
  try {
    const body = await backgroundFetch({
      url: 'https://www.suruga-ya.jp/search',
      params: { search_word: jan, searchbox: 1, is_marketplace: 0 }}
    )
    const doms = new DOMParser().parseFromString(body, 'text/html')
    let usedDOM = doms.querySelector("#search_result > div > div > div.item_price > p:nth-child(1) > span.text-red > strong")
    const usedTitleDOM = doms.querySelector("div.item_detail > .title > a")
    if (!usedDOM) {
      usedDOM = doms.querySelector("#search_result > div > div:nth-child(1) > div.item_price > p:nth-child(3) > span.text-red > strong")
    }
  
    const marketplaceDOM = doms.querySelector("#search_result > div > div > div.item_price > div > p.mgnB5.mgnT5 > span.text-red.fontS15 > strong")
    const marketplaceTitleDOM = doms.querySelector("#search_result > div > div:nth-child(1) > div.item_price > div > p.mgnL-3 > a")
  
    const result: ResultResponse[] = []
    if (usedDOM && usedTitleDOM) {
      result.push({
        price: getNumber(usedDOM.innerHTML),
        priceURL: (usedTitleDOM as HTMLAnchorElement).href,
        titleURL: "https://www.suruga-ya.jp/search?category=&search_word=" + jan + "&searchbox=1&is_marketplace=0",
        title: "駿河屋(中古)"
      })
    }
  
    if (marketplaceDOM && marketplaceTitleDOM) {
      result.push({
        price: getNumber(marketplaceDOM.innerHTML),
        priceURL: (marketplaceTitleDOM as HTMLAnchorElement).href,
        titleURL: "https://www.suruga-ya.jp/search?category=&search_word=" + jan + "&searchbox=1&is_marketplace=0",
        title: "駿河屋(マケプレ)"
      })
    }
  
    return result
  } catch (e) {
    console.error(e)
    return []
  }
}

export default scrapeSurugaya
