browser.webRequest.onBeforeRequest.addListener(
  (request) => {
    if (request.originUrl?.startsWith(browser.runtime.getURL("/"))) {
      return {};
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
