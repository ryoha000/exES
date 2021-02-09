import { backgroundFetch } from '../utils'
import { getNumber, JANCodeWithAssociatedPrices } from './scrape'

const scrapeGetchu = async (id: string): Promise<JANCodeWithAssociatedPrices> => {
  const body = await backgroundFetch({ url: 'http://www.getchu.com/soft.phtml', params: { id: id, gc: "gc" } })
  const dom = new DOMParser().parseFromString(body, 'text/html')
  let code = ""
  const trs = dom.querySelectorAll("#soft_table > tbody > tr:nth-child(2) > th > table > tbody > tr")
  trs.forEach(tr => {
    if (tr.innerHTML.includes("JANコード")) {
      code = getNumber(tr.innerHTML).toString()
    }
  })
  if (code.length !== 13 && code.length !== 8) {
    throw new Error(`invalid code length. code is ${code}`)
  }

  let getchuPrice = 0
  const getchuPrices = dom.querySelectorAll("[class^='cart_block']")
  getchuPrices.forEach(gp => {
    const getchuPriceDOM = gp.querySelector(".taxin")
    if (getchuPriceDOM) {
      if (getNumber(getchuPriceDOM.innerHTML) < getchuPrice || getchuPrice === 0) {
        getchuPrice = getNumber(getchuPriceDOM.innerHTML)
      }
    }
  })

  return { janCode: code, getchu: { title: "Getchu", priceURL: "http://www.getchu.com/soft.phtml?id=" + id, price: getchuPrice }, sofmap: [], surugaya: [] }
}

export default scrapeGetchu
