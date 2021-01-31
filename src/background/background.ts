// @ts-ignore
chrome.webRequest.onBeforeRequest.addListener(
  function (details: { url: string }) {
    console.log(details.url);
  },
  {urls: ['<all_urls>']},
  []
);