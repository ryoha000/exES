import { getASINFromAmazonURL, getDlsiteIDFromURL, sleep } from "./utils"

const BASE_URL = "http://localhost:3000"

interface JANCodeWithAssociatedPrices {
  janCode: string
  getchuPrice: number
  sofmap: null | { used: number; brandNew: number }
  surugaya: null | { used: number; marketplace: number }
}

export const getJANCodeWithAssociatedPrices = async (url: URL): Promise<JANCodeWithAssociatedPrices | null> => {
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
    return JSON.parse(text) as JANCodeWithAssociatedPrices
  } catch (e) {
    console.error(e)
    console.error("Getchu.comの仕様が変わりました。@ryoha000 に報告していただければ幸いです。")
    return null
  }
}

interface AmazonResponse {
  price: number
  title: string
}

export const getAmazonPrices = async (urls: URL[]): Promise<AmazonResponse[]> => {
  let tryCount = 0
  const requestAmazonPrice = async (asin: string): Promise<AmazonResponse> => {
    try {
      const res = await fetch(`${BASE_URL}/amazon`, {
        method: "POST",
        body: JSON.stringify({ asin: asin })
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const text = await res.text()
      return JSON.parse(text) as AmazonResponse
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

  const res: AmazonResponse[] = []
  for (const url of urls) {
    tryCount = 0
    const asin = getASINFromAmazonURL(url)
    if (asin.length === 0) {
      res.push({ price: 0, title: "" })
    }
    try {
      // サーバーからAmazonに同時にリクエストを送りたくないからわざと直列にしてる
      res.push(await requestAmazonPrice(asin))
    } catch (e) {
      console.error(e)
    }
  }
  return res
}

interface FanzaResponse {
  price: number
}

export const getFanzaPrice = async (urls: URL[]): Promise<FanzaResponse[]> => {
  try {
    const result = []
    for (const url of urls) {
      const redirectURL = url.searchParams.get("lurl")
      if (!redirectURL) continue
      const res = await fetch(`${BASE_URL}/fanza`, {
        method: "POST",
        body: JSON.stringify({ url: redirectURL })
      })
      const text = await res.text()
      result.push(JSON.parse(text) as FanzaResponse)
    }
    return result
  } catch (e) {
    console.error(e)
    return []
  }
}

type DlsiteResponse = FanzaResponse
export const getDlsitePrice = async (url: URL): Promise<DlsiteResponse | null> => {
  try {
    const id = getDlsiteIDFromURL(url)
    const res = await fetch(`${BASE_URL}/dlsite`, {
      method: "POST",
      body: JSON.stringify({ id: id })
    })
    const text = await res.text()
    return JSON.parse(text) as DlsiteResponse
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
type ExternalSiteName = "amazon" | "getchu" | "dlsite" | "fanza"
type LinkSiteName = "comshop" | "sofmap" | "surugaya" | ExternalSiteName
export const getExternalLinks = () => {
  const linksContainer = document.getElementById(EXTERNAL_LINKS_ID)
  if (!linksContainer) {
    throw "批評空間の仕様が変わりました。@ryoha000 に報告していただければ幸いです。"
  }

  const links: { [key in ExternalSiteName]: URL[] } = { amazon: [], getchu: [], dlsite: [], fanza: [] }
  linksContainer.querySelectorAll('a').forEach(link => {
    const url = new URL(link.href)
    if (link.innerHTML === "Amazon") {
      links.amazon.push(url)
    }
    if (link.innerHTML === "Getchu.com") {
      links.getchu.push(url)
    }
    if (link.innerHTML === "DLsite.com") {
      links.dlsite.push(url)
    }
    if (link.innerHTML === "DMM") {
      links.fanza.push(url)
    }
  })
  return links
}
