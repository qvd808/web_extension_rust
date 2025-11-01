var l=!1,t,a,n,o;function i(){if(l)return;l=!0,t=document.createElement("div"),t.style.all="initial",t.style.position="fixed",t.style.zIndex="2147483647",t.style.inset="auto 16px 16px auto",a=t.attachShadow({mode:"open"});let e=document.createElement("style");e.textContent=`
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
  `,n=document.createElement("div"),n.className="badge",n.textContent="Ready",o=document.createElement("div"),o.className="panel",o.innerHTML=`
    <h4>Demo Panel</h4>
    <p>Press <span class="kbd">Ctrl</span> + <span class="kbd">K</span> to toggle this panel.</p>
    <p>Last key: <span id="last-key">\u2014</span></p>
  `,a.append(e,n,o),document.documentElement.appendChild(t)}function d(e){n&&(n.textContent=`Key: ${e.key}`);let s=a?.getElementById?.("last-key");s&&(s.textContent=`${e.ctrlKey?"Ctrl+":""}${e.key}`),e.ctrlKey&&e.key.toLowerCase()==="k"&&(e.preventDefault(),p())}function p(){if(!o)return;let e=o.style.display!=="block";o.style.display=e?"block":"none",e&&n&&(n.textContent="Panel open")}function r(){try{t?.remove()}finally{l=!1,t=null,a=null,n=null,o=null}}export{r as cleanup,i as initOnce,d as onKeydown};
