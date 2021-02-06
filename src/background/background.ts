// @ts-ignore
chrome.runtime.onMessage.addListener(
  (url: string, _: () => void, onSuccess: (res: string) => void) => {
    fetch(url)
      .then(response => response.text())
      .then(responseText => onSuccess(responseText))
    return true
  }
)
