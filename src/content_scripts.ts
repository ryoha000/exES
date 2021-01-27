window.onload = function() {
  insertElement()
  getExternalLinks()
}

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
    console.error('批評空間の仕様が変わりました。@ryoha000 に報告していただければ幸いです。')
    return
  }

  const links: { [key in ExternalSiteName]: string[] } = { amazon: [], getchu: [], dlsite: [], fanza: [] }
  linksContainer.querySelectorAll('a').forEach(link => {
    const url = new URL(link.href)
    if (link.innerHTML === "Amazon") {
      links.amazon.push(url.toString())
    }
    if (link.innerHTML === "Getchu.com") {
      links.getchu.push(url.toString())
    }
    if (link.innerHTML === "DLsite.com") {
      links.dlsite.push(url.toString())
    }
    if (link.innerHTML === "DMM") {
      links.fanza.push(url.toString())
    }
  })
  console.log(links)
}
