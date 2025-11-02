var l=!1,t=null,o=null,n=null,a=null;function r(){if(l)return;l=!0,t=document.createElement("div"),t.style.all="initial",t.style.position="fixed",t.style.zIndex="2147483647",t.style.inset="auto 16px 16px auto",o=t.attachShadow({mode:"open"});let e=document.createElement("style");e.textContent=`
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
  `,n=document.createElement("div"),n.className="badge",n.textContent="VIM",o.append(e,n);let i=()=>{document.documentElement.contains(t)||document.documentElement.appendChild(t)};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",i,{once:!0}):i()}function s(e){switch(e){case"normal":return"#4CAF50";case"insert":return"#2196F3";case"visual":return"#9C27B0";default:return"#616161"}}function u(e){n&&(n.textContent=`VIM: ${String(e||"?").toUpperCase()}`,n.style.background=s(e))}function d(e){l||r(),e!==a&&(a=e,u(e))}function c(){try{t?.remove()}finally{l=!1,t=null,o=null,n=null,a=null}}export{c as cleanupVimDisplay,r as initVimDisplay,d as syncVimDisplay};
