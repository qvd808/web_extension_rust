use futures::future::join_all;
use js_sys::Array;
use serde::Serialize;
use serde_wasm_bindgen::to_value;
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{console, window, KeyboardEvent};

mod helper;
mod wasm_bind;
use crate::helper::{extract_string, extract_u32};
use crate::wasm_bind::{get_all_tabs, group_tab_by_id};

/// Represents a Chrome tab with its associated group information
#[derive(Serialize)]
pub struct TabInfo {
    pub id: Option<u32>,
    pub title: Option<String>,
    pub group_id: Option<u32>,
    pub group_title: Option<String>,
}

/// Collects all Chrome tabs with their group information
#[wasm_bindgen]
pub async fn collect_tabs() -> Result<Array, JsValue> {
    // Fetch all tabs
    let tabs_jsvalue = JsFuture::from(get_all_tabs()).await?;
    let tabs_array: Array = tabs_jsvalue
        .dyn_into()
        .map_err(|_| JsValue::from_str("Expected an array from get_all_tabs"))?;

    // Extract tab data and collect unique group IDs
    let mut tab_data = Vec::new();
    let mut group_ids = HashSet::new();

    for tab in tabs_array.iter() {
        let id = extract_u32(&tab, "id");
        let title = extract_string(&tab, "title");
        let group_id = extract_u32(&tab, "groupId");

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

    Ok(results?.into_iter().collect::<Array>())
}

/// Fetches group titles for all provided group IDs concurrently
async fn fetch_group_titles(group_ids: HashSet<u32>) -> HashMap<u32, String> {
    let futures: Vec<_> = group_ids
        .into_iter()
        .map(|gid| async move {
            match JsFuture::from(group_tab_by_id(gid)).await {
                Ok(group_obj) => {
                    let title = extract_string(&group_obj, "title");
                    title.map(|t| (gid, t))
                }
                Err(_) => None,
            }
        })
        .collect();

    join_all(futures).await.into_iter().flatten().collect()
}
