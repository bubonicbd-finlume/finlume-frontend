export function describeSignupError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "").toLowerCase();
  if (code === "email_exists" || /user already registered/i.test(message)) {
    return "This email already has an account. Sign in or use Forgot password.";
  }
  if (code === "over_email_send_rate_limit") {
    return "Too many confirmation emails were requested. Please wait and try again later.";
  }
  if ((code === "unexpected_failure" && /email/i.test(message)) || /error sending confirmation email|failed to send.*email/i.test(message)) {
    return "We couldn't send the confirmation email. This doesn't mean the account is a duplicate. Please try again later or contact support.";
  }
  return message || "Could not create the account. Please try again.";
}
