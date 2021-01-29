import { getAmazonPrices, getDlsitePrice, getFanzaPrice, getJANCodeWithAssociatedPrices, getPastSaleInfo } from './scrape'
import { html, render } from 'lit-html'

const App = () => html`
  <div>
    <h3>container</h3>
  </div>
`

window.addEventListener('load', async () => {
  const container = insertElement()
  if (!container) {
    console.log("this page is not target")
    return
  }
  render(App(), container)
  const links = getExternalLinks()
  const infos = await getPastSaleInfo()
  console.log(infos)
  // if (links.getchu.length) {
  //   const getchu = await getJANCodeWithAssociatedPrices(links.getchu[0])
  //   console.log(getchu)
  //   if (getchu) {
  //     console.log(`JAN: ${getchu.janCode}`)
  //   }

  //   const fanza = await getFanzaPrice(links.fanza)
  //   console.log(fanza)

  //   if (links.dlsite.length !== 0) {
  //     const dlsite = await getDlsitePrice(links.dlsite[0])
  //     console.log(dlsite)
  //   }

  //   const start = performance.now()
  //   console.log("get amazon start")
  //   const amazonz = await getAmazonPrices(links.amazon)
  //   console.log("amazon end", (performance.now() - start) / 1000)
  //   console.log(amazonz)
  // } else { console.log("getchu url is not found") }
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
  return container
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
