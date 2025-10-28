// This file is not used for WASM builds.
// When building with wasm-pack, only lib.rs is compiled.
// The main() function in lib.rs (marked with #[wasm_bindgen(start)])
// is the entry point that runs automatically when WASM loads.

fn main() {
    println!("This main.rs is not used in WASM builds.");
    println!("The entry point is in lib.rs with #[wasm_bindgen(start)]");
}
