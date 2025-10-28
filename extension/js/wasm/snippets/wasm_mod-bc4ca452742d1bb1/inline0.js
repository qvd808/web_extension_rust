
export function getTabsPromise() {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.query({}, resolve);
        } catch (err) {
            reject(err);
        }
    });
}
