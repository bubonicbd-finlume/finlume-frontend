/* Legal pages: Terms of Use + Privacy Policy. Opens as an accessible dialog via window.openLegal("terms"|"privacy") or #/terms, #/privacy. */
(function(){
  var LEGAL_CONFIG={
    appName:"Finlume",
    updated:"14 October 2026",
    contactEmail:"",              /* e.g. "support@yourdomain.com" - shown once filled in */
    governingLaw:"India"
  };
  function contactLine(){return LEGAL_CONFIG.contactEmail?("email "+LEGAL_CONFIG.contactEmail+" or use Feedback inside the app"):"use the Feedback option inside the app"}
  var N=LEGAL_CONFIG.appName;
  var TERMS=[
    ["About "+N,[N+" is a personal finance tool for tracking expenses, budgets, investments, savings, documents and shared expenses (Split). It works with the information you enter or import. It does not connect to your bank accounts and it cannot make payments for you."]],
    ["Not financial advice",["Everything shown in "+N+" is for information and record-keeping only. It is not financial, investment, tax or legal advice. Calculations, charts, alerts and projections depend on the data you provide and can be wrong or out of date. Please check important figures yourself and speak to a qualified professional before making financial decisions."]],
    ["Your account",["You must be at least 18 to use "+N+". Give accurate details, keep your password private, and tell us if you think your account has been accessed by someone else. You are responsible for activity under your account."]],
    ["Your data",["Your financial data stays yours. You give us permission to store and process it only so that we can run the service for you, as described in the Privacy Policy. You can download a backup of your data and delete your account at any time from within the app."]],
    ["Imports and third-party data",["Bank statement parsing is automated and can misread files, especially scanned or unusual layouts. Review imported rows before relying on them. Mutual fund prices come from a public third-party source and may be delayed, incomplete or unavailable. We are not responsible for errors in data you import or that comes from third parties."]],
    ["Document vault",["If you turn on the vault, your documents are encrypted on your device with a key protected by your passphrase and recovery code. We cannot read them and we cannot recover them. If you lose both your passphrase and your recovery code, your vault contents cannot be restored."]],
    ["Split and other people's information",["If you add other people to Split (names, expenses, settlements), you are responsible for having a good reason to do so and for keeping the information accurate. Do not add details of someone who has asked you not to."]],
    ["Acceptable use",["Do not use "+N+" for anything unlawful, to harass others, to upload malware, to probe or disrupt the service or its security, or to access data that is not yours. We may suspend accounts that put the service or other people at risk."]],
    ["Availability and changes",["We work to keep "+N+" running but it is provided “as is”, without a promise that it will always be available or error-free. Features may change or be removed. We will try to give notice of significant changes that affect your data."]],
    ["Limit of liability",["To the extent the law allows, we are not liable for indirect or consequential loss, lost profits, or loss resulting from data entry errors, parsing errors, third-party data, service interruptions or lost vault credentials. Nothing in these terms limits liability that cannot legally be limited."]],
    ["Ending your use",["You can stop using "+N+" or delete your account at any time. We may end or restrict access if these terms are broken or the law requires it."]],
    ["Changes and governing law",["We may update these terms. The date at the top shows the latest version, and continued use after a change means you accept it. These terms are governed by the laws of "+LEGAL_CONFIG.governingLaw+"."]],
    ["Contact",["For questions about these terms, "+contactLine()+"."]]
  ];
  var PRIVACY=[
    ["Summary",["We collect only what is needed to run "+N+". We do not sell your data and we do not use advertising or third-party analytics trackers in the app. Your vault documents are encrypted on your device before they are stored."]],
    ["What we collect",[
      "Account details: your email address, optional display name, and your password (handled and stored in hashed form by our authentication provider).",
      "Financial data you add or import: transactions, accounts, budgets, goals, investments, savings and deposits, recurring payments, tags, notes and preferences.",
      "Documents you upload to the vault, and the settings needed to unlock it (never your passphrase or recovery code).",
      "Split data: groups, members, guests, expenses, settlements and claims that you or other members create.",
      "Messages you send through Feedback, and in-app notifications generated for your account.",
      "Technical data kept in your browser (local and session storage) such as theme, remembered email if you ask for it, and short-lived session information."
    ]],
    ["How we use it",["To provide the features you use, keep you signed in, send account emails (sign-up confirmation and password reset), show alerts you have set up, keep the service secure, and respond to feedback. We do not use your data for advertising or profiling."]],
    ["Who processes it",[
      "Supabase provides sign-in and the database where your data is stored.",
      "Netlify hosts the app files.",
      "Twilio SendGrid delivers account emails.",
      "A public CDN (unpkg) delivers open-source code libraries, so it can see your IP address when the app loads.",
      "A public mutual fund price service (mfapi.in) receives the fund name or scheme code you look up. It does not receive your account details.",
      "Bank statements are read in your browser by default. Only if an optional server-side parser is switched on would a statement you choose to import be sent to that parser."
    ]],
    ["Who can see your data",["Your data is tied to your account. People you share a Split group with can see the group data you put there. Authorised administrators may access operational data needed to run and support the service, but cannot read vault-encrypted documents. We may disclose information if the law requires it."]],
    ["Security",["Data is sent over encrypted connections and protected by access controls in our database. Vault documents use client-side AES-GCM encryption. No system is perfectly secure, so keep your password and recovery code safe and use a strong, unique password."]],
    ["Retention and deletion",["We keep your data while your account is active. Deleting your account in Settings removes your account and its data from our database. Copies in provider backups may remain for a limited period before they expire."]],
    ["Your choices and rights",["You can view and edit your data in the app, download a backup, delete your account, and sign out of all devices. Under applicable law, including India’s Digital Personal Data Protection Act, 2023, you may have rights to access, correct and erase your personal data and to raise a grievance. To exercise them, "+contactLine()+"."]],
    ["Children",[N+" is not intended for anyone under 18, and we do not knowingly collect their information."]],
    ["Changes",["We may update this policy and will change the date above when we do. If a change is significant we will try to tell you in the app."]],
    ["Contact",["For privacy questions or requests, "+contactLine()+"."]]
  ];
  function start(){
    var R=window.React,RD=window.ReactDOM; if(!R||!RD)return;
    var h=R.createElement,useState=R.useState,useEffect=R.useEffect,useRef=R.useRef;
    function Section(p){return h("section",{className:"mb-5"},h("h3",{style:{fontSize:15,fontWeight:600,margin:"0 0 6px",color:"#1e1b4b"}},p.s[0]),p.s[1].length>1?h("ul",{style:{margin:0,paddingLeft:18,listStyle:"disc"}},p.s[1].map(function(t,i){return h("li",{key:i,style:{fontSize:13.5,lineHeight:1.6,color:"#334155",marginBottom:4}},t)})):h("p",{style:{fontSize:13.5,lineHeight:1.6,color:"#334155",margin:0}},p.s[1][0]))}
    function Legal(){
      var st=useState(null),kind=st[0],setKind=st[1],box=useRef(null),prev=useRef(null);
      useEffect(function(){
        window.openLegal=function(k){prev.current=document.activeElement;setKind(k==="privacy"?"privacy":"terms")};
        function fromHash(){var m=/^#\/(terms|privacy)$/.exec(location.hash);if(m)setKind(m[1])}
        fromHash();window.addEventListener("hashchange",fromHash);
        return function(){window.removeEventListener("hashchange",fromHash)}
      },[]);
      function close(){setKind(null);try{if(/^#\/(terms|privacy)$/.test(location.hash))history.replaceState(null,"",location.pathname+location.search)}catch(e){}try{prev.current&&prev.current.isConnected&&prev.current.focus()}catch(e){}}
      useEffect(function(){
        if(!kind)return;
        var old=document.body.style.overflow;document.body.style.overflow="hidden";
        var t=setTimeout(function(){box.current&&box.current.focus()},0);
        function key(e){
          if(e.key==="Escape"){e.preventDefault();close();return}
          if(e.key!=="Tab"||!box.current)return;
          var f=[].slice.call(box.current.querySelectorAll("button,a[href],[tabindex]:not([tabindex='-1'])")).filter(function(n){return n.offsetParent!==null});
          if(!f.length)return;var a=document.activeElement,first=f[0],last=f[f.length-1];
          if(e.shiftKey&&(a===first||a===box.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}
        }
        document.addEventListener("keydown",key);
        return function(){document.removeEventListener("keydown",key);clearTimeout(t);document.body.style.overflow=old}
      },[kind]);
      if(!kind)return null;
      var secs=kind==="terms"?TERMS:PRIVACY,title=kind==="terms"?"Terms of Use":"Privacy Policy";
      function tab(k,label){var on=kind===k;return h("button",{type:"button",role:"tab","aria-selected":on,onClick:function(){setKind(k)},style:{padding:"6px 12px",borderRadius:8,border:"1px solid "+(on?"#4f46e5":"#e2e8f0"),background:on?"#4f46e5":"#fff",color:on?"#fff":"#334155",fontSize:13,fontWeight:500,cursor:"pointer"}},label)}
      return h("div",{style:{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,12,40,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:12},onMouseDown:function(e){if(e.target===e.currentTarget)close()}},
        h("div",{ref:box,role:"dialog","aria-modal":"true","aria-labelledby":"legal-title",tabIndex:-1,style:{background:"#fff",borderRadius:16,width:"100%",maxWidth:640,maxHeight:"88vh",display:"flex",flexDirection:"column",outline:"none",boxShadow:"0 30px 60px -20px rgba(20,10,60,.5)",fontFamily:"inherit"}},
          h("div",{style:{padding:"16px 20px 12px",borderBottom:"1px solid #e2e8f0",display:"flex",gap:12,alignItems:"flex-start",justifyContent:"space-between"}},
            h("div",null,h("h2",{id:"legal-title",style:{fontSize:18,fontWeight:700,margin:0,color:"#1e1b4b"}},title),h("p",{style:{fontSize:12,color:"#64748b",margin:"2px 0 0"}},N+" · Last updated "+LEGAL_CONFIG.updated)),
            h("button",{type:"button","aria-label":"Close",onClick:close,style:{border:0,background:"transparent",fontSize:22,lineHeight:1,cursor:"pointer",color:"#475569",padding:4}},"×")),
          h("div",{role:"tablist","aria-label":"Legal documents",style:{display:"flex",gap:8,padding:"10px 20px 0"}},tab("terms","Terms of Use"),tab("privacy","Privacy Policy")),
          h("div",{style:{padding:"14px 20px 20px",overflowY:"auto"}},secs.map(function(s,i){return h(Section,{key:kind+i,s:s})}))
        ));
    }
    var mount=document.createElement("div");mount.id="legal-root";document.body.appendChild(mount);
    RD.createRoot(mount).render(h(Legal,null));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
