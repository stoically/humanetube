const EXTENSION_URL = browser.runtime.getURL("index.html");

interface WebRequestCtorArgs {
  request: browser.webRequest._OnBeforeRequestDetails;
  url: URL;
  tab: browser.tabs.Tab;
  openerTab?: browser.tabs.Tab;
}

class WebRequest {
  private readonly request: browser.webRequest._OnBeforeRequestDetails;
  private readonly url: URL;
  private readonly tab: browser.tabs.Tab;
  private readonly openerTab?: browser.tabs.Tab;

  constructor({ request, tab, url, openerTab }: WebRequestCtorArgs) {
    this.request = request;
    this.url = url;
    this.tab = tab;
    this.openerTab = openerTab;
  }

  static async factory(request: browser.webRequest._OnBeforeRequestDetails) {
    const tab = await browser.tabs.get(request.tabId);
    const url = new URL(request.url);
    const openerTab =
      (tab.openerTabId && (await browser.tabs.get(tab.openerTabId))) ||
      undefined;

    return new WebRequest({ request, url, tab, openerTab });
  }

  originatedFromExtension() {
    return (
      !!this.request.originUrl?.startsWith(EXTENSION_URL) ||
      !!this.openerTab?.url?.startsWith(EXTENSION_URL)
    );
  }

  parseYtIdFromUrl() {
    let id;

    if (this.url.hostname.endsWith(".youtube.com")) {
      id = this.url.searchParams.get("v");
    }

    if (this.url.hostname.endsWith("youtu.be")) {
      id = this.url.pathname.substring(1);
    }

    return id;
  }

  async handle() {
    this.debug("handling", this.request);

    if (this.originatedFromExtension()) {
      return {};
    }

    const id = this.parseYtIdFromUrl();
    if (id) {
      const url = `${EXTENSION_URL}?watch=${id}`;

      if (this.request.type === "main_frame") {
        this.debug("creating tab", url);

        browser.tabs.create({
          url,
          index: this.tab.index + 1,
          windowId: this.tab.windowId,
          openerTabId: this.openerTab?.id,
        });
        return { cancel: true };
      }
    }

    return {};
  }

  debug(message: string, ...args: unknown[]) {
    console.log(`[request ${this.request.requestId}] ${message}`, ...args);
  }
}

browser.webRequest.onBeforeRequest.addListener(
  async (request) => {
    return (await WebRequest.factory(request)).handle();
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking"]
);
