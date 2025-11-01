### Introduction

### References
- [Chrome extension example with Rust and WASM](https://dev.to/rimutaka/chrome-extension-with-rust-and-wasm-by-example-5cbh)

## Key sequence state machine (content script)

This extension implements Vim-like key sequences using a small state machine driven by a single timer. States map to `SEQUENCE_STATE` in `extension/js/src/vim_mode.js`.

```mermaid
stateDiagram-v2
		[*] --> IDLE

		state "IDLE" as IDLE
		state "PREFIX (waiting for more)" as PREFIX
		state "PENDING_EXACT (shorter exact deferred)" as PENDING

		IDLE --> EXECUTE: key → exact (no children)
		IDLE --> PENDING: key → exact (+ children)
		IDLE --> PREFIX:  key → prefix

		PREFIX --> EXECUTE: timeout ∧ lastExact exists
		PREFIX --> IDLE:    timeout ∧ no lastExact
		PREFIX --> PREFIX:  key continues → still prefix
		PREFIX --> PENDING: key continues → exact (+ children)
		PREFIX --> EXECUTE: key continues → exact (no children)
		PREFIX --> IDLE:    diverge → clear, then fallback latest token path

		PENDING --> EXECUTE: timeout (run deferred exact)
		PENDING --> EXECUTE: diverge (flush deferred exact immediately)
		PENDING --> PREFIX:  key continues → prefix
		PENDING --> EXECUTE: key continues → exact (no children)
		PENDING --> PENDING: key continues → exact (+ children)

		EXECUTE --> IDLE: run handler, clear buffer/state

		note right of IDLE
			Matching uses a trie and a small ring buffer:
			- Only first token encodes modifiers (e.g., C-, S-)
			- Ring buffer capacity = longest registered command
			- Single 500ms timer governs PREFIX/PENDING behaviors
		end note
```

Legend
- exact: current tokens fully match a command
- has children: the matched command is also a prefix of longer commands
- prefix: current tokens are a valid prefix of one or more commands
- diverge: next key can’t extend the current buffer (no match)

See `extension/js/src/vim_mode.js` for the implementation:
- `SEQUENCE_STATE` enum-like object
- Single timer: `seqTimerId`
- State & handler slots: `seqState`, `seqHandler`
- Buffer & matcher: ring buffer + trie (`attemptMatchFromRing`)

Tip: GitHub renders Mermaid diagrams in README. In VS Code, use the built-in Markdown preview or a Mermaid/Markdown preview extension if needed.
