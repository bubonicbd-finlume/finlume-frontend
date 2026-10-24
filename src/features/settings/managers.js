import React, { useRef, useState } from "react";
import { createKeywordRulesManager } from "./keyword-rules.js";
import { RulePreviewPanel } from "./rule-preview-panel.js";
import { categoryFromAdvancedDraft } from "./rule-preview.js";

export function createSettingsManagers(deps) {
const { Button, Card, EmptyState, IconButton, ListChecks, ManageEntryModal, Pencil, Pill, Plus, ToggleSwitch, Trash2, inputCls, nowISO, selectCls, uid } = deps;
const KeywordRulesManager = createKeywordRulesManager(deps);
function CategorizationRulesManager({settings,transactions,onConfirmCategorizationSettings}){
  return React.createElement("section",{"aria-label":"Automatic categorization",className:"space-y-5"},
    React.createElement("div",null,
      React.createElement("h3",{className:"text-[16px] font-semibold text-slate-800 mb-1"},"Automatic categorization"),
      React.createElement("p",{className:"text-[12.5px] text-slate-500"},"Create and review text rules in one place. Existing name and keyword rules keep their saved format and matching order. Advanced rules can also add tags and may override an earlier category.")),
    React.createElement(KeywordRulesManager,{settings,transactions,onConfirmCategorizationSettings}),
    React.createElement(CategorizationRulesEditor,{settings,transactions,onConfirmCategorizationSettings}));
}function CategorizationRulesEditor({settings,transactions,onConfirmCategorizationSettings}) {
  const [ruleModalOpen,setRuleModalOpen]=useState(false),[editingRule,setEditingRule]=useState(null),[ruleBusy,setRuleBusy]=useState(false),[ruleError,setRuleError]=useState("");
  const rules=Array.isArray(settings.rules)?settings.rules:[],busyRef=useRef(false),pendingCreateRef=useRef(null);
  const renderRules=rules.map(rule=>rule&&typeof rule==="object"&&!Array.isArray(rule)?rule:{whenText:"Invalid saved rule",thenText:"",enabled:false});
  async function confirmRules(next){
    if(settings.rules!=null&&!Array.isArray(settings.rules))throw new Error("Saved advanced rules have an unsupported format. No change was made.");

    if(busyRef.current)throw new Error("Another rule change is in progress. Please retry.");
    busyRef.current=true;setRuleBusy(true);setRuleError("");
    try{await onConfirmCategorizationSettings("rules",rules,next)}
    finally{busyRef.current=false;setRuleBusy(false)}
  }
  async function saveRule(values){if(!String(values.whenText||"").trim())throw new Error("Enter a condition before saving this rule.");if(!values.category||!settings.categories.includes(values.category))throw new Error("Choose a category before saving this rule.");
    let next;
    if(editingRule)next=rules.map((rule,index)=>index===editingRule.index?{...rule,...values}:rule);
    else{
      if(!pendingCreateRef.current)pendingCreateRef.current={id:uid(),createdAt:nowISO()};
      next=[{...pendingCreateRef.current,enabled:true,...values},...rules];
    }
    await confirmRules(next);
    pendingCreateRef.current=null;setRuleModalOpen(false);setEditingRule(null);
  }
  async function deleteRule(index){await confirmRules(rules.filter((_,savedIndex)=>savedIndex!==index));pendingCreateRef.current=null;setRuleModalOpen(false);setEditingRule(null)}
  async function runInline(action){try{await action()}catch(e){setRuleError(e?.message||"The rule change could not be confirmed. Review and retry.")}}
  function toggleRule(index){if(!rules[index]||typeof rules[index]!=="object"||Array.isArray(rules[index])){setRuleError("This saved entry is malformed. Edit or remove that specific entry instead.");return}runInline(()=>confirmRules(rules.map((rule,savedIndex)=>savedIndex===index?{...rule,enabled:!rule.enabled}:rule)))}const ruleFields=[{name:"whenText",label:"When (merchant / source condition)",placeholder:'e.g. merchant contains "Uber"'},{name:"thenText",label:"Then (category and/or tag)",placeholder:"e.g. set category to Transportation"},{name:"category",label:"Category to assign",type:"select",options:["",...(Array.isArray(settings.categories)?settings.categories:[])]}];return React.createElement("div",null,React.createElement("div",{className:"flex items-center justify-between mb-3"},React.createElement("p",{className:"text-[13px] font-semibold text-slate-600"},"Advanced rules (when/then)"),React.createElement(Button,{variant:"primary",onClick:()=>{pendingCreateRef.current=null;setRuleError("");setEditingRule(null);setRuleModalOpen(true)},disabled:ruleBusy},React.createElement(Plus,{size:15}),"Create rule")),ruleError&&React.createElement("p",{role:"alert",className:"text-[12.5px] text-rose-700 mb-2"},ruleError),ruleBusy&&React.createElement("p",{role:"status",className:"text-[12.5px] text-slate-500 mb-2"},"Saving rule…"),React.createElement(Card,{className:"p-5"},React.createElement("p",{className:"text-[12.5px] text-slate-500 mb-4"},"Use this when a quick keyword rule isn't enough \u2014 e.g. you need to set a tag too, or the condition is more specific than a single word. When/then rules run last, after quick keyword rules above, so a rule here can override an earlier guess. They apply to newly imported and newly added transactions only."),React.createElement("div",{className:"rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden"},rules.length===0?React.createElement(EmptyState,{icon:ListChecks,title:"No rules yet",subtitle:"Rules apply automatically to future imports, after duplicate detection."}):renderRules.map((r,index)=>React.createElement("div",{key:index,className:"flex items-center justify-between px-4 py-3 bg-slate-50/70"},React.createElement("div",{className:"min-w-0"},React.createElement("p",{className:"text-[13.5px] text-slate-700"},React.createElement("span",{className:"font-medium"},"When")," ",r.whenText," ",React.createElement("span",{className:"font-medium"},"then")," ",r.category?`set category to ${r.category}`:r.thenText)),React.createElement("div",{className:"flex items-center gap-2 shrink-0 ml-3"},React.createElement(ToggleSwitch,{checked:r.enabled,onChange:()=>toggleRule(index),ariaLabel:"Toggle rule"}),React.createElement(IconButton,{icon:Pencil,label:"Edit rule",onClick:()=>{setEditingRule({rule:r,index}),setRuleModalOpen(!0)}}),React.createElement(IconButton,{icon:Trash2,label:"Delete rule",onClick:()=>runInline(()=>deleteRule(index))})))))),React.createElement(ManageEntryModal,{open:ruleModalOpen,onClose:()=>{pendingCreateRef.current=null;setRuleModalOpen(false);setEditingRule(null)},onSave:saveRule,onDelete:editingRule?()=>deleteRule(editingRule.index):null,title:editingRule?"Edit rule":"Create rule",fields:ruleFields,initial:editingRule?{...editingRule.rule,category:editingRule.rule.category||categoryFromAdvancedDraft(editingRule.rule.thenText,settings.categories)}:{whenText:"",thenText:"",category:""},renderPreview:values=>values.category&&React.createElement(RulePreviewPanel,{transactions,settings,draft:values,source:"advanced",savedIndex:editingRule?.index??-1})}))}
function SettingRow({title,desc,children,first=!1}){return React.createElement("div",{className:`flex items-center justify-between gap-4 ${first?"":"border-t border-slate-100 pt-4"}`},React.createElement("div",{className:"min-w-0"},React.createElement("p",{className:"text-[13px] font-medium text-slate-700"},title),React.createElement("p",{className:"text-[12px] text-slate-500"},desc)),React.createElement("div",{className:"shrink-0"},children))}
function SubcategoriesManager({settings,onConfirmCategorizationSettings}) {
  const [activeCategory,setActiveCategory]=useState(settings.categories[0]||""),[newSub,setNewSub]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const busyRef=useRef(false),subs=settings.subcategories||{};
  async function save(next,onSuccess){
    if(busyRef.current)return;
    busyRef.current=true;setBusy(true);setError("");
    try{await onConfirmCategorizationSettings("subcategories",subs,next);onSuccess?.()}
    catch(e){setError(e?.message||"The subcategory change could not be confirmed. Review and retry.")}
    finally{busyRef.current=false;setBusy(false)}
  }
  function addSub(){
    const sub=newSub.trim();if(!sub||!activeCategory)return;
    const existing=subs[activeCategory]||[];
    if(existing.some(value=>value.toLowerCase()===sub.toLowerCase())){setNewSub("");return}
    save({...subs,[activeCategory]:[...existing,sub]},()=>setNewSub(""));
  }
  function removeSub(category,sub){save({...subs,[category]:(subs[category]||[]).filter(value=>value!==sub)})}
  const groups=Object.keys(subs).filter(category=>(subs[category]||[]).length>0);
  return React.createElement("div",null,
    React.createElement("h3",{className:"text-[14px] font-semibold text-slate-700 mb-1"},"Subcategories"),
    React.createElement("p",{className:"text-[12.5px] text-slate-500 mb-3"},"Add finer-grained subcategories under any category — they'll show up as an optional field when adding or reviewing a transaction."),
    React.createElement(Card,{className:"p-4"},
      React.createElement("div",{className:"flex gap-2 mb-4"},
        React.createElement("select",{className:selectCls,value:activeCategory,onChange:e=>setActiveCategory(e.target.value),disabled:busy},settings.categories.map(category=>React.createElement("option",{key:category,value:category},category))),
        React.createElement("input",{className:inputCls,placeholder:"e.g. Streaming, Groceries — Organic",value:newSub,onChange:e=>setNewSub(e.target.value),onKeyDown:e=>e.key==="Enter"&&(e.preventDefault(),addSub()),disabled:busy}),
        React.createElement(Button,{variant:"secondary",onClick:addSub,disabled:busy},React.createElement(Plus,{size:15}),busy?"Saving…":null)),
      error&&React.createElement("p",{role:"alert",className:"text-[12.5px] text-rose-700 mb-3"},error),
      groups.length===0?React.createElement("p",{className:"text-[12.5px] text-slate-400"},"No subcategories yet."):
        React.createElement("div",{className:"space-y-3"},groups.map(category=>React.createElement("div",{key:category},
          React.createElement("p",{className:"text-[12px] font-medium text-slate-500 mb-1"},category),
          React.createElement("div",{className:"flex flex-wrap gap-1.5"},subs[category].map(sub=>React.createElement(Pill,{key:sub,onRemove:()=>removeSub(category,sub)},sub))))))));
}return { CategorizationRulesManager, SettingRow, SubcategoriesManager };
}
