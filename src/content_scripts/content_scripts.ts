import { createStore } from './store'
import { html, render } from "lit-html"
import Item from './components/item'
import { styleMap } from 'lit-html/directives/style-map.js';
import { Store } from './store'
import { getExternalLinks } from './use/scrape/scrape'
import { getRequestPromises } from './use/request';
import { convertPriceInfosToRowInfos, convertSaleInfosToRowInfos } from './use/utils';

const InitialStore = { priceInfos: [], saleInfos: [] }

window.addEventListener('load', async () => {
  try {
    const links = getExternalLinks()
    const renderApp = createApp()
    store = createStore(InitialStore, renderApp)
    renderApp()
    const promises = getRequestPromises(store, links)
    await Promise.all(promises)
  } catch (e) {
    // console.log(e)
  }
})

const App = () => {
  const styles = {
    display: "flex",
    gap: "10px",
    'margin-bottom': "10px"
  }
  return html`
    <div style="${styleMap(styles)}">
      ${Item("各通販サイトの価格", ["サイト", "価格"], convertPriceInfosToRowInfos(store().priceInfos), 2)}
      ${Item("過去のキャンペーン", ["期間", "内容"], convertSaleInfosToRowInfos(store().saleInfos))}
    </div>
  `
}

const createApp = () => {
  const container = insertElement()
  if (!container) {
    throw new Error("this page is not target")
  }
  return () => render(App(), container)
}

const BEFORE_ELEMENT_ID = "image_and_basic_infomation"
const insertElement = () => {
  const beforeElement = document.getElementById(BEFORE_ELEMENT_ID)
  if (!beforeElement) {
    console.error('批評空間の仕様が変わりました。@ryoha000 に報告していただければ幸いです。')
    return
  }

  const container = document.createElement('div')
  beforeElement.parentNode?.insertBefore(container, beforeElement.nextElementSibling)
  return container
}

let store: Store = createStore(InitialStore, () => {})
