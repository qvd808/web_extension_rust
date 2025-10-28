use js_sys::{Array, Function, Object, Promise, Reflect};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

#[wasm_bindgen(inline_js = r#"
    export function getTabs(callback) {
        chrome.tabs.query({}, callback);
    }
"#)]
extern "C" {
    fn getTabs(callback: &Function);
}

#[wasm_bindgen]
pub fn collect_tabs() -> Promise {
    Promise::new(&mut |resolve, _reject| {
        let resolve = resolve.clone();

        // Create the callback that processes tabs
        let callback = Closure::once(move |tabs: Array| {
            let result = Array::new();

            for tab in tabs.iter() {
                let tab = tab.dyn_into::<Object>().unwrap();
                let obj = Object::new();

                let id = Reflect::get(&tab, &JsValue::from_str("id")).unwrap_or(JsValue::NULL);
                let title =
                    Reflect::get(&tab, &JsValue::from_str("title")).unwrap_or(JsValue::NULL);

                Reflect::set(&obj, &JsValue::from_str("id"), &id).unwrap();
                Reflect::set(&obj, &JsValue::from_str("title"), &title).unwrap();

                result.push(&obj);
            }

            // Resolve the promise
            let _ = resolve.call1(&JsValue::undefined(), &result);
        });

        getTabs(callback.as_ref().unchecked_ref());
        callback.forget();
    })
}
