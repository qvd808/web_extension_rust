use futures::future::join_all;
use js_sys::{Array, Promise, Reflect};
use serde::Serialize;
use serde_wasm_bindgen::to_value;
use std::collections::{HashMap, HashSet};
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

/// Represents a Chrome tab with its associated group information
#[derive(Serialize)]
pub struct TabInfo {
    pub id: Option<u32>,
    pub title: Option<String>,
    pub group_id: Option<u32>,
    pub group_title: Option<String>,
}

/// Collects all Chrome tabs with their group information.
/// Fetches group data concurrently for better performance.
#[wasm_bindgen]
pub async fn collect_tabs() -> Result<Array, JsValue> {
    // Fetch all tabs
    let tabs_jsvalue = JsFuture::from(getTabsPromise()).await?;
    let tabs_array: Array = tabs_jsvalue
        .dyn_into()
        .map_err(|_| JsValue::from_str("Expected an array from getTabsPromise"))?;

    // Extract tab data and collect unique group IDs
    let mut tab_data = Vec::new();
    let mut group_ids = HashSet::new();

    for tab in tabs_array.iter() {
        let id = extract_u32(&tab, "id");
        let title = extract_string(&tab, "title");
        let group_id = extract_group_id(&tab);

        if let Some(gid) = group_id {
            group_ids.insert(gid);
        }

        tab_data.push((id, title, group_id));
    }

    // Fetch all group titles concurrently
    let group_titles = fetch_group_titles(group_ids).await;

    // Build final result
    let results: Result<Vec<_>, _> = tab_data
        .into_iter()
        .map(|(id, title, group_id)| {
            let group_title = group_id.and_then(|gid| group_titles.get(&gid).cloned());

            to_value(&TabInfo {
                id,
                title,
                group_id,
                group_title,
            })
            .map_err(|e| JsValue::from_str(&format!("Serialization failed: {:?}", e)))
        })
        .collect();

    let values = results?;
    Ok(values.into_iter().collect::<Array>())
}

/// Fetches group titles for all provided group IDs concurrently
async fn fetch_group_titles(group_ids: HashSet<u32>) -> HashMap<u32, String> {
    let futures: Vec<_> = group_ids
        .iter()
        .map(|&gid| async move {
            match JsFuture::from(getGroupTabById(gid)).await {
                Ok(group_obj) => {
                    let title = extract_string(&group_obj, "title");
                    title.map(|t| (gid, t))
                }
                Err(_) => None,
            }
        })
        .collect();

    let results = join_all(futures).await;
    results.into_iter().flatten().collect()
}

/// Safely extracts a u32 field from a JS object
fn extract_u32(obj: &JsValue, field: &str) -> Option<u32> {
    Reflect::get(obj, &JsValue::from_str(field))
        .ok()
        .and_then(|v| v.as_f64())
        .map(|v| v as u32)
}

/// Safely extracts a String field from a JS object
fn extract_string(obj: &JsValue, field: &str) -> Option<String> {
    Reflect::get(obj, &JsValue::from_str(field))
        .ok()
        .and_then(|v| v.as_string())
}

/// Extracts group ID, treating negative values as None (Chrome uses -1 for ungrouped tabs)
fn extract_group_id(obj: &JsValue) -> Option<u32> {
    Reflect::get(obj, &JsValue::from_str("groupId"))
        .ok()
        .and_then(|v| v.as_f64())
        .and_then(|v| if v < 0.0 { None } else { Some(v as u32) })
}
