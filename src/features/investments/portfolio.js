import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function createPortfolioGrowthChart({ EmptyState, TrendingUp, formatCurrency }) {
function PortfolioGrowthChart({history}){const chartData=useMemo(()=>(history||[]).slice(-12).map(s=>({...s,label:new Date(s.month+"-01").toLocaleDateString(void 0,{month:"short"})})),[history]);return chartData.length<2?React.createElement(EmptyState,{icon:TrendingUp,title:"Not enough history yet",subtitle:"Save a holding across a couple of months to see growth over time."}):React.createElement(ResponsiveContainer,{width:"100%",height:180},React.createElement(AreaChart,{data:chartData,margin:{left:-10,right:8}},React.createElement("defs",null,React.createElement("linearGradient",{id:"portfolioGrad",x1:"0",y1:"0",x2:"0",y2:"1"},React.createElement("stop",{offset:"0%",stopColor:"#4f46e5",stopOpacity:.3}),React.createElement("stop",{offset:"100%",stopColor:"#4f46e5",stopOpacity:0}))),React.createElement(CartesianGrid,{strokeDasharray:"3 3",vertical:!1,stroke:"#eef0f3"}),React.createElement(XAxis,{dataKey:"label",tick:{fontSize:11,fill:"#94a3b8"},axisLine:!1,tickLine:!1}),React.createElement(YAxis,{tick:{fontSize:11,fill:"#94a3b8"},axisLine:!1,tickLine:!1,width:55}),React.createElement(Tooltip,{formatter:v=>formatCurrency(v),contentStyle:{borderRadius:10,fontSize:12,border:"1px solid #e2e8f0"}}),React.createElement(Area,{type:"monotone",dataKey:"totalCurrentValue",stroke:"#4f46e5",fill:"url(#portfolioGrad)",strokeWidth:2,name:"Portfolio value"})))}
return PortfolioGrowthChart;
}

export function createPortfolioRiskChecks({ Card, ShieldAlert }) {
function PortfolioRiskChecks({ investments }) {
  const { total, checks } = window.__FINLUME_FEATURES__.wealth.concentrationChecks(investments);
  if (!total) return null;
  const toneClass = tone => tone === "rose" ? "bg-rose-50 border-rose-100 text-rose-700" : tone === "amber" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-sky-50 border-sky-100 text-sky-700";
  return React.createElement(Card, { className: "p-5" },
    React.createElement("div", { className: "flex items-center gap-2 mb-1" }, React.createElement(ShieldAlert, { size: 15, className: checks.length ? "text-amber-500" : "text-emerald-500" }), React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700" }, "Portfolio concentration check")),
    React.createElement("p", { className: "text-[12px] text-slate-400 mb-3" }, "Simple diversification checks based on the current values you entered; this is not investment advice."),
    checks.length === 0 ? React.createElement("p", { className: "rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-[12.5px] text-emerald-700" }, "No major single-holding or asset-class concentration is showing.") : React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2" }, checks.map(check => React.createElement("div", { key: check.title, className: `rounded-xl border px-3 py-3 ${toneClass(check.tone)}` }, React.createElement("p", { className: "text-[12.5px] font-semibold" }, check.title), React.createElement("p", { className: "text-[11.5px] mt-0.5 opacity-85" }, check.detail))))
  );
}
return PortfolioRiskChecks;
}
