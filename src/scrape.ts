import { getASINFromAmazonURL, sleep } from "./utils"

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