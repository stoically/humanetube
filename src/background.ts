const EXTENSION_URL = browser.runtime.getURL("/");

class WebRequest {
  private readonly request: browser.webRequest._OnBeforeRequestDetails;

  constructor(request: browser.webRequest._OnBeforeRequestDetails) {
    this.request = request;
  }

  async originatedFromExtension() {
    if (this.request.originUrl?.startsWith(EXTENSION_URL)) {
      return true;
    } else {
      const tab = await browser.tabs.get(this.request.tabId);
      if (tab.openerTabId) {
        const openerTab = await browser.tabs.get(tab.openerTabId);
        if (openerTab.url?.startsWith(EXTENSION_URL)) {
          return true;
        }
      }
    }
  }

  debug(message: string, ...args: any[]) {
    console.log(`[request ${this.request.requestId}] ${message}`, ...args);
  }

  async handle() {
    this.debug("handling", this.request);

    if (await this.originatedFromExtension()) {
      return {};
    }

    const url = new URL(this.request.url);
    let id;

    if (url.hostname.endsWith(".youtube.com")) {
      id = url.searchParams.get("v");
    }

    if (url.hostname.endsWith("youtu.be")) {
      id = url.pathname.substring(1);
    }

    if (id) {
      const url = browser.extension.getURL(`index.html?watch=${id}`);

      if (this.request.type === "main_frame") {
        this.debug("creating tab", url);
        browser.tabs.create({ url });
        return { cancel: true };
      }

      if (this.request.type === "sub_frame") {
        this.debug("redirecting to", url);
        return { redirectUrl: url };
      }
    }

    return {};
  }
}

browser.webRequest.onBeforeRequest.addListener(
  async (webRequest) => {
    return new WebRequest(webRequest).handle();
  },
  { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
  ["blocking"]
);
