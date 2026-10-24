import { useEffect } from "react";

const CURRENCY_VALUE = /^(?:[+\-−]\s*)?(?:₹|\$|€|£|¥|INR\s*|USD\s*|EUR\s*|GBP\s*)\s*[\d,]+(?:\.\d{1,2})?(?:\s*\/\s*month)?$/i;

export function usePrivacyAmounts(enabled) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector(".lg-shell.krn-privacy-blur");
    if (!root) return;
    let frame = 0;
    const pending = new Set([root]);
    const scan = () => {
      frame = 0;
      const targets = [...pending].filter(target => {
        if (!target || target !== root && !root.contains(target)) return false;
        for (let parent = target.parentElement; parent; parent = parent.parentElement) if (pending.has(parent)) return false;
        return true;
      });
      pending.clear();
      for (const target of targets) {
      const candidates = target.matches?.("p, span, div, td, strong") ? [target, ...target.querySelectorAll("p, span, div, td, strong")] : target.querySelectorAll?.("p, span, div, td, strong") || [];
      for (const element of candidates) {
        if (element.children.length || element.classList.contains("krn-amount")) continue;
        if (!CURRENCY_VALUE.test(element.textContent.trim())) continue;
        element.classList.add("krn-amount");
        if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
        element.title = "Focus or hover to reveal amount";
      }
      }
    };
    scan();
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") pending.add(mutation.target.parentElement);
        else for (const node of mutation.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) pending.add(node);
      }
      pending.delete(null);
      if (!frame) frame = requestAnimationFrame(scan);
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [enabled]);
}
