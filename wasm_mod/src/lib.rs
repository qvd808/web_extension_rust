use futures::future::join_all;
use js_sys::Array;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::to_value;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use sublime_fuzzy::best_match;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;

mod helper;
mod wasm_bind;
use crate::helper::{extract_f64, extract_string, extract_u32};
use crate::wasm_bind::{get_all_tabs, group_tab_by_id};

/// Represents a Chrome tab with its associated group information
#[derive(Serialize, Deserialize)]
pub struct TabInfo {
    pub id: Option<u32>,
    pub title: Option<String>,
    pub url: Option<String>,
    pub last_accessed: Option<f64>,
    pub group_id: Option<u32>,
    pub group_title: Option<String>,
}

thread_local! {
    static TABS: RefCell<Vec<TabInfo>> = RefCell::new(Vec::new());

    static LAST_QUERY: RefCell<String> = RefCell::new(String::new());
    static LAST_RESULTS: RefCell<Vec<usize>> = RefCell::new(Vec::new());
}

#[wasm_bindgen]
pub fn initialize_tabs(tabs: JsValue) -> Result<(), JsValue> {
    let tabs: Vec<TabInfo> = serde_wasm_bindgen::from_value(tabs)?;
    TABS.with(|t| *t.borrow_mut() = tabs);
    Ok(())
}

#[wasm_bindgen]
pub fn fuzzy_search(query: &str) -> Result<Array, JsValue> {
    TABS.with(|tabs| {
        let tabs_ref = tabs.borrow();
        let mut scored: Vec<_> = tabs_ref
            .iter()
            .enumerate()
            .filter_map(|(idx, tab)| {
                let title = tab.title.as_ref()?;
                best_match(query, title).map(|m| (idx, tab, m.score()))
            })
            .collect();

        scored.sort_by(|a, b| b.2.cmp(&a.2));

        LAST_QUERY.with(|lq| *lq.borrow_mut() = query.to_string());
        LAST_RESULTS.with(|lr| {
            *lr.borrow_mut() = scored.iter().map(|(idx, _, _)| *idx).collect();
        });

        scored
            .into_iter()
            .take(50)
            .map(|(_, tab, _)| to_value(tab))
            .collect::<Result<Vec<_>, _>>()
            .map(|v| v.into_iter().collect())
            .map_err(|e| e.into())
    })
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
        let url = extract_string(&tab, "url");
        let last_accessed = extract_f64(&tab, "lastAccessed");
        let group_id = extract_u32(&tab, "groupId");

        if let Some(gid) = group_id {
            group_ids.insert(gid);
        }

        tab_data.push((id, title, url, last_accessed, group_id));
    }

    // Fetch all group titles concurrently
    let group_titles = fetch_group_titles(group_ids).await;

    // Build final result
    let results: Result<Vec<_>, _> = tab_data
        .into_iter()
        .map(|(id, title, url, last_accessed, group_id)| {
            let group_title = group_id.and_then(|gid| group_titles.get(&gid).cloned());

            to_value(&TabInfo {
                id,
                title,
                url,
                last_accessed,
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
