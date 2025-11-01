// extension/js/src/dom_logic.js
var inited = false;
var host;
var shadow;
var badgeEl;
var panelEl;
function initOnce() {
  if (inited) return;
  inited = true;
  host = document.createElement("div");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.inset = "auto 16px 16px auto";
  shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .badge {
      font: 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #222; color: #fff;
      padding: 6px 8px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      cursor: default; user-select: none;
      min-width: 60px; text-align: center;
    }
    .panel {
      margin-top: 8px;
      width: 340px; max-height: 260px; overflow: auto;
      background: #1e1e1e; color: #ccc; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
      border: 1px solid #333;
      padding: 10px;
      display: none;
    }
    .panel h4 { margin: 0 0 8px 0; color: #fff; font-weight: 600; }
    .panel p { margin: 0; line-height: 1.4; }
    .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background:#2a2a2a; padding:2px 6px; border-radius:6px; }
  `;
  badgeEl = document.createElement("div");
  badgeEl.className = "badge";
  badgeEl.textContent = "Ready";
  panelEl = document.createElement("div");
  panelEl.className = "panel";
  panelEl.innerHTML = `
    <h4>Demo Panel</h4>
    <p>Press <span class="kbd">Ctrl</span> + <span class="kbd">K</span> to toggle this panel.</p>
    <p>Last key: <span id="last-key">\u2014</span></p>
  `;
  shadow.append(style, badgeEl, panelEl);
  document.documentElement.appendChild(host);
}
function onKeydown(e) {
  if (badgeEl) badgeEl.textContent = `Key: ${e.key}`;
  const lastKey = shadow?.getElementById?.("last-key");
  if (lastKey) lastKey.textContent = `${e.ctrlKey ? "Ctrl+" : ""}${e.key}`;
  if (e.ctrlKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    togglePanel();
  }
}
function togglePanel() {
  if (!panelEl) return;
  const nowVisible = panelEl.style.display !== "block";
  panelEl.style.display = nowVisible ? "block" : "none";
  if (nowVisible) {
    if (badgeEl) badgeEl.textContent = "Panel open";
  }
}
function cleanup() {
  try {
    host?.remove();
  } finally {
    inited = false;
    host = null;
    shadow = null;
    badgeEl = null;
    panelEl = null;
  }
}
export {
  cleanup,
  initOnce,
  onKeydown
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2RvbV9sb2dpYy5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gTWluaW1hbCBVSTogYSBzbWFsbCBiYWRnZSBhbmQgYSB0b2dnbGVhYmxlIHBhbmVsLiBUb2dnbGUgd2l0aCBDdHJsK0suXG4vLyBJbmNsdWRlIHZpbSBtb2RlIHNpZGUtZWZmZWN0cyAod2lsbCBiZSBidW5kbGVkIGludG8gdGhpcyBFU00gb3V0cHV0KVxubGV0IGluaXRlZCA9IGZhbHNlO1xubGV0IGhvc3Q7ICAgICAgICAgLy8gPGRpdj4gaG9zdCBhdHRhY2hlZCB0byBET01cbmxldCBzaGFkb3c7ICAgICAgIC8vIFNoYWRvd1Jvb3RcbmxldCBiYWRnZUVsOyAgICAgIC8vIHNtYWxsIHN0YXR1cyBiYWRnZVxubGV0IHBhbmVsRWw7ICAgICAgLy8gdG9nZ2xlYWJsZSBwYW5lbFxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdE9uY2UoKSB7XG4gIGlmIChpbml0ZWQpIHJldHVybjtcbiAgaW5pdGVkID0gdHJ1ZTtcblxuICAvLyBIb3N0IHRoYXQgaXNvbGF0ZXMgVUlcbiAgaG9zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBob3N0LnN0eWxlLmFsbCA9ICdpbml0aWFsJztcbiAgaG9zdC5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gIGhvc3Quc3R5bGUuekluZGV4ID0gJzIxNDc0ODM2NDcnO1xuICBob3N0LnN0eWxlLmluc2V0ID0gJ2F1dG8gMTZweCAxNnB4IGF1dG8nO1xuXG4gIHNoYWRvdyA9IGhvc3QuYXR0YWNoU2hhZG93KHsgbW9kZTogJ29wZW4nIH0pO1xuXG4gIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgOmhvc3QgeyBhbGw6IGluaXRpYWw7IH1cbiAgICAuYmFkZ2Uge1xuICAgICAgZm9udDogMTJweCBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIFNlZ29lIFVJLCBSb2JvdG8sIHNhbnMtc2VyaWY7XG4gICAgICBiYWNrZ3JvdW5kOiAjMjIyOyBjb2xvcjogI2ZmZjtcbiAgICAgIHBhZGRpbmc6IDZweCA4cHg7IGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICAgIGJveC1zaGFkb3c6IDAgNHB4IDE2cHggcmdiYSgwLDAsMCwuMjUpO1xuICAgICAgY3Vyc29yOiBkZWZhdWx0OyB1c2VyLXNlbGVjdDogbm9uZTtcbiAgICAgIG1pbi13aWR0aDogNjBweDsgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgIH1cbiAgICAucGFuZWwge1xuICAgICAgbWFyZ2luLXRvcDogOHB4O1xuICAgICAgd2lkdGg6IDM0MHB4OyBtYXgtaGVpZ2h0OiAyNjBweDsgb3ZlcmZsb3c6IGF1dG87XG4gICAgICBiYWNrZ3JvdW5kOiAjMWUxZTFlOyBjb2xvcjogI2NjYzsgYm9yZGVyLXJhZGl1czogMTBweDtcbiAgICAgIGJveC1zaGFkb3c6IDAgOHB4IDI0cHggcmdiYSgwLDAsMCwuMzUpO1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgIzMzMztcbiAgICAgIHBhZGRpbmc6IDEwcHg7XG4gICAgICBkaXNwbGF5OiBub25lO1xuICAgIH1cbiAgICAucGFuZWwgaDQgeyBtYXJnaW46IDAgMCA4cHggMDsgY29sb3I6ICNmZmY7IGZvbnQtd2VpZ2h0OiA2MDA7IH1cbiAgICAucGFuZWwgcCB7IG1hcmdpbjogMDsgbGluZS1oZWlnaHQ6IDEuNDsgfVxuICAgIC5rYmQgeyBmb250LWZhbWlseTogdWktbW9ub3NwYWNlLCBTRk1vbm8tUmVndWxhciwgTWVubG8sIG1vbm9zcGFjZTsgYmFja2dyb3VuZDojMmEyYTJhOyBwYWRkaW5nOjJweCA2cHg7IGJvcmRlci1yYWRpdXM6NnB4OyB9XG4gIGA7XG5cbiAgYmFkZ2VFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBiYWRnZUVsLmNsYXNzTmFtZSA9ICdiYWRnZSc7XG4gIGJhZGdlRWwudGV4dENvbnRlbnQgPSAnUmVhZHknO1xuXG4gIHBhbmVsRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgcGFuZWxFbC5jbGFzc05hbWUgPSAncGFuZWwnO1xuICBwYW5lbEVsLmlubmVySFRNTCA9IGBcbiAgICA8aDQ+RGVtbyBQYW5lbDwvaDQ+XG4gICAgPHA+UHJlc3MgPHNwYW4gY2xhc3M9XCJrYmRcIj5DdHJsPC9zcGFuPiArIDxzcGFuIGNsYXNzPVwia2JkXCI+Szwvc3Bhbj4gdG8gdG9nZ2xlIHRoaXMgcGFuZWwuPC9wPlxuICAgIDxwPkxhc3Qga2V5OiA8c3BhbiBpZD1cImxhc3Qta2V5XCI+XHUyMDE0PC9zcGFuPjwvcD5cbiAgYDtcblxuICBzaGFkb3cuYXBwZW5kKHN0eWxlLCBiYWRnZUVsLCBwYW5lbEVsKTtcbiAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKGhvc3QpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25LZXlkb3duKGUpIHtcbiAgLy8gU2hvdyBsYXN0IGtleSBpbiBiYWRnZS9wYW5lbFxuICBpZiAoYmFkZ2VFbCkgYmFkZ2VFbC50ZXh0Q29udGVudCA9IGBLZXk6ICR7ZS5rZXl9YDtcbiAgY29uc3QgbGFzdEtleSA9IHNoYWRvdz8uZ2V0RWxlbWVudEJ5SWQ/LignbGFzdC1rZXknKTtcbiAgaWYgKGxhc3RLZXkpIGxhc3RLZXkudGV4dENvbnRlbnQgPSBgJHtlLmN0cmxLZXkgPyAnQ3RybCsnIDogJyd9JHtlLmtleX1gO1xuXG4gIC8vIFRvZ2dsZSBwYW5lbCBvbiBDdHJsK0tcbiAgaWYgKGUuY3RybEtleSAmJiBlLmtleS50b0xvd2VyQ2FzZSgpID09PSAnaycpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgdG9nZ2xlUGFuZWwoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0b2dnbGVQYW5lbCgpIHtcbiAgaWYgKCFwYW5lbEVsKSByZXR1cm47XG4gIGNvbnN0IG5vd1Zpc2libGUgPSBwYW5lbEVsLnN0eWxlLmRpc3BsYXkgIT09ICdibG9jayc7XG4gIHBhbmVsRWwuc3R5bGUuZGlzcGxheSA9IG5vd1Zpc2libGUgPyAnYmxvY2snIDogJ25vbmUnO1xuICBpZiAobm93VmlzaWJsZSkge1xuICAgIC8vIE51ZGdlIGJhZGdlIHRleHQgd2hlbiBvcGVuaW5nXG4gICAgaWYgKGJhZGdlRWwpIGJhZGdlRWwudGV4dENvbnRlbnQgPSAnUGFuZWwgb3Blbic7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gIHRyeSB7XG4gICAgaG9zdD8ucmVtb3ZlKCk7XG4gIH0gZmluYWxseSB7XG4gICAgaW5pdGVkID0gZmFsc2U7XG4gICAgaG9zdCA9IG51bGw7XG4gICAgc2hhZG93ID0gbnVsbDtcbiAgICBiYWRnZUVsID0gbnVsbDtcbiAgICBwYW5lbEVsID0gbnVsbDtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUVBLElBQUksU0FBUztBQUNiLElBQUk7QUFDSixJQUFJO0FBQ0osSUFBSTtBQUNKLElBQUk7QUFFRyxTQUFTLFdBQVc7QUFDekIsTUFBSSxPQUFRO0FBQ1osV0FBUztBQUdULFNBQU8sU0FBUyxjQUFjLEtBQUs7QUFDbkMsT0FBSyxNQUFNLE1BQU07QUFDakIsT0FBSyxNQUFNLFdBQVc7QUFDdEIsT0FBSyxNQUFNLFNBQVM7QUFDcEIsT0FBSyxNQUFNLFFBQVE7QUFFbkIsV0FBUyxLQUFLLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUUzQyxRQUFNLFFBQVEsU0FBUyxjQUFjLE9BQU87QUFDNUMsUUFBTSxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUF3QnBCLFlBQVUsU0FBUyxjQUFjLEtBQUs7QUFDdEMsVUFBUSxZQUFZO0FBQ3BCLFVBQVEsY0FBYztBQUV0QixZQUFVLFNBQVMsY0FBYyxLQUFLO0FBQ3RDLFVBQVEsWUFBWTtBQUNwQixVQUFRLFlBQVk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQU1wQixTQUFPLE9BQU8sT0FBTyxTQUFTLE9BQU87QUFDckMsV0FBUyxnQkFBZ0IsWUFBWSxJQUFJO0FBQzNDO0FBRU8sU0FBUyxVQUFVLEdBQUc7QUFFM0IsTUFBSSxRQUFTLFNBQVEsY0FBYyxRQUFRLEVBQUUsR0FBRztBQUNoRCxRQUFNLFVBQVUsUUFBUSxpQkFBaUIsVUFBVTtBQUNuRCxNQUFJLFFBQVMsU0FBUSxjQUFjLEdBQUcsRUFBRSxVQUFVLFVBQVUsRUFBRSxHQUFHLEVBQUUsR0FBRztBQUd0RSxNQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksWUFBWSxNQUFNLEtBQUs7QUFDNUMsTUFBRSxlQUFlO0FBQ2pCLGdCQUFZO0FBQUEsRUFDZDtBQUNGO0FBRUEsU0FBUyxjQUFjO0FBQ3JCLE1BQUksQ0FBQyxRQUFTO0FBQ2QsUUFBTSxhQUFhLFFBQVEsTUFBTSxZQUFZO0FBQzdDLFVBQVEsTUFBTSxVQUFVLGFBQWEsVUFBVTtBQUMvQyxNQUFJLFlBQVk7QUFFZCxRQUFJLFFBQVMsU0FBUSxjQUFjO0FBQUEsRUFDckM7QUFDRjtBQUVPLFNBQVMsVUFBVTtBQUN4QixNQUFJO0FBQ0YsVUFBTSxPQUFPO0FBQUEsRUFDZixVQUFFO0FBQ0EsYUFBUztBQUNULFdBQU87QUFDUCxhQUFTO0FBQ1QsY0FBVTtBQUNWLGNBQVU7QUFBQSxFQUNaO0FBQ0Y7IiwKICAibmFtZXMiOiBbXQp9Cg==
