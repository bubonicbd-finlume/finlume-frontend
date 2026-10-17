/* Accessibility enhancer: names unlabeled controls, labels charts, wires skip link. Non-destructive: never overrides existing labels. */
(function(){
  function txt(n){return (n&&n.textContent||"").replace(/\s+/g," ").trim()}
  function enhance(root){
    try{
      root.querySelectorAll("input,select,textarea").forEach(function(el){
        if(el.type==="hidden"||el.getAttribute("aria-label")||el.getAttribute("aria-labelledby"))return;
        if(el.closest("label")||(el.id&&document.querySelector('label[for="'+el.id+'"]')))return;
        var n=el.getAttribute("placeholder")||el.getAttribute("title");
        if(!n&&el.type==="file")n="Choose file";
        if(!n&&el.type==="checkbox")n="Toggle option";
        if(n)el.setAttribute("aria-label",n);
      });
      root.querySelectorAll("button,[role=button]").forEach(function(el){
        if(el.getAttribute("aria-label")||el.getAttribute("aria-labelledby")||txt(el))return;
        var t=el.getAttribute("title");if(t)el.setAttribute("aria-label",t);
      });
      root.querySelectorAll(".recharts-wrapper").forEach(function(el){
        if(el.getAttribute("role"))return;
        var box=el.closest("section,div.rounded-2xl,div.rounded-xl")||el.parentElement,h=box&&box.querySelector("h1,h2,h3,h4,p.font-semibold");
        el.setAttribute("role","img");
        el.setAttribute("aria-label",(h&&txt(h)?txt(h)+" chart":"Chart")+" (visual summary; figures are listed elsewhere on the page)");
      });
      root.querySelectorAll("svg:not([aria-hidden]):not([role])").forEach(function(s){
        if(!s.closest(".recharts-wrapper"))s.setAttribute("aria-hidden","true");
      });
    }catch(e){}
  }
  var pending=false;
  function schedule(){if(pending)return;pending=true;(window.requestAnimationFrame||setTimeout)(function(){pending=false;enhance(document)})}
  function start(){
    enhance(document);
    try{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}catch(e){}
    var sk=document.getElementById("skip-link");
    if(sk)sk.addEventListener("click",function(e){var m=document.getElementById("main-content");if(m){e.preventDefault();m.focus();m.scrollIntoView({block:"start"})}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
