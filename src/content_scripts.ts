window.onload = function() {
  insertElement()
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
