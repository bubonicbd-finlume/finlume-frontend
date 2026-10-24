import React, { useState } from "react";

export function AuthPasswordField({ label, value, onChange, autoComplete, inputClassName, marginClassName = "mb-3.5" }) {
  const [visible, setVisible] = useState(false);
  return React.createElement("div", { className: `block ${marginClassName}` },
    React.createElement("label", { className: "block text-[13px] font-medium text-slate-600 mb-1.5", htmlFor: `auth-${autoComplete}-${label.replace(/\W+/g, "-").toLowerCase()}` }, label),
    React.createElement("div", { className: "relative" },
      React.createElement("input", {
        id: `auth-${autoComplete}-${label.replace(/\W+/g, "-").toLowerCase()}`,
        type: visible ? "text" : "password",
        required: true,
        minLength: 10,
        maxLength: 64,
        autoComplete,
        className: `${inputClassName} pr-16`,
        value,
        onChange: event => onChange(event.target.value.slice(0, 64)),
      }),
      React.createElement("button", {
        type: "button",
        "aria-label": visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`,
        "aria-pressed": visible,
        onClick: () => setVisible(current => !current),
        className: "absolute inset-y-0 right-2 px-2 text-[12px] font-medium text-indigo-600 hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded",
      }, visible ? "Hide" : "Show"),
    ),
  );
}
