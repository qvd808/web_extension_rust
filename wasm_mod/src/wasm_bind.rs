use js_sys::Promise;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(inline_js = r#"
export function getTabsPromise() {
    return new Promise((resolve, reject) => {
        try { chrome.tabs.query({}, resolve); }
        catch (err) { reject(err); }
    });
}
"#)]
extern "C" {
    fn getTabsPromise() -> Promise;
}

#[wasm_bindgen(inline_js = r#"
export function getGroupTabById(id) {
    return chrome.tabGroups.get(id);
}
"#)]
extern "C" {
    fn getGroupTabById(id: u32) -> Promise;
}

// Public Rust wrappers so other modules can use them
pub fn get_all_tabs() -> Promise {
    getTabsPromise()
}

pub fn group_tab_by_id(id: u32) -> Promise {
    getGroupTabById(id)
}
