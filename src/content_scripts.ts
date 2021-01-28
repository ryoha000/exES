import { getJANCodeWithAssociatedPrices } from './scrape'

window.addEventListener('load', async () => {
  insertElement()
  const links = getExternalLinks()
  if (links.getchu.length) {
    const getchu = await getJANCodeWithAssociatedPrices(links.getchu[0])
    console.log(getchu)
    if (getchu) {
      console.log(`JAN: ${getchu.janCode}`)
    }
  } else { console.log("getchu url is not found") }
})

const BEFORE_ELEMENT_ID = "image_and_basic_infomation"
const insertElement = () => {
  const beforeElement = document.getElementById(BEFORE_ELEMENT_ID)
  if (!beforeElement) {
    console.error('批評空間の仕様が変わりました。@ryoha000 に報告していただければ幸いです。')
    return
  }

  const container = document.createElement('div')
  container.innerHTML = 'container'
  beforeElement.parentNode?.insertBefore(container, beforeElement.nextElementSibling)
}

const EXTERNAL_LINKS_ID = "bottom_inter_links_main"
type ExternalSiteName = "amazon" | "getchu" | "dlsite" | "fanza"
type LinkSiteName = "comshop" | "sofmap" | "surugaya" | ExternalSiteName
const getExternalLinks = () => {
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
