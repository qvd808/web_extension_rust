use js_sys::Reflect;
use wasm_bindgen::prelude::*;

// --- Helper functions ---
pub fn extract_u32(obj: &JsValue, field: &str) -> Option<u32> {
    Reflect::get(obj, &JsValue::from_str(field))
        .ok()
        .and_then(|v| v.as_f64())
        .and_then(|v| if v < 0.0 { None } else { Some(v as u32) }) // if asked for unsigned
                                                                   // but get negative, should
                                                                   // be an error in this case
                                                                   // return None
}

pub fn extract_string(obj: &JsValue, field: &str) -> Option<String> {
    Reflect::get(obj, &JsValue::from_str(field))
        .ok()
        .and_then(|v| v.as_string())
}

pub fn extract_f64(obj: &JsValue, field: &str) -> Option<f64> {
    Reflect::get(obj, &JsValue::from_str(field))
        .ok()
        .and_then(|v| v.as_f64())
}
