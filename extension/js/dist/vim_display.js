// extension/js/src/vim_display.js
var inited = false;
var host = null;
var shadow = null;
var badgeEl = null;
var lastMode = null;
function initVimDisplay() {
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
      font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #2a2a2a; color: #fff;
      padding: 6px 10px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      cursor: default; user-select: none;
      min-width: 70px; text-align: center;
      border: 1px solid #3a3a3a;
    }
  `;
  badgeEl = document.createElement("div");
  badgeEl.className = "badge";
  badgeEl.textContent = "VIM";
  shadow.append(style, badgeEl);
  const attach = () => {
    if (!document.documentElement.contains(host)) {
      document.documentElement.appendChild(host);
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }
}
function modeColor(mode) {
  switch (mode) {
    case "normal":
      return "#4CAF50";
    // green
    case "insert":
      return "#2196F3";
    // blue
    case "visual":
      return "#9C27B0";
    // purple
    default:
      return "#616161";
  }
}
function render(mode) {
  if (!badgeEl) return;
  badgeEl.textContent = `VIM: ${String(mode || "?").toUpperCase()}`;
  badgeEl.style.background = modeColor(mode);
}
function syncVimDisplay(mode) {
  if (!inited) initVimDisplay();
  if (mode !== lastMode) {
    lastMode = mode;
    render(mode);
  }
}
function cleanupVimDisplay() {
  try {
    host?.remove();
  } finally {
    inited = false;
    host = null;
    shadow = null;
    badgeEl = null;
    lastMode = null;
  }
}
export {
  cleanupVimDisplay,
  initVimDisplay,
  syncVimDisplay
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3ZpbV9kaXNwbGF5LmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBMaWdodHdlaWdodCBtb2RlIGluZGljYXRvciBVSSAobm8gY2hhbmdlcyB0byB2aW1fbW9kZSBsb2dpYylcbi8vIFJlbmRlcnMgYSBzbWFsbCBiYWRnZSBhdCBib3R0b20tcmlnaHQgc2hvd2luZyB0aGUgY3VycmVudCBWaW0gbW9kZS5cblxubGV0IGluaXRlZCA9IGZhbHNlO1xubGV0IGhvc3QgPSBudWxsOyAvLyA8ZGl2PiBob3N0IGF0dGFjaGVkIHRvIERPTVxubGV0IHNoYWRvdyA9IG51bGw7IC8vIFNoYWRvd1Jvb3RcbmxldCBiYWRnZUVsID0gbnVsbDsgLy8gbW9kZSBiYWRnZVxubGV0IGxhc3RNb2RlID0gbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRWaW1EaXNwbGF5KCkge1xuICBpZiAoaW5pdGVkKSByZXR1cm47XG4gIGluaXRlZCA9IHRydWU7XG5cbiAgLy8gQ3JlYXRlIGhvc3QgdGhhdCBpc29sYXRlcyBVSSBmcm9tIHBhZ2UgQ1NTXG4gIGhvc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBob3N0LnN0eWxlLmFsbCA9IFwiaW5pdGlhbFwiO1xuICBob3N0LnN0eWxlLnBvc2l0aW9uID0gXCJmaXhlZFwiO1xuICBob3N0LnN0eWxlLnpJbmRleCA9IFwiMjE0NzQ4MzY0N1wiOyAvLyBvbiB0b3BcbiAgaG9zdC5zdHlsZS5pbnNldCA9IFwiYXV0byAxNnB4IDE2cHggYXV0b1wiOyAvLyBib3R0b20tcmlnaHRcblxuICBzaGFkb3cgPSBob3N0LmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xuXG4gIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICA6aG9zdCB7IGFsbDogaW5pdGlhbDsgfVxuICAgIC5iYWRnZSB7XG4gICAgICBmb250OiAxMnB4IHVpLW1vbm9zcGFjZSwgU0ZNb25vLVJlZ3VsYXIsIE1lbmxvLCBDb25zb2xhcywgbW9ub3NwYWNlO1xuICAgICAgYmFja2dyb3VuZDogIzJhMmEyYTsgY29sb3I6ICNmZmY7XG4gICAgICBwYWRkaW5nOiA2cHggMTBweDsgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgICAgYm94LXNoYWRvdzogMCA0cHggMTZweCByZ2JhKDAsMCwwLC4yNSk7XG4gICAgICBjdXJzb3I6IGRlZmF1bHQ7IHVzZXItc2VsZWN0OiBub25lO1xuICAgICAgbWluLXdpZHRoOiA3MHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCAjM2EzYTNhO1xuICAgIH1cbiAgYDtcblxuICBiYWRnZUVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgYmFkZ2VFbC5jbGFzc05hbWUgPSBcImJhZGdlXCI7XG4gIGJhZGdlRWwudGV4dENvbnRlbnQgPSBcIlZJTVwiO1xuXG4gIHNoYWRvdy5hcHBlbmQoc3R5bGUsIGJhZGdlRWwpO1xuXG4gIC8vIEF0dGFjaCB3aGVuIGJvZHkgaXMgcmVhZHlcbiAgY29uc3QgYXR0YWNoID0gKCkgPT4ge1xuICAgIGlmICghZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNvbnRhaW5zKGhvc3QpKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoaG9zdCk7XG4gICAgfVxuICAgIC8vIEluaXRpYWwgc3luY1xuICAgIC8vIE1vZGUgd2lsbCBiZSBwcm92aWRlZCBieSBjYWxsZXIgbGF0ZXIgdmlhIHN5bmNWaW1EaXNwbGF5KG1vZGUpXG4gIH07XG4gIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImxvYWRpbmdcIikge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGF0dGFjaCwgeyBvbmNlOiB0cnVlIH0pO1xuICB9IGVsc2Uge1xuICAgIGF0dGFjaCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1vZGVDb2xvcihtb2RlKSB7XG4gIHN3aXRjaCAobW9kZSkge1xuICAgIGNhc2UgXCJub3JtYWxcIjpcbiAgICAgIHJldHVybiBcIiM0Q0FGNTBcIjsgLy8gZ3JlZW5cbiAgICBjYXNlIFwiaW5zZXJ0XCI6XG4gICAgICByZXR1cm4gXCIjMjE5NkYzXCI7IC8vIGJsdWVcbiAgICBjYXNlIFwidmlzdWFsXCI6XG4gICAgICByZXR1cm4gXCIjOUMyN0IwXCI7IC8vIHB1cnBsZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gXCIjNjE2MTYxXCI7IC8vIGdyYXlcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXIobW9kZSkge1xuICBpZiAoIWJhZGdlRWwpIHJldHVybjtcbiAgYmFkZ2VFbC50ZXh0Q29udGVudCA9IGBWSU06ICR7U3RyaW5nKG1vZGUgfHwgXCI/XCIpLnRvVXBwZXJDYXNlKCl9YDtcbiAgYmFkZ2VFbC5zdHlsZS5iYWNrZ3JvdW5kID0gbW9kZUNvbG9yKG1vZGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3luY1ZpbURpc3BsYXkobW9kZSkge1xuICBpZiAoIWluaXRlZCkgaW5pdFZpbURpc3BsYXkoKTtcbiAgaWYgKG1vZGUgIT09IGxhc3RNb2RlKSB7XG4gICAgbGFzdE1vZGUgPSBtb2RlO1xuICAgIHJlbmRlcihtb2RlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYW51cFZpbURpc3BsYXkoKSB7XG4gIHRyeSB7XG4gICAgaG9zdD8ucmVtb3ZlKCk7XG4gIH0gZmluYWxseSB7XG4gICAgaW5pdGVkID0gZmFsc2U7XG4gICAgaG9zdCA9IG51bGw7XG4gICAgc2hhZG93ID0gbnVsbDtcbiAgICBiYWRnZUVsID0gbnVsbDtcbiAgICBsYXN0TW9kZSA9IG51bGw7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFHQSxJQUFJLFNBQVM7QUFDYixJQUFJLE9BQU87QUFDWCxJQUFJLFNBQVM7QUFDYixJQUFJLFVBQVU7QUFDZCxJQUFJLFdBQVc7QUFFUixTQUFTLGlCQUFpQjtBQUMvQixNQUFJLE9BQVE7QUFDWixXQUFTO0FBR1QsU0FBTyxTQUFTLGNBQWMsS0FBSztBQUNuQyxPQUFLLE1BQU0sTUFBTTtBQUNqQixPQUFLLE1BQU0sV0FBVztBQUN0QixPQUFLLE1BQU0sU0FBUztBQUNwQixPQUFLLE1BQU0sUUFBUTtBQUVuQixXQUFTLEtBQUssYUFBYSxFQUFFLE1BQU0sT0FBTyxDQUFDO0FBRTNDLFFBQU0sUUFBUSxTQUFTLGNBQWMsT0FBTztBQUM1QyxRQUFNLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBYXBCLFlBQVUsU0FBUyxjQUFjLEtBQUs7QUFDdEMsVUFBUSxZQUFZO0FBQ3BCLFVBQVEsY0FBYztBQUV0QixTQUFPLE9BQU8sT0FBTyxPQUFPO0FBRzVCLFFBQU0sU0FBUyxNQUFNO0FBQ25CLFFBQUksQ0FBQyxTQUFTLGdCQUFnQixTQUFTLElBQUksR0FBRztBQUM1QyxlQUFTLGdCQUFnQixZQUFZLElBQUk7QUFBQSxJQUMzQztBQUFBLEVBR0Y7QUFDQSxNQUFJLFNBQVMsZUFBZSxXQUFXO0FBQ3JDLGFBQVMsaUJBQWlCLG9CQUFvQixRQUFRLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFBQSxFQUN0RSxPQUFPO0FBQ0wsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLFNBQVMsVUFBVSxNQUFNO0FBQ3ZCLFVBQVEsTUFBTTtBQUFBLElBQ1osS0FBSztBQUNILGFBQU87QUFBQTtBQUFBLElBQ1QsS0FBSztBQUNILGFBQU87QUFBQTtBQUFBLElBQ1QsS0FBSztBQUNILGFBQU87QUFBQTtBQUFBLElBQ1Q7QUFDRSxhQUFPO0FBQUEsRUFDWDtBQUNGO0FBRUEsU0FBUyxPQUFPLE1BQU07QUFDcEIsTUFBSSxDQUFDLFFBQVM7QUFDZCxVQUFRLGNBQWMsUUFBUSxPQUFPLFFBQVEsR0FBRyxFQUFFLFlBQVksQ0FBQztBQUMvRCxVQUFRLE1BQU0sYUFBYSxVQUFVLElBQUk7QUFDM0M7QUFFTyxTQUFTLGVBQWUsTUFBTTtBQUNuQyxNQUFJLENBQUMsT0FBUSxnQkFBZTtBQUM1QixNQUFJLFNBQVMsVUFBVTtBQUNyQixlQUFXO0FBQ1gsV0FBTyxJQUFJO0FBQUEsRUFDYjtBQUNGO0FBRU8sU0FBUyxvQkFBb0I7QUFDbEMsTUFBSTtBQUNGLFVBQU0sT0FBTztBQUFBLEVBQ2YsVUFBRTtBQUNBLGFBQVM7QUFDVCxXQUFPO0FBQ1AsYUFBUztBQUNULGNBQVU7QUFDVixlQUFXO0FBQUEsRUFDYjtBQUNGOyIsCiAgIm5hbWVzIjogW10KfQo=
