import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createAboutPage } from "../src/features/about/page.js";

const box = ({ children }) => React.createElement("div", null, children);

test("About page retains its mission and support action", () => {
  const AboutPage = createAboutPage({ Button: box, Card: box, Modal: () => null });
  const html = renderToString(React.createElement(AboutPage));
  assert.match(html, /Our Mission/);
  assert.match(html, /Support/);
});
