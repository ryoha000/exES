import { editONP } from "../edit_distance"
import { getASINFromAmazonURL, getDlsiteRequestURL, sleep } from "../utils"

// const BASE_URL = "http://localhost:3000"
const BASE_URL = "https://ryoha.trap.show/exes_server"

export interface ResultResponse {
  title: string
  price: number
  titleURL?: string
  priceURL?: string
}

interface JANCodeWithAssociatedPrices {
  janCode: string
  getchu: ResultResponse
  sofmap: ResultResponse[]
  surugaya: ResultResponse[]
}

export const getJANCodeWithAssociatedPrice = async (url: URL): Promise<ResultResponse[] | null> => {
  const id = url.searchParams.get("id")
  if (!id) {
    console.error("批評空間の仕様が変わりました。@ryoha000 に報告していただければ幸いです。")
    return null
  }
  const res = await fetch(`${BASE_URL}/getchu`, {
    method: "POST",
    body: JSON.stringify({ id: id })
  })
  try {
    const text = await res.text()
    const jcwap = JSON.parse(text) as JANCodeWithAssociatedPrices

    const result: ResultResponse[] = []
    result.push(jcwap.getchu)
    result.push(...jcwap.sofmap)
    result.push(...jcwap.surugaya)
    return result
  } catch (e) {
    console.error(e)
    console.error("Getchu.comの仕様が変わりました。@ryoha000 に報告していただければ幸いです。")
    return null
  }
}

export const getAmazonPrice = async (url: URL): Promise<ResultResponse | null> => {
  let tryCount = 0
  const requestAmazonPrice = async (asin: string): Promise<ResultResponse> => {
    try {
      const res = await fetch(`${BASE_URL}/amazon`, {
        method: "POST",
        body: JSON.stringify({ asin: asin })
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const text = await res.text()
      const response = JSON.parse(text) as ResultResponse

      let max = { length: -1, distanse: 0 }
      const Len = " ErogameScape -エロゲー批評空間-".length
      const title = document.title.slice(0, -1 * Len)
      for (let i = 1; i <= response.title.length; i++) {
        const thisDistanse = editONP(response.title.slice(0, i), title)
        console.log(thisDistanse, response.title.slice(0, i))
        if (max.distanse < thisDistanse) {
          max.length = i
          max.distanse = thisDistanse
        }
      }
      if (max.length === response.title.length) {
        return  { ...response, title: `Amazon`}
      }
      return { ...response, title: `Amazon(${response.title.slice(max.length)})`}
    } catch (e) {
      tryCount++
      console.error(e)
      if (tryCount > 5) {
        throw new Error("over 5 fail")
      }
      await sleep(1000)
      return await requestAmazonPrice(asin)
    }
  }

  const asin = getASINFromAmazonURL(url)
  if (asin.length === 0) {
    return null
  }
  try {
    // サーバーからAmazonに同時にリクエストを送りたくないからわざと直列にしてる
    return await requestAmazonPrice(asin)
  } catch (e) {
    console.error(e)
    return null
  }
}

export const getFanzaPrice = async (url: URL): Promise<ResultResponse | null> => {
  try {
    const redirectURL = url.searchParams.get("lurl")
    const res = await fetch(`${BASE_URL}/fanza`, {
      method: "POST",
      body: JSON.stringify({ url: redirectURL })
    })
    const text = await res.text()
    const response = JSON.parse(text) as ResultResponse
    if (!response.price) {
      return null
    }
    return response
  } catch (e) {
    console.error(e)
    return null
  }
}

type DlsiteResponse = {
  price: number
}

export const getDlsitePrice = async (url: URL): Promise<ResultResponse | null> => {
  try {
    const reqURL = getDlsiteRequestURL(url)
    const res = await fetch(`${BASE_URL}/dlsite`, {
      method: "POST",
      body: JSON.stringify({ url: reqURL })
    })
    const text = await res.text()
    const response = JSON.parse(text) as DlsiteResponse
    if (!response.price) {
      return null
    }
    return { title: "dlsite", price: response.price, priceURL: url.toString() }
  } catch (e) {
    console.error(e)
    return null
  }
}

interface SaleInfo {
  content: string
  start: string
  end: string
}

export const getPastSaleInfo = async () => {
  try {
    const formData = new FormData()
    const id = new URL(location.href).searchParams.get("game")
    if (!id) return []
    const query = `SELECT * FROM campaign_game INNER JOIN campaignlist ON campaignlist.id = campaign_game.campaign WHERE game = '${id}';`
    formData.append("sql", query)
    const res = await fetch("https://erogamescape.dyndns.org/~ap2/ero/toukei_kaiseki/sql_for_erogamer_form.php", {
      method: "POST",
      body: formData
    })
    const text = await res.text()
    const dom = new DOMParser().parseFromString(text, "text/html")

    const saleInfos: SaleInfo[] = []
    dom.querySelectorAll("#query_result_main tr").forEach((tr, i) => {
      if (i === 0) {
        return
      }
      const content = tr.querySelector("td:nth-child(4)")
      const start = tr.querySelector("td:nth-child(10)")
      const end = tr.querySelector("td:nth-child(11)")
      if (!content || !start || !end) return
      saleInfos.push({ content: content.innerHTML, start: start.innerHTML, end: end.innerHTML })
    })
    return saleInfos
  } catch (e) {
    console.error(e)
    return []
  }
}

const EXTERNAL_LINKS_ID = "bottom_inter_links_main"
export interface ExternalLinks {
  amazon: URL[]
  getchu?: URL
  dlsite?: URL
  fanza?: URL
}

export const getExternalLinks = () => {
  const linksContainer = document.getElementById(EXTERNAL_LINKS_ID)
  if (!linksContainer) {
    throw "批評空間の仕様が変わりました。@ryoha000 に報告していただければ幸いです。"
  }

  const links: ExternalLinks = { amazon: [] }
  linksContainer.querySelectorAll('a').forEach(link => {
    const url = new URL(link.href)
    if (link.innerHTML === "Amazon") {
      links.amazon.push(url)
    }
    if (link.innerHTML === "Getchu.com") {
      links.getchu = url
    }
    if (link.innerHTML === "DLsite.com") {
      links.dlsite = url
    }
    if (link.innerHTML === "DMM") {
      links.fanza = url
    }
  })
  return links
}
