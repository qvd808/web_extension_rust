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

    let mapped_array = tabs_array
        .iter()
        .filter_map(|e| from_value(e).ok())
        .map(|tab_info: TabInfo| to_value(&tab_info).unwrap())
        .collect::<Array>();

    Ok(mapped_array)
}
