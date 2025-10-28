use futures::future::join_all;
use js_sys::{Array, Promise};
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;

#[wasm_bindgen(inline_js = r#"
export function getTabsPromise() {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.query({}, resolve);
        } catch (err) {
            reject(err);
        }
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

// Using serde serailize and deserialize can be bottle neck performance, if there is performance
// issue, take a look at this
#[derive(Serialize, Deserialize)]
pub struct TabInfo {
    pub id: Option<u32>,
    pub title: Option<String>,
    #[serde(rename = "groupId", deserialize_with = "group_id_option")]
    pub group_id: Option<u32>,
    pub group_title: Option<String>,
}

// Custom deserializer: Handle where groupId in JS = -1, then return None
fn group_id_option<'de, D>(deserializer: D) -> Result<Option<u32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let val: i32 = Deserialize::deserialize(deserializer)?;
    if val < 0 {
        Ok(None)
    } else {
        Ok(Some(val as u32))
    }
}

#[wasm_bindgen]
// Return prommise for best pratice
pub async fn collect_tabs() -> Result<Array, JsValue> {
    // Await the Promise, if fails propagate the error from getTabsPromise to the result
    let tabs_jsvalue = JsFuture::from(getTabsPromise()).await?;

    let tabs_array: Array = tabs_jsvalue
        .dyn_into()
        .map_err(|_| JsValue::from_str("Expected an array from getTabsPromise"))?;

    let tab_infos: Vec<TabInfo> = tabs_array
        .iter()
        .filter_map(|e| from_value(e).ok())
        .collect();

    // Step 3: fetch group titles asynchronously for each tab
    let futures_vec = tab_infos.into_iter().map(|mut tab| async move {
        if let Some(group_id) = tab.group_id {
            let js_val = JsFuture::from(getGroupTabById(group_id)).await.ok();

            // Chrome returns an object with a "title" property
            if let Some(obj) = js_val {
                let title = js_sys::Reflect::get(&obj, &JsValue::from_str("title"))
                    .ok()
                    .and_then(|v| v.as_string());
                tab.group_title = title;
            }
        }
        tab
    });

    let resolved_tabs: Vec<TabInfo> = join_all(futures_vec).await;

    // Step 4: convert back to JS Array
    let mapped_array = resolved_tabs
        .into_iter()
        .map(|tab_info| to_value(&tab_info).unwrap())
        .collect::<Array>();

    Ok(mapped_array)
}
