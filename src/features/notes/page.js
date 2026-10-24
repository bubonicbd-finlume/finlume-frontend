import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";

export function createNotesPage(deps) {
const { Button, Card, Modal, NT_COLOR_KEYS,  NT_LS_PREFS, NT_MAX_BODY, NT_SETUP_SQL,   NtIcon, inputCls, ntChecklistStats, ntFileKind, ntFmtSize, ntH, ntIsEmptyNote, ntLocalYMD, ntLsGet, ntLsSet, ntPlain, ntPreviewHtml, ntRelEdited, ntRelUpdated, ntRemState, ntSanitize, ntTagColor, uid } = deps;
function ntUseTick(ms){const[,s]=useState(0);useEffect(()=>{const t=setInterval(()=>s(x=>x+1),ms);return()=>clearInterval(t)},[ms])}
function ntUseMedia(q){const get=()=>typeof window.matchMedia==="function"&&window.matchMedia(q).matches;const[m,setM]=useState(get);useEffect(()=>{if(typeof window.matchMedia!=="function")return;const mq=window.matchMedia(q),f=()=>setM(mq.matches);f();mq.addEventListener?mq.addEventListener("change",f):mq.addListener(f);return()=>{mq.removeEventListener?mq.removeEventListener("change",f):mq.removeListener(f)}},[q]);return m}
function ntRemText(st,rem){if(!st||st.kind==="none")return"";if(st.kind==="done")return"Done · "+st.short;if(st.kind==="overdue")return"Overdue · "+st.short;if(st.kind==="today")return"Due today"+(rem&&rem.time?" · "+ntTime12(rem.time):"");return"Due "+st.short}
function ntTaskText(cl){return cl.done===0?cl.total+(cl.total===1?" task":" tasks"):cl.done+"/"+cl.total+" tasks done"}
function ntNoteMatches(n,terms){if(!terms.length)return!0;const hay=((n.title||"")+" "+(n.plain||"")+" "+(n.tags||[]).join(" ")+" "+(n.attachments||[]).map(a=>a.name).join(" ")).toLowerCase();return terms.every(t=>hay.indexOf(t)>=0)}
function ntEditedKey(n){return new Date(n.editedAt||n.updatedAt||0).getTime()}
function ntSortNotes(list,sort){const a=list.slice(),cmpT=(x,y)=>(x.title||"Untitled").toLowerCase().localeCompare((y.title||"Untitled").toLowerCase());
if(sort==="created")a.sort((x,y)=>new Date(y.createdAt)-new Date(x.createdAt));
else if(sort==="oldest")a.sort((x,y)=>new Date(x.createdAt)-new Date(y.createdAt));
else if(sort==="title")a.sort(cmpT);
else if(sort==="reminder")a.sort((x,y)=>{const dx=x.reminder&&ntRemDate(x.reminder),dy=y.reminder&&ntRemDate(y.reminder),kx=dx?(x.reminder.done?1:0):2,ky=dy?(y.reminder.done?1:0):2;if(kx!==ky)return kx-ky;if(dx&&dy)return dx-dy;return ntEditedKey(y)-ntEditedKey(x)});
else a.sort((x,y)=>ntEditedKey(y)-ntEditedKey(x));
return a}
const NT_SORTS=[["updated","Recently updated"],["created","Recently created"],["oldest","Oldest first"],["title","Title A–Z"],["reminder","Reminder date"]];
const NT_FILTERS=[["all","All notes"],["pinned","Pinned"],["reminders","Reminders"],["archived","Archived"]];

/* ---- small parts ---- */
function NtMenu({label,items,className}){
const[open,setOpen]=useState(!1),ref=useRef(null),btn=useRef(null);
useEffect(()=>{if(!open)return;const onDown=e=>{ref.current&&!ref.current.contains(e.target)&&setOpen(!1)},onKey=e=>{if(e.key==="Escape"){e.stopPropagation(),setOpen(!1),btn.current&&btn.current.focus()}};document.addEventListener("mousedown",onDown),document.addEventListener("keydown",onKey,!0);const first=ref.current&&ref.current.querySelector("[role=menuitem]");first&&first.focus();return()=>{document.removeEventListener("mousedown",onDown),document.removeEventListener("keydown",onKey,!0)}},[open]);
const onMenuKey=e=>{if(e.key!=="ArrowDown"&&e.key!=="ArrowUp"&&e.key!=="Tab")return;const els=Array.from(ref.current.querySelectorAll("[role=menuitem]")),i=els.indexOf(document.activeElement);if(e.key==="Tab"){setOpen(!1);return}e.preventDefault();const next=e.key==="ArrowDown"?(i+1)%els.length:(i-1+els.length)%els.length;els[next]&&els[next].focus()};
return ntH("div",{className:"nt-menu-wrap "+(className||""),ref,onClick:e=>e.stopPropagation(),onDoubleClick:e=>e.stopPropagation(),onKeyDown:e=>e.stopPropagation()},
ntH("button",{type:"button",ref:btn,className:"nt-iconbtn","aria-label":label||"More actions","aria-haspopup":"menu","aria-expanded":open,onClick:()=>setOpen(o=>!o)},ntH(NtIcon,{name:"more",size:18})),
open&&ntH("div",{className:"nt-pop nt-menu-pop",role:"menu","aria-label":label||"More actions",onKeyDown:onMenuKey},items.filter(Boolean).map((it,i)=>ntH("button",{key:i,type:"button",role:"menuitem",className:"nt-menuitem"+(it.danger?" is-danger":""),onClick:()=>{setOpen(!1),it.onClick()}},ntH(NtIcon,{name:it.icon,size:15}),it.label))))}
function NtTagChip({name,map,onRemove,onClick,small,pressed}){
const c=ntTagColor(name,map);
const body=onClick?ntH("button",{type:"button",className:"nt-tag-btn",onClick,"aria-pressed":pressed==null?void 0:pressed,title:onRemove?"Change tag color":void 0},name):ntH("span",null,name);
return ntH("span",{className:"nt-tag"+(small?" nt-tag-sm":"")+(pressed?" is-on":""),"data-c":c},body,onRemove&&ntH("button",{type:"button",className:"nt-tag-x","aria-label":"Remove tag "+name,onClick:onRemove},ntH(NtIcon,{name:"x",size:11,strokeWidth:2.6})))}
function NtConfirm({open,title,body,confirmLabel,onConfirm,onClose}){
return ntH(Modal,{open,onClose,title,width:"max-w-sm",footer:ntH("div",{className:"flex justify-end gap-2"},ntH(Button,{variant:"outline",onClick:onClose},"Cancel"),ntH(Button,{variant:"danger",onClick:onConfirm},confirmLabel))},ntH("p",{className:"text-[13.5px] text-slate-600"},body))}

/* ---- card ---- */
const NtCard=React.memo(function NtCard({n,selected,compact,tagColors,tick,canDrag,isOver,onOpen,onOpenFocus,onAction,onDragStart,onDragOver,onDrop,onDragEnd}){
const st=ntRemState(n.reminder),cl=ntChecklistStats(n.body),att=(n.attachments||[]).length,prev=useMemo(()=>ntPreviewHtml(n.body),[n.body]),title=(n.title||"").trim()||"Untitled note",
tags=n.tags||[],hasPrev=!!(n.plain||"").trim()||cl.total>0;
const items=n.archived?[{label:"Open",icon:"note",onClick:()=>onAction("open",n.id)},{label:"Restore",icon:"restore",onClick:()=>onAction("restore",n.id)},{label:"Delete permanently",icon:"trash",danger:!0,onClick:()=>onAction("purge",n.id)}]
:[{label:"Open",icon:"note",onClick:()=>onAction("open",n.id)},{label:n.pinned?"Unpin":"Pin",icon:"pin",onClick:()=>onAction("pin",n.id)},n.pinned&&{label:"Move earlier",icon:"up",onClick:()=>onAction("earlier",n.id)},n.pinned&&{label:"Move later",icon:"down",onClick:()=>onAction("later",n.id)},{label:n.reminder?"Edit reminder":"Add reminder",icon:"bell",onClick:()=>onAction("reminder",n.id)},{label:"Duplicate",icon:"copy",onClick:()=>onAction("duplicate",n.id)},{label:"Archive",icon:"archive",onClick:()=>onAction("archive",n.id)},{label:"Delete",icon:"trash",danger:!0,onClick:()=>onAction("delete",n.id)}];
const remText=ntRemText(st,n.reminder),remIcon=st.kind==="overdue"?"alert":st.kind==="done"?"check":"bell";
let metaLeft=null;
if(cl.total){metaLeft=ntH("span",{className:"nt-meta nt-status","data-rem":st.kind},ntH(NtIcon,{name:"todo",size:13}),ntTaskText(cl)+(remText?" · "+remText.replace(/^Done · /,"Done ")  :""))}
else if(st.kind!=="none"){metaLeft=ntH("span",{className:"nt-meta nt-rem","data-rem":st.kind},ntH(NtIcon,{name:remIcon,size:13}),remText)}
return ntH("article",{className:"nt-card"+(selected?" is-selected":"")+(compact?" is-compact":"")+(isOver?" is-over":"")+(n.pinned?" is-pinned":""),tabIndex:0,"aria-label":title+(n.pinned?", pinned":""),"aria-current":selected?"true":void 0,draggable:canDrag||void 0,
onClick:()=>onOpen(n.id),onDoubleClick:()=>onOpenFocus(n.id),
onKeyDown:e=>{if(e.target!==e.currentTarget)return;if(e.key==="Enter"||e.key===" "){e.preventDefault(),onOpen(n.id)}},
onDragStart:canDrag?e=>{try{e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",n.id)}catch{}onDragStart(n.id)}:void 0,onDragOver:canDrag?e=>onDragOver(e,n.id):void 0,onDrop:canDrag?e=>onDrop(e,n.id):void 0,onDragEnd:canDrag?onDragEnd:void 0},
ntH("div",{className:"nt-card-top"},ntH("h3",{className:"nt-card-title"},title),ntH("div",{className:"nt-card-actions"},
n.pinned&&!n.archived&&ntH("button",{type:"button",className:"nt-iconbtn nt-pinned","aria-label":"Unpin note",title:"Unpin",onClick:e=>{e.stopPropagation(),onAction("pin",n.id)},onDoubleClick:e=>e.stopPropagation()},ntH(NtIcon,{name:"pin",size:15,filled:!0})),
ntH(NtMenu,{label:"Actions for "+title,items}))),
hasPrev&&ntH("div",{className:"nt-prev",dangerouslySetInnerHTML:{__html:prev}}),
tags.length>0&&ntH("div",{className:"nt-card-tags"},tags.slice(0,3).map(t=>ntH(NtTagChip,{key:t,name:t,map:tagColors,small:!0})),tags.length>3&&ntH("span",{className:"nt-more-tags"},"+"+(tags.length-3))),
ntH("div",{className:"nt-card-foot"},metaLeft,att>0&&ntH("span",{className:"nt-meta","aria-label":att+(att===1?" attachment":" attachments")},ntH(NtIcon,{name:"clip",size:13}),att),ntH("span",{className:"nt-meta nt-upd"},n.archived?"Archived":ntRelUpdated(n.editedAt||n.updatedAt))))});

/* ---- editor ---- */
const NT_SWATCH=NT_COLOR_KEYS;
function NtColorPop({value,onPick,onClose}){const ref=useRef(null);useEffect(()=>{const d=e=>{ref.current&&!ref.current.contains(e.target)&&onClose()},k=e=>{e.key==="Escape"&&(e.stopPropagation(),onClose())};document.addEventListener("mousedown",d),document.addEventListener("keydown",k,!0);const f=ref.current&&ref.current.querySelector("button");f&&f.focus();return()=>{document.removeEventListener("mousedown",d),document.removeEventListener("keydown",k,!0)}},[]);
return ntH("div",{ref,className:"nt-pop nt-colorpop",role:"group","aria-label":"Tag color"},NT_SWATCH.map(c=>ntH("button",{key:c,type:"button",className:"nt-swatch"+(c===value?" is-on":""),"data-c":c,"aria-label":c,"aria-pressed":c===value,onClick:()=>onPick(c)},c===value&&ntH(NtIcon,{name:"check",size:12,strokeWidth:3}))))}

function NtReminderPop({rem,onSave,onClear,onClose}){
const ref=useRef(null),[d,setD]=useState(rem&&rem.date||""),[t,setT]=useState(rem&&rem.time||"");
useEffect(()=>{const dn=e=>{ref.current&&!ref.current.contains(e.target)&&onClose()},k=e=>{e.key==="Escape"&&(e.stopPropagation(),onClose())};document.addEventListener("mousedown",dn),document.addEventListener("keydown",k,!0);const f=ref.current&&ref.current.querySelector("input");f&&f.focus();return()=>{document.removeEventListener("mousedown",dn),document.removeEventListener("keydown",k,!0)}},[]);
const quick=(days)=>{const x=new Date;x.setDate(x.getDate()+days),setD(ntLocalYMD(x))};
const snooze=kind=>{const x=new Date;if(kind==="hour"){x.setHours(x.getHours()+1);onSave({date:ntLocalYMD(x),time:String(x.getHours()).padStart(2,"0")+":"+String(x.getMinutes()).padStart(2,"0"),done:!1})}else if(kind==="tomorrow"){x.setDate(x.getDate()+1);onSave({date:ntLocalYMD(x),time:"09:00",done:!1})}else{x.setDate(x.getDate()+7);onSave({date:ntLocalYMD(x),time:"09:00",done:!1})}};
return ntH("div",{ref,className:"nt-pop nt-rempop",role:"dialog","aria-label":"Reminder"},
ntH("div",{className:"nt-quick"},ntH("button",{type:"button",className:"nt-pill",onClick:()=>quick(0)},"Today"),ntH("button",{type:"button",className:"nt-pill",onClick:()=>quick(1)},"Tomorrow"),ntH("button",{type:"button",className:"nt-pill",onClick:()=>quick(7)},"Next week")),
ntH("label",{className:"nt-lbl"},"Date",ntH("input",{type:"date",className:"nt-input",value:d,onChange:e=>setD(e.target.value)})),
ntH("label",{className:"nt-lbl"},"Time (optional)",ntH("input",{type:"time",className:"nt-input",value:t,onChange:e=>setT(e.target.value)})),
ntH("div",{className:"nt-rem-actions"},ntH("button",{type:"button",className:"nt-btn nt-btn-primary",disabled:!d,onClick:()=>onSave({date:d,time:t||null,done:!1})},rem?"Update":"Set reminder"),rem&&ntH("button",{type:"button",className:"nt-btn",onClick:onClear},"Remove")),
rem&&ntH("div",{className:"nt-rem-more"},ntH("button",{type:"button",className:"nt-btn nt-btn-ghost",onClick:()=>onSave({...rem,done:!rem.done})},ntH(NtIcon,{name:"check",size:14}),rem.done?"Mark as not done":"Mark complete"),
ntH("div",{className:"nt-snooze","role":"group","aria-label":"Snooze"},ntH("span",null,"Snooze:"),ntH("button",{type:"button",className:"nt-pill",onClick:()=>snooze("hour")},"1 hour"),ntH("button",{type:"button",className:"nt-pill",onClick:()=>snooze("tomorrow")},"Tomorrow"),ntH("button",{type:"button",className:"nt-pill",onClick:()=>snooze("week")},"Next week"))))}

function NtEditor({note,store,tagColors,allTags,onSetTagColor,focusMode,onToggleFocus,onDone,onArchive,onDelete,onClose,apiRef,focusToken,overlay}){
const bodyRef=useRef(null),titleRef=useRef(null),lastBody=useRef(note.body),pend=useRef(null),noteRef=useRef(note),fileRef=useRef(null),savedRange=useRef(null);
noteRef.current=note;
const[fmt,setFmt]=useState({}),[tagInput,setTagInput]=useState(""),[colorFor,setColorFor]=useState(null),[remOpen,setRemOpen]=useState(!1),[linkOpen,setLinkOpen]=useState(!1),[linkUrl,setLinkUrl]=useState(""),[uploads,setUploads]=useState([]),[confirmAtt,setConfirmAtt]=useState(null),[err,setErr]=useState(""),[dropOver,setDropOver]=useState(!1);
ntUseTick(30000);
const updateEmptyFlag=()=>{const el=bodyRef.current;if(!el)return;const empty=!(el.textContent||"").trim()&&!el.querySelector("li,img,hr");el.setAttribute("data-empty",empty?"1":"0")};
const commit=useCallback(()=>{clearTimeout(pend.current),pend.current=null;const el=bodyRef.current;if(!el)return;let html=ntSanitize(el.innerHTML);if(!(el.textContent||"").trim()&&!el.querySelector("li"))html="";if(html===lastBody.current)return;if(html.length>NT_MAX_BODY){setErr("This note is too large to sync. Remove some content.");return}setErr(""),lastBody.current=html,store.update(noteRef.current.id,{body:html})},[store.update]);
const schedule=()=>{updateEmptyFlag(),clearTimeout(pend.current),pend.current=setTimeout(commit,250)};
useEffect(()=>{apiRef&&(apiRef.current={commit,focusBody:()=>bodyRef.current&&bodyRef.current.focus()});return()=>{apiRef&&apiRef.current&&apiRef.current.commit===commit&&(apiRef.current=null)}},[commit]);
useEffect(()=>()=>{pend.current&&commit()},[]);
useEffect(()=>{const el=bodyRef.current;if(!el)return;if(note.body!==lastBody.current||el.getAttribute("data-init")!==note.id){el.innerHTML=note.body||"",lastBody.current=note.body,el.setAttribute("data-init",note.id);updateEmptyFlag()}},[note.id,note.body]);
useEffect(()=>{if(!focusToken)return;const t=setTimeout(()=>{const n=noteRef.current;(!n.title&&!n.plain?titleRef.current:bodyRef.current)?.focus()},10);return()=>clearTimeout(t)},[focusToken,note.id]);
useEffect(()=>{setRemOpen(!1),setLinkOpen(!1),setColorFor(null),setUploads([]),setErr("")},[note.id]);
const inBody=()=>{const s=window.getSelection();return s&&s.rangeCount&&bodyRef.current&&bodyRef.current.contains(s.anchorNode)};
const currentLi=()=>{const s=window.getSelection();if(!s||!s.rangeCount||!bodyRef.current)return null;let n=s.anchorNode;if(!n||!bodyRef.current.contains(n))return null;n=n.nodeType===3?n.parentNode:n;return n.closest?n.closest("li"):null};
const refreshFmt=()=>{if(!inBody())return;const q=c=>{try{return document.queryCommandState(c)}catch{return!1}};const li=currentLi(),inCheck=!!(li&&li.parentNode&&li.parentNode.classList&&li.parentNode.classList.contains("nt-check"));let blk="";try{blk=String(document.queryCommandValue("formatBlock")||"").toLowerCase()}catch{}setFmt({bold:q("bold"),italic:q("italic"),underline:q("underline"),ul:q("insertUnorderedList")&&!inCheck,ol:q("insertOrderedList"),check:inCheck,h:blk==="h2"||blk==="h1"||blk==="h3"})};
useEffect(()=>{document.addEventListener("selectionchange",refreshFmt);return()=>document.removeEventListener("selectionchange",refreshFmt)},[]);
const ex=(cmd,val)=>{bodyRef.current&&bodyRef.current.focus();try{document.execCommand(cmd,!1,val)}catch{}schedule(),refreshFmt()};
const unmarkLists=()=>{const s=window.getSelection();if(!s||!s.rangeCount)return;let n=s.anchorNode;n=n&&(n.nodeType===3?n.parentNode:n);const ul=n&&n.closest&&n.closest("ul");ul&&bodyRef.current.contains(ul)&&ul.classList.contains("nt-check")&&!fmt.check&&ul.classList.remove("nt-check")};
const doList=kind=>{bodyRef.current.focus();const li=currentLi(),isCheck=li&&li.parentNode.classList.contains("nt-check");if(isCheck&&kind==="ul"){const ul=li.parentNode;ul.classList.remove("nt-check"),ul.querySelectorAll("li").forEach(x=>x.removeAttribute("data-done")),schedule(),refreshFmt();return}ex(kind==="ul"?"insertUnorderedList":"insertOrderedList");const li2=currentLi();li2&&li2.parentNode&&li2.parentNode.classList&&li2.parentNode.classList.remove("nt-check")};
const doCheck=()=>{bodyRef.current.focus();let li=currentLi();if(li&&li.parentNode.tagName==="UL"&&li.parentNode.classList.contains("nt-check")){const ul=li.parentNode;ex("insertUnorderedList");return}
if(li&&li.parentNode.tagName==="OL")ex("insertOrderedList"),li=currentLi();
if(!(li&&li.parentNode.tagName==="UL"))ex("insertUnorderedList"),li=currentLi();
if(li&&li.parentNode.tagName==="UL"){li.parentNode.classList.add("nt-check");schedule(),refreshFmt()}};
const doHeading=()=>{let v="";try{v=String(document.queryCommandValue("formatBlock")||"").toLowerCase()}catch{}ex("formatBlock",v==="h2"?"P":"H2")};
const doClear=()=>{bodyRef.current.focus();try{document.execCommand("removeFormat"),document.execCommand("unlink")}catch{}let v="";try{v=String(document.queryCommandValue("formatBlock")||"").toLowerCase()}catch{}/^(h[1-6]|blockquote)$/.test(v)&&ex("formatBlock","P"),schedule(),refreshFmt()};
const moveLi=dir=>{const li=currentLi();if(!li)return;const sib=dir<0?li.previousElementSibling:li.nextElementSibling;if(!sib)return;li.parentNode.insertBefore(li,dir<0?sib:sib.nextSibling);const r=document.createRange();r.selectNodeContents(li),r.collapse(!1);const s=window.getSelection();s.removeAllRanges(),s.addRange(r),schedule()};
const openLink=()=>{const s=window.getSelection();savedRange.current=s&&s.rangeCount&&inBody()?s.getRangeAt(0).cloneRange():null;let href="";const n=s&&s.anchorNode&&(s.anchorNode.nodeType===3?s.anchorNode.parentNode:s.anchorNode),a=n&&n.closest&&n.closest("a");a&&(href=a.getAttribute("href")||""),setLinkUrl(href),setLinkOpen(!0)};
const applyLink=remove=>{const el=bodyRef.current;el.focus();const r=savedRange.current;if(r){const s=window.getSelection();s.removeAllRanges(),s.addRange(r)}
if(remove){try{document.execCommand("unlink")}catch{}}else{let u=linkUrl.trim();if(!u){setLinkOpen(!1);return}if(!/^(https?:|mailto:|tel:)/i.test(u)){if(/^[a-z][a-z0-9+.-]*:/i.test(u)){setErr("Only web, email and phone links are allowed."),setLinkOpen(!1);return}u=(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)?"mailto:":"https://")+u}const s=window.getSelection();if(s&&s.isCollapsed){const a=document.createElement("a");a.href=u,a.textContent=u.replace(/^(https?:\/\/|mailto:|tel:)/i,"");try{document.execCommand("insertHTML",!1,a.outerHTML)}catch{}}else{try{document.execCommand("createLink",!1,u)}catch{}}}
setLinkOpen(!1),schedule(),refreshFmt()};
const onBodyMouseDown=e=>{const li=e.target&&e.target.closest?e.target.closest("ul.nt-check > li"):null;if(!li)return;const rect=li.getBoundingClientRect();if(e.clientX-rect.left<30&&e.clientY-rect.top<34){e.preventDefault();li.getAttribute("data-done")==="1"?li.removeAttribute("data-done"):li.setAttribute("data-done","1");schedule()}};
const onBodyClick=e=>{const a=e.target&&e.target.closest?e.target.closest("a"):null;if(a&&(e.ctrlKey||e.metaKey)){e.preventDefault();const h=a.getAttribute("href")||"";/^(https?:|mailto:|tel:)/i.test(h)&&window.open(h,"_blank","noopener,noreferrer")}};
const onPaste=e=>{e.preventDefault();const cd=e.clipboardData;if(!cd)return;const html=cd.getData("text/html"),text=cd.getData("text/plain");try{if(html){const clean=ntSanitize(html);document.execCommand("insertHTML",!1,clean||text.replace(/&/g,"&amp;").replace(/</g,"&lt;"))}else document.execCommand("insertText",!1,text)}catch{}schedule()};
const onBodyKey=e=>{const mod=e.ctrlKey||e.metaKey;
if(e.altKey&&(e.key==="ArrowUp"||e.key==="ArrowDown")&&currentLi()){e.preventDefault(),moveLi(e.key==="ArrowUp"?-1:1);return}
if(e.key==="Enter"&&!e.shiftKey){setTimeout(()=>{const li=currentLi();li&&li.getAttribute("data-done")==="1"&&li.parentNode.classList.contains("nt-check")&&li.textContent.trim()===""&&li.removeAttribute("data-done");schedule()},0)}
if(mod&&e.key.toLowerCase()==="k"){e.preventDefault(),openLink()}};
const onRootKey=e=>{const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==="s"){e.preventDefault(),commit(),store.flush();return}
if(mod&&e.shiftKey&&(e.key==="L"||e.key==="l"||e.key==="9")){e.preventDefault(),inBody()?doCheck():(bodyRef.current&&bodyRef.current.focus(),doCheck())}};
const addTags=raw=>{const parts=String(raw).split(/[,\n]/).map(s=>s.trim().replace(/\s+/g," ").slice(0,24)).filter(Boolean);if(!parts.length)return;const cur=noteRef.current.tags||[],out=cur.slice();parts.forEach(p=>{out.length<12&&!out.some(x=>x.toLowerCase()===p.toLowerCase())&&out.push(p)});out.length!==cur.length&&store.update(noteRef.current.id,{tags:out},{meta:!0});setTagInput("")};
const removeTag=t=>store.update(note.id,{tags:(note.tags||[]).filter(x=>x!==t)},{meta:!0});
const setRem=r=>{store.update(note.id,{reminder:r},{meta:!0}),r&&setRemOpen(!1)};
const startUploads=files=>{Array.from(files||[]).forEach(f=>{const key=uid();setUploads(u=>[...u,{key,name:f.name,pct:0,err:""}]);store.uploadFile(noteRef.current.id,f,pct=>setUploads(u=>u.map(x=>x.key===key?{...x,pct}:x))).then(()=>setUploads(u=>u.filter(x=>x.key!==key)),e=>setUploads(u=>u.map(x=>x.key===key?{...x,err:e&&e.message||"Upload failed"}:x)))})};
const download=async a=>{try{await store.download(a)}catch(e){setErr("Couldn't download "+a.name+".")}};
const st=ntRemState(note.reminder),sv=store.save,saveText=sv.state==="saving"?"Saving…":sv.state==="error"?"Not synced":sv.state==="local"?"Saved on this device":sv.state==="saved"?"Saved":"",
tb=(name,label,onClick,active,extra)=>ntH("button",{type:"button",className:"nt-tb"+(active?" is-on":""),"aria-label":label,title:label+(extra?" ("+extra+")":""),"aria-pressed":active==null?void 0:!!active,onMouseDown:e=>e.preventDefault(),onClick},ntH(NtIcon,{name,size:16}));
const mod=/Mac/i.test(navigator.platform||"")?"⌘":"Ctrl+";
return ntH("section",{className:"nt-editor"+(focusMode?" is-focus":""),role:overlay||focusMode?"dialog":"region","aria-modal":overlay||focusMode?"true":void 0,"aria-label":"Note editor",onKeyDown:onRootKey,
onDragOver:e=>{e.dataTransfer&&Array.from(e.dataTransfer.types||[]).indexOf("Files")>=0&&(e.preventDefault(),setDropOver(!0))},onDragLeave:e=>{e.currentTarget.contains(e.relatedTarget)||setDropOver(!1)},onDrop:e=>{if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length){e.preventDefault(),setDropOver(!1),startUploads(e.dataTransfer.files)}}},
ntH("div",{className:"nt-ed-inner"},
ntH("div",{className:"nt-ed-head"},
ntH("button",{type:"button",className:"nt-iconbtn nt-back","aria-label":"Back to notes",onClick:onClose},ntH(NtIcon,{name:"x",size:18})),
ntH("input",{ref:titleRef,className:"nt-title",value:note.title||"",placeholder:"Untitled note","aria-label":"Note title",maxLength:200,onChange:e=>store.update(note.id,{title:e.target.value}),onKeyDown:e=>{if(e.key==="Enter"){e.preventDefault(),bodyRef.current&&bodyRef.current.focus()}}}),
ntH("button",{type:"button",className:"nt-iconbtn"+(note.pinned?" is-on":""),"aria-label":note.pinned?"Unpin note":"Pin note","aria-pressed":!!note.pinned,title:note.pinned?"Unpin":"Pin",disabled:note.archived,onClick:()=>store.pin(note.id,!note.pinned)},ntH(NtIcon,{name:"pin",size:18,filled:!!note.pinned})),
ntH("button",{type:"button",className:"nt-iconbtn nt-maxbtn","aria-label":focusMode?"Exit full-page editor":"Open full-page editor",title:focusMode?"Exit full page":"Full page",onClick:onToggleFocus},ntH(NtIcon,{name:focusMode?"min":"max",size:17}))),
ntH("div",{className:"nt-toolbar",role:"toolbar","aria-label":"Formatting"},
tb("bold","Bold",()=>ex("bold"),fmt.bold,mod+"B"),tb("italic","Italic",()=>ex("italic"),fmt.italic,mod+"I"),tb("underline","Underline",()=>ex("underline"),fmt.underline,mod+"U"),tb("heading","Heading",doHeading,fmt.h),
ntH("span",{className:"nt-sep","aria-hidden":"true"}),
tb("list","Bulleted list",()=>doList("ul"),fmt.ul),tb("ol","Numbered list",()=>doList("ol"),fmt.ol),tb("todo","Checklist",doCheck,fmt.check,mod+"Shift+L"),tb("link","Link",openLink,!1,mod+"K"),
ntH("span",{className:"nt-sep","aria-hidden":"true"}),
tb("undo","Undo",()=>ex("undo"),null,mod+"Z"),tb("redo","Redo",()=>ex("redo"),null,mod+"Shift+Z"),tb("eraser","Clear formatting",doClear),
ntH("span",{className:"nt-sep","aria-hidden":"true"}),
tb("up","Move line up",()=>moveLi(-1),null,"Alt+↑"),tb("down","Move line down",()=>moveLi(1),null,"Alt+↓")),
linkOpen&&ntH("form",{className:"nt-linkbar",onSubmit:e=>{e.preventDefault(),applyLink(!1)}},ntH("input",{className:"nt-input",autoFocus:!0,type:"text",inputMode:"url",placeholder:"Paste or type a link","aria-label":"Link address",value:linkUrl,onChange:e=>setLinkUrl(e.target.value),onKeyDown:e=>{e.key==="Escape"&&(e.stopPropagation(),setLinkOpen(!1))}}),ntH("button",{type:"submit",className:"nt-btn nt-btn-primary"},"Apply"),ntH("button",{type:"button",className:"nt-btn",onClick:()=>applyLink(!0)},"Unlink"),ntH("button",{type:"button",className:"nt-btn nt-btn-ghost",onClick:()=>setLinkOpen(!1)},"Cancel")),
ntH("div",{ref:bodyRef,className:"nt-body",contentEditable:!0,suppressContentEditableWarning:!0,role:"textbox","aria-multiline":"true","aria-label":"Note content","data-ph":"Start writing…","data-empty":"1",spellCheck:!0,onInput:schedule,onBlur:commit,onPaste,onKeyDown:onBodyKey,onMouseDown:onBodyMouseDown,onClick:onBodyClick,onKeyUp:refreshFmt,onMouseUp:refreshFmt}),
ntH("div",{className:"nt-sec"},
ntH("div",{className:"nt-sec-row"},ntH("span",{className:"nt-sec-label"},ntH(NtIcon,{name:"tag",size:14}),"Tags"),
ntH("div",{className:"nt-tags-edit"},(note.tags||[]).map(t=>ntH("span",{key:t,className:"nt-tagwrap"},ntH(NtTagChip,{name:t,map:tagColors,onClick:()=>setColorFor(colorFor===t?null:t),onRemove:()=>removeTag(t)}),colorFor===t&&ntH(NtColorPop,{value:ntTagColor(t,tagColors),onPick:c=>{onSetTagColor(t,c),setColorFor(null)},onClose:()=>setColorFor(null)}))),
ntH("input",{className:"nt-taginput",value:tagInput,placeholder:(note.tags||[]).length?"Add tag":"Add a tag","aria-label":"Add tag",list:"nt-taglist-"+note.id,maxLength:48,onChange:e=>{const v=e.target.value;v.indexOf(",")>=0?addTags(v):setTagInput(v)},onKeyDown:e=>{if(e.key==="Enter"){e.preventDefault(),addTags(tagInput)}else if(e.key==="Backspace"&&!tagInput&&(note.tags||[]).length)removeTag(note.tags[note.tags.length-1])},onBlur:()=>tagInput.trim()&&addTags(tagInput)}),
ntH("datalist",{id:"nt-taglist-"+note.id},allTags.filter(t=>!(note.tags||[]).some(x=>x.toLowerCase()===t.toLowerCase())).map(t=>ntH("option",{key:t,value:t}))))),
ntH("div",{className:"nt-sec-row nt-rem-row"},ntH("span",{className:"nt-sec-label"},ntH(NtIcon,{name:"bell",size:14}),"Reminder"),
ntH("div",{className:"nt-relwrap"},ntH("button",{type:"button",className:"nt-rembtn","data-rem":st.kind,"aria-haspopup":"dialog","aria-expanded":remOpen,onClick:()=>setRemOpen(o=>!o)},note.reminder?[ntH(NtIcon,{key:"i",name:st.kind==="overdue"?"alert":st.kind==="done"?"check":"clock",size:14}),ntH("span",{key:"t"},(st.kind==="overdue"?"Overdue · ":st.kind==="done"?"Done · ":st.kind==="today"?"Today · ":"")+st.label)]:[ntH(NtIcon,{key:"i",name:"plus",size:14}),ntH("span",{key:"t"},"Add reminder")]),
remOpen&&ntH(NtReminderPop,{rem:note.reminder,onSave:setRem,onClear:()=>{store.update(note.id,{reminder:null},{meta:!0}),setRemOpen(!1)},onClose:()=>setRemOpen(!1)}))),
ntH("div",{className:"nt-sec-row nt-att-row"},ntH("span",{className:"nt-sec-label"},ntH(NtIcon,{name:"clip",size:14}),"Attachments"),
ntH("div",{className:"nt-att-wrap"},
(note.attachments||[]).map(a=>ntH("div",{key:a.id,className:"nt-att"},ntH("span",{className:"nt-att-ico","aria-hidden":"true"},ntH(NtIcon,{name:"file",size:16})),ntH("span",{className:"nt-att-info"},ntH("span",{className:"nt-att-name",title:a.name},a.name),ntH("span",{className:"nt-att-sub"},ntFileKind(a.name,a.type)+" · "+ntFmtSize(a.size))),
ntH("button",{type:"button",className:"nt-iconbtn","aria-label":"Download "+a.name,title:"Download",onClick:()=>download(a)},ntH(NtIcon,{name:"dl",size:15})),
confirmAtt===a.id?ntH("span",{className:"nt-att-confirm"},ntH("button",{type:"button",className:"nt-btn nt-btn-danger nt-btn-sm",onClick:()=>{store.removeAttachment(note.id,a.id),setConfirmAtt(null)}},"Remove"),ntH("button",{type:"button",className:"nt-btn nt-btn-sm",onClick:()=>setConfirmAtt(null)},"Keep")):ntH("button",{type:"button",className:"nt-iconbtn","aria-label":"Remove "+a.name,title:"Remove",onClick:()=>setConfirmAtt(a.id)},ntH(NtIcon,{name:"x",size:15})))),
uploads.map(u=>ntH("div",{key:u.key,className:"nt-att is-up"+(u.err?" has-err":"")},ntH("span",{className:"nt-att-ico","aria-hidden":"true"},ntH(NtIcon,{name:u.err?"alert":"file",size:16})),ntH("span",{className:"nt-att-info"},ntH("span",{className:"nt-att-name",title:u.name},u.name),u.err?ntH("span",{className:"nt-att-sub nt-err-text",role:"alert"},u.err):ntH("span",{className:"nt-att-sub"},"Uploading… "+u.pct+"%"),!u.err&&ntH("span",{className:"nt-prog",role:"progressbar","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":u.pct,"aria-label":"Upload progress for "+u.name},ntH("span",{style:{width:u.pct+"%"}}))),u.err&&ntH("button",{type:"button",className:"nt-iconbtn","aria-label":"Dismiss",onClick:()=>setUploads(x=>x.filter(y=>y.key!==u.key))},ntH(NtIcon,{name:"x",size:15})))),
ntH("input",{ref:fileRef,type:"file",multiple:!0,className:"nt-sr",tabIndex:-1,"aria-hidden":"true",onChange:e=>{startUploads(e.target.files),e.target.value=""}}),
ntH("button",{type:"button",className:"nt-btn nt-btn-ghost nt-addfile",onClick:()=>fileRef.current&&fileRef.current.click()},ntH(NtIcon,{name:"plus",size:14}),"Add file"),
ntH("span",{className:"nt-hint"},"Images, PDFs, spreadsheets, documents · up to 10 MB each")))),
err&&ntH("div",{className:"nt-err",role:"alert"},ntH(NtIcon,{name:"alert",size:14}),err),
sv.state==="error"&&ntH("div",{className:"nt-err",role:"status"},ntH(NtIcon,{name:"cloudoff",size:14}),(sv.msg||"Couldn't sync.")+" Your changes are kept on this device and we'll keep retrying.",ntH("button",{type:"button",className:"nt-link",onClick:()=>store.flush()},"Retry now"))),
ntH("div",{className:"nt-ed-foot"},
ntH("div",{className:"nt-savestat"},ntH("span",{className:"nt-saved","data-s":sv.state},sv.state==="saved"&&ntH(NtIcon,{name:"check",size:13,strokeWidth:2.8}),sv.state==="error"&&ntH(NtIcon,{name:"cloudoff",size:13}),saveText),ntH("span",{className:"nt-edited"},ntRelEdited(note.editedAt))),
ntH("div",{className:"nt-foot-actions"},
ntH("button",{type:"button",className:"nt-btn",onClick:onArchive},ntH(NtIcon,{name:note.archived?"restore":"archive",size:15}),note.archived?"Restore":"Archive"),
ntH("button",{type:"button",className:"nt-btn nt-btn-danger-o",onClick:onDelete},ntH(NtIcon,{name:"trash",size:15}),"Delete"),
ntH("button",{type:"button",className:"nt-btn nt-btn-primary",onClick:onDone},"Done"))),
dropOver&&ntH("div",{className:"nt-dropmask","aria-hidden":"true"},"Drop files to attach"))}

/* ---- page parts ---- */
function NtSkeleton({compact}){return ntH("div",{className:"nt-grid"+(compact?" is-list":""),"aria-busy":"true","aria-label":"Loading notes"},[0,1,2,3,4,5].map(i=>ntH("div",{key:i,className:"nt-card nt-skel","aria-hidden":"true"},ntH("span",{className:"nt-sk w60"}),ntH("span",{className:"nt-sk w100"}),ntH("span",{className:"nt-sk w90"}),ntH("span",{className:"nt-sk w40"}))))}
function NtEmpty({icon,title,text,children}){return ntH("div",{className:"nt-empty"},ntH("div",{className:"nt-empty-ico","aria-hidden":"true"},ntH(NtIcon,{name:icon||"note",size:30,strokeWidth:1.6})),ntH("h2",null,title),text&&ntH("p",null,text),children&&ntH("div",{className:"nt-empty-actions"},children))}
function NtSetupBanner(){const[show,setShow]=useState(!1),[copied,setCopied]=useState(!1);
const copy=async()=>{try{await navigator.clipboard.writeText(NT_SETUP_SQL),setCopied(!0),setTimeout(()=>setCopied(!1),2200)}catch{setShow(!0)}};
return ntH("div",{className:"nt-banner",role:"status"},ntH("div",{className:"nt-banner-row"},ntH(NtIcon,{name:"cloudoff",size:18}),ntH("div",{className:"nt-banner-text"},ntH("strong",null,"Cloud sync isn't set up yet."),ntH("span",null," Your notes are saved on this device only. Run the one-time setup in Supabase to sync notes and attachments across all your devices.")),
ntH("div",{className:"nt-banner-btns"},ntH("button",{type:"button",className:"nt-btn nt-btn-primary nt-btn-sm",onClick:copy},ntH(NtIcon,{name:"copy",size:14}),copied?"Copied":"Copy setup SQL"),ntH("button",{type:"button",className:"nt-btn nt-btn-sm","aria-expanded":show,onClick:()=>setShow(s=>!s)},show?"Hide steps":"Show steps"))),
show&&ntH("div",{className:"nt-steps"},ntH("ol",null,ntH("li",null,"Open your Supabase project → ",ntH("b",null,"SQL Editor"),"."),ntH("li",null,"Paste the copied SQL and press ",ntH("b",null,"Run"),"."),ntH("li",null,"Come back and reload Finlume — your notes sync automatically.")),ntH("pre",{tabIndex:0,"aria-label":"Setup SQL"},NT_SETUP_SQL)))}
function NtNotice({kind,children,action,onAction}){return ntH("div",{className:"nt-banner is-"+kind,role:"status"},ntH("div",{className:"nt-banner-row"},ntH(NtIcon,{name:kind==="offline"?"cloudoff":"alert",size:18}),ntH("div",{className:"nt-banner-text"},children),action&&ntH("button",{type:"button",className:"nt-btn nt-btn-sm",onClick:onAction},action)))}

function ntSampleNotes(){const now=new Date,ymd=d=>{const x=new Date(now);x.setDate(x.getDate()+d);return ntLocalYMD(x)};
const cl=(items)=>'<ul class="nt-check">'+items.map(([t,d])=>"<li"+(d?' data-done="1"':"")+">"+t+"</li>").join("")+"</ul>";
return[
{title:"2026 financial goals",tags:["Planning","Goals"],pinned:!0,body:"<ul><li>Build a six-month emergency fund</li><li>Use tax-saving options before the financial year ends</li><li>Review SIPs every quarter</li><li>Clear high-interest debt first</li></ul>"},
{title:"Questions for my CA",tags:["Taxes"],body:cl([["Collect Form 16",1],["Ask about HRA exemption",0],["Confirm advance tax dates",0],["Share rent receipts",0]]),reminder:{date:ymd(5),time:null,done:!1}},
{title:"Investment ideas",tags:["Research"],body:"<p>Compare index funds and flexi-cap funds on cost and consistency.</p><p>Read up on debt fund taxation before moving the emergency fund.</p>"},
{title:"Subscription audit",tags:["Reminder"],body:"<p>List every recurring charge, cancel what I haven't used in 60 days, and move annual renewals into the calendar.</p>",reminder:{date:ymd(13),time:null,done:!1}},
{title:"Home renovation budget notes",tags:["Personal"],body:"<p>Get three quotes for the kitchen and bathroom work. Keep a 15% buffer for surprises.</p>"},
{title:"Gift ideas",tags:["Personal"],body:"<ul><li>Books for dad</li><li>Kitchen set for the housewarming</li><li>Something handmade for mum</li></ul>"}]}

/* ---- the page ---- */
function NotesPage({store,query,onQuery,newToken,settings,onSaveSettings}){
const[prefs,setPrefs]=useState(()=>{const p=ntLsGet(NT_LS_PREFS)||{};return{view:p.view==="list"?"list":"grid",sort:NT_SORTS.some(s=>s[0]===p.sort)?p.sort:"updated",filter:NT_FILTERS.some(f=>f[0]===p.filter)?p.filter:"all"}});
const setPref=useCallback((k,v)=>setPrefs(p=>{const n={...p,[k]:v};ntLsSet(NT_LS_PREFS,n);return n}),[]);
const[openId,setOpenId]=useState(null),[focusMode,setFocusMode]=useState(!1),[focusTok,setFocusTok]=useState(0),[tagFilter,setTagFilter]=useState(null),[dragId,setDragId]=useState(null),[overId,setOverId]=useState(null),[confirm,setConfirm]=useState(null),[closeMsg,setCloseMsg]=useState("");
const rootRef=useRef(null),[dark,setDark]=useState(!1),overlay=ntUseMedia("(max-width: 1023px)"),apiRef=useRef(null),sref=useRef(store),openRef=useRef(null),lastTok=useRef(newToken);
sref.current=store,openRef.current=openId;
useLayoutEffect(()=>{const d=!!(rootRef.current&&rootRef.current.closest(".krn-dark"));d!==dark&&setDark(d)});
const portal=node=>ReactDOM.createPortal(ntH("div",{className:"nt-root nt-portal"+(dark?" krn-dark":"")},node),document.body);
ntUseTick(60000);
const tagColors=(settings&&settings.noteTagColors)||{};
const notes=store.notes;
const terms=useMemo(()=>String(query||"").toLowerCase().split(/\s+/).filter(Boolean),[query]);
const allTags=useMemo(()=>{const m=new Map;notes.forEach(n=>(n.tags||[]).forEach(t=>{const k=t.toLowerCase();m.has(k)||m.set(k,t)}));return[...m.values()].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()))},[notes]);
const filtered=useMemo(()=>{let base=notes.filter(n=>prefs.filter==="archived"?n.archived:!n.archived);
if(prefs.filter==="pinned")base=base.filter(n=>n.pinned);else if(prefs.filter==="reminders")base=base.filter(n=>n.reminder&&n.reminder.date);
if(tagFilter)base=base.filter(n=>(n.tags||[]).some(t=>t.toLowerCase()===tagFilter.toLowerCase()));
base=base.filter(n=>ntNoteMatches(n,terms));
const pinned=prefs.filter==="archived"?[]:base.filter(n=>n.pinned).sort((a,b)=>a.pinOrder-b.pinOrder||ntEditedKey(b)-ntEditedKey(a)),rest=ntSortNotes(base.filter(n=>prefs.filter==="archived"||!n.pinned),prefs.sort);
return{pinned,rest,count:pinned.length+rest.length}},[notes,prefs.filter,prefs.sort,tagFilter,terms]);
const note=openId?notes.find(n=>n.id===openId):null;
useEffect(()=>{if(openId&&!note&&store.status!=="loading")setOpenId(null),setFocusMode(!1)},[openId,note,store.status]);
useEffect(()=>{if(tagFilter&&!allTags.some(t=>t.toLowerCase()===tagFilter.toLowerCase()))setTagFilter(null)},[allTags,tagFilter]);
useEffect(()=>{if(!(overlay||focusMode)||!note)return;const prev=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=prev}},[overlay,focusMode,!!note]);
useEffect(()=>{const onUnload=()=>{apiRef.current&&apiRef.current.commit(),sref.current.flush()};window.addEventListener("pagehide",onUnload),window.addEventListener("beforeunload",onUnload);return()=>{window.removeEventListener("pagehide",onUnload),window.removeEventListener("beforeunload",onUnload);apiRef.current&&apiRef.current.commit();const id=openRef.current;id&&sref.current.cleanup(id);sref.current.flush()}},[]);
const openNote=useCallback((id,focusIt)=>{const prev=openRef.current;prev&&prev!==id&&(apiRef.current&&apiRef.current.commit(),sref.current.cleanup(prev));setCloseMsg(""),setOpenId(id),setFocusTok(t=>t+1),focusIt===!0&&setFocusMode(!0)},[]);
const openFocus=useCallback(id=>openNote(id,!0),[openNote]);
const closeEditor=useCallback(()=>{apiRef.current&&apiRef.current.commit();const id=openRef.current;id&&sref.current.cleanup(id);setOpenId(null),setFocusMode(!1),setCloseMsg(""),sref.current.flush()},[]);
const createNew=useCallback(()=>{const s=sref.current,cur=openRef.current?s.getAll().find(n=>n.id===openRef.current):null;if(cur&&ntIsEmptyNote(cur)&&!cur.archived){setFocusTok(t=>t+1);return}onQuery&&onQuery("");setTagFilter(null),setPrefs(p=>{if(p.filter==="all")return p;const n={...p,filter:"all"};ntLsSet(NT_LS_PREFS,n);return n});const n=s.create();openNote(n.id)},[onQuery,openNote]);
useEffect(()=>{if(newToken!==lastTok.current){lastTok.current=newToken;newToken>0&&createNew()}},[newToken]);
const addSamples=useCallback(()=>{const s=sref.current;ntSampleNotes().reverse().forEach((sn,i,arr)=>{const t=new Date(Date.now()-(arr.length-1-i)*6e4).toISOString(),n=s.create({...sn,plain:ntPlain(sn.body),editedAt:t,pinOrder:0,_new:!1});s.update(n.id,{},{meta:!0})})},[]);
useEffect(()=>{const onKey=async e=>{if(e.key!=="Escape"||e.defaultPrevented||!openRef.current)return;const t=e.target;if(t&&t.closest&&t.closest("[role=menu],[role=dialog]:not(.nt-editor)"))return;if(document.querySelector(".fixed.inset-0.z-50, [data-modal-open]"))return;e.preventDefault();if(focusMode){setFocusMode(!1);return}apiRef.current&&apiRef.current.commit();const sv=sref.current.save;if(sv.state==="error"||sv.state==="saving"){const ok=await sref.current.flush();if(!ok){setCloseMsg("Still syncing — your text is safe on this device. Press Done to close anyway.");return}}closeEditor()};document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey)},[focusMode,closeEditor]);
const onAction=useCallback((act,id)=>{const s=sref.current,n=s.getAll().find(x=>x.id===id);if(!n)return;
if(act==="open")openNote(id);
else if(act==="pin")s.pin(id,!n.pinned);
else if(act==="reminder"){openNote(id)}
else if(act==="duplicate"){const c=s.duplicate(id);c&&openNote(c.id)}
else if(act==="archive"){s.archive(id,!0),openRef.current===id&&closeEditor()}
else if(act==="restore"){s.archive(id,!1),openRef.current===id&&closeEditor()}
else if(act==="delete"){openRef.current===id&&closeEditor(),s.remove(id)}
else if(act==="purge")setConfirm(id);
else if(act==="earlier"||act==="later"){const ids=s.getAll().filter(x=>x.pinned&&!x.archived).sort((a,b)=>a.pinOrder-b.pinOrder).map(x=>x.id),i=ids.indexOf(id),j=act==="earlier"?i-1:i+1;if(i>=0&&j>=0&&j<ids.length){ids.splice(j,0,ids.splice(i,1)[0]),s.reorderPinned(ids)}}},[openNote,closeEditor]);
const onDragOver=useCallback((e,id)=>{e.preventDefault();try{e.dataTransfer.dropEffect="move"}catch{}setOverId(id)},[]);
const onDrop=useCallback((e,id)=>{e.preventDefault();const from=dragId;setDragId(null),setOverId(null);if(!from||from===id)return;const ids=sref.current.getAll().filter(x=>x.pinned&&!x.archived).sort((a,b)=>a.pinOrder-b.pinOrder).map(x=>x.id),fi=ids.indexOf(from),ti=ids.indexOf(id);if(fi<0||ti<0)return;ids.splice(ti,0,ids.splice(fi,1)[0]),sref.current.reorderPinned(ids)},[dragId]);
const onDragEnd=useCallback(()=>{setDragId(null),setOverId(null)},[]);
const setTagColor=useCallback((name,color)=>{onSaveSettings&&onSaveSettings({noteTagColors:{...tagColors,[name]:color}})},[onSaveSettings,tagColors]);
const total=notes.length,archivedCount=notes.filter(n=>n.archived).length,activeCount=total-archivedCount;
const compact=prefs.view==="list",showSkeleton=store.status==="loading";
const canDragPinned=prefs.filter==="all"&&!terms.length&&!tagFilter&&filtered.pinned.length>1;
const card=(n,drag)=>ntH(NtCard,{key:n.id,n,selected:openId===n.id,compact,tagColors,tick:0,canDrag:drag,isOver:drag&&overId===n.id&&dragId&&dragId!==n.id,onOpen:openNote,onOpenFocus:openFocus,onAction,onDragStart:setDragId,onDragOver,onDrop,onDragEnd});
let content;
if(showSkeleton)content=ntH(NtSkeleton,{compact});
else if(store.status==="error")content=ntH(NtEmpty,{icon:"alert",title:"Couldn't load your notes",text:store.loadError||"Check your connection and try again."},ntH("button",{type:"button",className:"nt-btn nt-btn-primary",onClick:store.refresh},"Try again"));
else if(filtered.count===0){
if(terms.length)content=ntH(NtEmpty,{icon:"search",title:"No matching notes",text:"Nothing matches “"+String(query).trim()+"”. Try different words, or check the Archived filter."},ntH("button",{type:"button",className:"nt-btn",onClick:()=>onQuery&&onQuery("")},"Clear search"));
else if(tagFilter)content=ntH(NtEmpty,{icon:"tag",title:"No notes with this tag",text:"Nothing here is tagged “"+tagFilter+"”."},ntH("button",{type:"button",className:"nt-btn",onClick:()=>setTagFilter(null)},"Clear tag filter"));
else if(prefs.filter==="pinned")content=ntH(NtEmpty,{icon:"pin",title:"No pinned notes",text:"Pin a note to keep it at the top of your list."});
else if(prefs.filter==="reminders")content=ntH(NtEmpty,{icon:"bell",title:"No reminders",text:"Add a reminder to any note and it will show up here."});
else if(prefs.filter==="archived")content=ntH(NtEmpty,{icon:"archive",title:"Nothing archived",text:"Archived notes are kept here. You can restore them any time."});
else content=ntH(NtEmpty,{icon:"note",title:"Start capturing your ideas",text:"Create notes for goals, reminders, research, or anything you want to remember."},ntH("button",{type:"button",className:"nt-btn nt-btn-primary",onClick:createNew},ntH(NtIcon,{name:"plus",size:15}),"Create your first note"),activeCount===0&&ntH("button",{type:"button",className:"nt-btn nt-btn-ghost",onClick:addSamples},"Add sample notes"))}
else{const grid=list=>ntH("div",{className:"nt-grid"+(compact?" is-list":""),role:"list"},list.map(n=>ntH("div",{key:n.id,role:"listitem",className:"nt-cell"},card(n,canDragPinned&&n.pinned))));
content=ntH(React.Fragment,null,filtered.pinned.length>0&&ntH("section",{"aria-label":"Pinned notes"},filtered.rest.length>0&&ntH("h2",{className:"nt-group"},ntH(NtIcon,{name:"pin",size:12,filled:!0}),"Pinned"),grid(filtered.pinned)),filtered.rest.length>0&&ntH("section",{"aria-label":"Notes"},filtered.pinned.length>0&&ntH("h2",{className:"nt-group"},"Notes"),grid(filtered.rest)))}
const sv=store.save,live=sv.state==="saving"?"Saving":sv.state==="saved"?"Saved":sv.state==="error"?"Couldn't sync. Changes are kept on this device.":"";
const editorEl=note&&ntH(NtEditor,{key:note.id,note,store,tagColors,allTags,onSetTagColor:setTagColor,focusMode,onToggleFocus:()=>setFocusMode(f=>!f),onDone:closeEditor,onClose:closeEditor,onArchive:()=>onAction(note.archived?"restore":"archive",note.id),onDelete:()=>note.archived?setConfirm(note.id):onAction("delete",note.id),apiRef,focusToken:focusTok,overlay}),floating=overlay||focusMode;
return ntH("div",{ref:rootRef,className:"nt-root"+(note?" has-editor":"")},
ntH("div",{className:"nt-sr",role:"status","aria-live":"polite"},live),
store.status==="missing"&&ntH(NtSetupBanner,null),
store.status==="offline"&&ntH(NtNotice,{kind:"offline",action:"Retry",onAction:store.refresh},ntH("strong",null,"You're offline or the server is unreachable."),ntH("span",null," Showing your saved copy. Edits are stored on this device and sync when the connection returns.")),
ntH("div",{className:"nt-shell"},
ntH("div",{className:"nt-main"},
ntH("div",{className:"nt-controls"},
ntH("div",{className:"nt-chips",role:"group","aria-label":"Filter notes"},NT_FILTERS.map(f=>ntH("button",{key:f[0],type:"button",className:"nt-chip","aria-pressed":prefs.filter===f[0],onClick:()=>{setPref("filter",f[0])}},f[1]))),
ntH("div",{className:"nt-right"},
ntH("label",{className:"nt-sortwrap"},ntH(NtIcon,{name:"sort",size:14}),ntH("span",{className:"nt-sr"},"Sort notes"),ntH("select",{className:"nt-select",value:prefs.sort,onChange:e=>setPref("sort",e.target.value)},NT_SORTS.map(s=>ntH("option",{key:s[0],value:s[0]},s[1])))),
ntH("div",{className:"nt-viewtog",role:"group","aria-label":"View mode"},ntH("button",{type:"button","aria-label":"Grid view","aria-pressed":!compact,className:"nt-iconbtn"+(!compact?" is-on":""),onClick:()=>setPref("view","grid")},ntH(NtIcon,{name:"grid",size:17})),ntH("button",{type:"button","aria-label":"List view","aria-pressed":compact,className:"nt-iconbtn"+(compact?" is-on":""),onClick:()=>setPref("view","list")},ntH(NtIcon,{name:"list",size:17}))))),
allTags.length>0&&ntH("div",{className:"nt-tagrow",role:"group","aria-label":"Filter by tag"},ntH("span",{className:"nt-tagrow-label"},"Tags"),allTags.map(t=>ntH(NtTagChip,{key:t,name:t,map:tagColors,small:!0,pressed:!!tagFilter&&tagFilter.toLowerCase()===t.toLowerCase(),onClick:()=>setTagFilter(tagFilter&&tagFilter.toLowerCase()===t.toLowerCase()?null:t)}))),
content),
note&&!floating&&editorEl),
note&&floating&&portal(ntH(React.Fragment,null,ntH("div",{className:"nt-backdrop",onClick:()=>focusMode?setFocusMode(!1):closeEditor()}),editorEl)),
portal(ntH(React.Fragment,null,closeMsg&&ntH("div",{className:"nt-toast",role:"alert"},closeMsg),!note&&ntH("button",{type:"button",className:"nt-fab","aria-label":"New note",onClick:createNew},ntH(NtIcon,{name:"plus",size:22,strokeWidth:2.4})))),
ntH(NtConfirm,{open:!!confirm,title:"Delete permanently?",body:"This note and its attachments will be deleted for good. This can't be undone.",confirmLabel:"Delete permanently",onClose:()=>setConfirm(null),onConfirm:()=>{const id=confirm;setConfirm(null);openRef.current===id&&(setOpenId(null),setFocusMode(!1));sref.current.purge(id)}}))}



return NotesPage;
}
