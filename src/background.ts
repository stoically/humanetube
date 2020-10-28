import { table } from "console";

const extensionUrl = browser.runtime.getURL("/");

browser.webRequest.onBeforeRequest.addListener(
  async (request) => {
    console.log(request.originUrl);
    if (request.originUrl?.startsWith(extensionUrl)) {
      return {};
    } else {
      const tab = await browser.tabs.get(request.tabId);
      if (tab.openerTabId) {
        const openerTab = await browser.tabs.get(tab.openerTabId);
        if (openerTab.url?.startsWith(extensionUrl)) {
          return {};
        }
      }
    }

    const url = new URL(request.url);
    let id;

    if (url.hostname.endsWith(".youtube.com")) {
      id = url.searchParams.get("v");
    }

    if (url.hostname.endsWith("youtu.be")) {
      id = url.pathname.substring(1);
    }

    if (id) {
      browser.tabs.create({
        url: browser.extension.getURL(`index.html?watch=${id}`),
      });
      return { cancel: true };
    }

    return {};
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking"]
);
