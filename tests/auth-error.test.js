import test from "node:test";
import assert from "node:assert/strict";
import { describeSignupError } from "../src/platform/auth-error.js";

test("confirmation delivery error does not accuse user of a duplicate account", () => {
  const text = describeSignupError({ message: "Error sending confirmation email", code: "unexpected_failure" });
  assert.match(text, /couldn't send the confirmation email/i);
  assert.match(text, /doesn't mean the account is a duplicate/i);
});

test("known duplicate and rate limit errors offer the relevant next step", () => {
  assert.match(describeSignupError({ code: "email_exists" }), /sign in/i);
  assert.match(describeSignupError({ code: "over_email_send_rate_limit" }), /wait/i);
});
