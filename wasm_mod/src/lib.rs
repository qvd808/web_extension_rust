use wasm_bindgen::prelude::*;
use web_sys::console;

// Export hello_world function to JavaScript
#[wasm_bindgen]
pub fn hello_world() {
    console::log_1(&"Hello from WASM!".into());
}

// This function will be called from JavaScript popup
#[wasm_bindgen]
pub fn show_alert(message: &str) -> String {
    console::log_1(&format!("WASM received message: {}", message).into());
    format!("Hello from Rust/WASM! You said: {}", message)
}
