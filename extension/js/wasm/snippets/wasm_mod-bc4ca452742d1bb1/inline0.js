
    export function getTabs(callback) {
        chrome.tabs.query({}, callback);
    }
