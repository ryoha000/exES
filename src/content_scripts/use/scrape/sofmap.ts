import { backgroundFetch } from '../utils'
import { ResultResponse, getNumber } from './scrape'

const scrapeSofmap = async (jan: string): Promise<ResultResponse[]> => {
  const body = await backgroundFetch({
    url: 'https://a.sofmap.com/search_result.aspx',
    params: { product_type: "ALL", styp: "p_bar", keyword: jan, gid: "", aac: "on" }
  })
  const doms = new DOMParser().parseFromString(body, 'text/html')
  const tds = doms.querySelectorAll("#contents_main > form > table:nth-child(3) > tbody > tr > td")
  if (!tds) {
    return []
  }

  const result = { used: 0, usedURL: "", brandNew: 0, brandNewURL: "" }
  tds.forEach(td => {
    const np = td.querySelector(".normal-price")
    if (np) {
      const price = getNumber(np.querySelector("span")?.innerHTML ?? "")
      const imgs = td.querySelectorAll("img")
      const url = (td.querySelector("span.list-name > a") as HTMLAnchorElement).href

      let isSoldOut = false
      let isUsed = false
      imgs.forEach(img => {
        if (img.alt === "限定数終了" || img.alt === "完売御礼") {
          isSoldOut = true
        }
        if (img.src === "/images/system_icon/icon_chuko.gif") {
          isUsed = true
        }
      })
      if (!isSoldOut && price && url) {
        if (isUsed && (result.used === 0 || result.used > price)) {
          result.used = price
          result.usedURL = url
        } else if (result.brandNew === 0 || result.brandNew > price) {
          result.brandNew = price
          result.brandNewURL = url
        }
      }
    }
  })
  const res: ResultResponse[] = []
  if (result.used) {
    res.push({
      title: "Sofmap(中古)",
      titleURL: `https://a.sofmap.com/search_result/exec/?mode=SEARCH&gid=&keyword_and=${jan}&keyword_not=&product_maker=&product_type=NEW&product_type=USED&price_from=&price_to=&order_by=DEFAULT&x=50&y=5&styp=p_kwsk"`,
      price: result.used,
      priceURL: result.usedURL
    })
  }
  if (result.brandNew) {
    res.push({
      title: "Sofmap(新品)",
      titleURL: `https://a.sofmap.com/search_result/exec/?mode=SEARCH&gid=&keyword_and=${jan}&keyword_not=&product_maker=&product_type=NEW&product_type=USED&price_from=&price_to=&order_by=DEFAULT&x=50&y=5&styp=p_kwsk`,
      price: result.brandNew,
      priceURL: result.brandNewURL
    })
  }
  return res
}

export default scrapeSofmap
