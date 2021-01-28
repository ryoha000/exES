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
  const res = await fetch(`https://ryoha.trap.show/exes_server/getchu`, {
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
