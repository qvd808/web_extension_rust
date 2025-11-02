// Core utilities and lightweight components to keep search_ui lean and fast.

export class Debouncer {
  constructor(delay = 120) {
    this.delay = delay;
    this.id = null;
  }
  run(fn) {
    if (this.id) clearTimeout(this.id);
    this.id = setTimeout(() => {
      this.id = null;
      try { fn(); } catch (_) {}
    }, this.delay);
  }
  flush(fn) {
    if (this.id) {
      clearTimeout(this.id);
      this.id = null;
    }
    try { fn(); } catch (_) {}
  }
}

export class BackgroundSearchClient {
  search(query) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'fuzzySearch', query: String(query || '') }, (resp) => {
          if (!resp || resp.ok !== true) return resolve([]);
          resolve(Array.isArray(resp.results) ? resp.results : []);
        });
      } catch (_) {
        resolve([]);
      }
    });
  }
  activateTab(tabId) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'activateTab', tabId }, () => resolve());
      } catch (_) {
        resolve();
      }
    });
  }
}

export class ResultsModel {
  constructor() {
    this.items = [];
    this.selectedIdx = -1;
  }
  size() { return this.items.length; }
  keyOf(it) {
    const id = (it && (typeof it.id === 'number' ? it.id : it.id || '')) + '';
    const url = (it && it.url) || '';
    const title = (it && it.title) || '';
    return `${id}|${url}|${title}`;
  }
  equals(list) {
    if (!Array.isArray(list)) return false;
    if (list.length !== this.items.length) return false;
    for (let i = 0; i < list.length; i++) {
      if (this.keyOf(list[i]) !== this.keyOf(this.items[i])) return false;
    }
    return true;
  }
  setItems(list) {
    if (this.equals(list)) return false;
    this.items = Array.isArray(list) ? list : [];
    // Preserve selection if possible, else select first
    if (this.items.length === 0) {
      this.selectedIdx = -1;
    } else {
      if (this.selectedIdx < 0) this.selectedIdx = 0;
      if (this.selectedIdx >= this.items.length) this.selectedIdx = this.items.length - 1;
    }
    return true;
  }
  move(delta) {
    if (!this.items.length) return null;
    const n = this.items.length;
    this.selectedIdx = (this.selectedIdx + delta + n) % n;
    return this.current();
  }
  current() {
    if (this.selectedIdx < 0 || this.selectedIdx >= this.items.length) return null;
    return this.items[this.selectedIdx];
  }
}
