# FinLume 2.0 Vite project

## Import recovery and transaction history (23 October 2026)

Transactions now has account-synced saved views, a bounded import history, and recent confirmed edit history. New imports record reconciliation counts and up to 20 duplicate and rejected row details. A rejected CSV row can open a prefilled correction form; invalid dates stay blank until reviewed. Import reversal previews the exact current rows, reads the cloud again, rejects any changed row, uses the existing version-checked whole-ledger write, and confirms uncertain outcomes. Existing imports with session IDs can be inspected, but their earlier rejection counts cannot be reconstructed. The original five isolated-account synthetic records were retained after a live import and reversal check.

Menus and dialogs share an opaque theme surface. Transaction search uses deferred input and one filter pass, the review queue renders a 60-row window, and the Transactions page offers bounded page sizes. See `docs/transaction-development-2026-10-23.md` for verification and limits.

## Dashboard usability update (23 October 2026)

Finance now shows an account-scoped save indicator. It distinguishes an in-progress write, a confirmed save, and a failure, and Settings shows the last confirmed Finance save on this device. The dashboard keeps Current Position first, shows a dismissible setup checklist for new accounts, and groups Action Inbox items into immediate, upcoming, and data-review sections. Each section initially shows a short list and can be expanded. Hidden items last for the visit; one-day snoozes are saved on the device.

See `ACCESSIBILITY-REVIEW-2026-10-23.md` for the keyboard, semantic, and responsive review and its remaining live assistive-technology check.

## Action Inbox checkpoint (22 October 2026)

The dashboard now has a read-only Action Inbox for saved transactions needing review, unpaid Dates to Remember within 30 days or overdue, scheduled recurring payments and subscriptions within 30 days, and monthly budget warnings. Each item explains its source and opens the existing resolving screen. Scheduled payments are labelled as projections, separate from recorded transactions. The Finance shell retains its existing loading and failed-read recovery screen.

The inbox also checks Split recurring reminders through read-only group queries, shows a retryable error if those reads fail, and links directly to the affected group. An unfinished statement import in the current browser session appears as an unconfirmed item with a link back to the importer. The import file and draft rows are not retained after closing the dialog, so the user must select the file again. The other requested product phases, live test-account checks, and viewport and keyboard verification remain open. No Supabase schema or saved data formats changed.

## Categorization rule preview

Settings now previews name, keyword, and advanced rule drafts against up to 25 matches from the first 500 loaded transactions. It shows matched text, current and proposed categories, and earlier or later rules that may change the result. The preview is read-only; saved transactions are not recategorised. A category must be selected before saving. Name and keyword entries can be edited or removed by saved position, and advanced toggles, edits, and removals also target one saved position even when IDs repeat. Confirmed cloud writes are required before closing the draft. Older rule arrays and keyword maps are left in place. The preview is an estimate of future matching and requires a populated isolated-account browser check.

## Financial Timeline

The new Financial Timeline navigation item opens a read-only month calendar and agenda. It combines Dates to Remember, the next saved recurring or subscription date, required loan payment days, the monthly expected-income assumption, and planned monthly goal contributions. Each item is labelled recorded, scheduled, estimated, or overdue and links to its existing screen. Projected outgoing and expected-income totals exclude recorded payments and avoid counting exact matching obligations twice. If a dated income item exists, the monthly income assumption remains visible but is not added again. Calendar selection makes no financial write. Browser layout and keyboard checks with populated isolated data remain open.

## Data Health Centre

Data Health makes a fresh read-only cloud request and offers Retry if that read fails. It previews possible duplicate transactions, incomplete transactions or documents, malformed saved setting entries, the saved backup date, and import or save issues visible in this browser session. Every finding links to the relevant existing screen. It never repairs or removes data, so malformed siblings and unrelated fields remain intact. The backup date confirms only FinLume's saved marker, not the presence of a downloaded backup file. Partial failures confined to another session or device cannot be reconstructed by this frontend and require direct cloud review.

## Scenario Workspace

The Scenario Workspace compares the current forecast with two local, unsaved sets of assumptions for income, spending, extra loan payments, and extra goal contributions. It reuses the existing cash-flow, payoff, and goal calculations. It does not change transactions, balances, or schedules. The JSON export is built from a fixed allowlist of aggregate numbers and assumption values, excluding transaction, account, merchant, and goal names. The low-balance value with added monthly contributions is an estimate, and the first saved loan and goal are used for payoff and goal comparisons. A populated isolated-account browser check remains open.

This is the maintainable Vite version of the existing single-file FinLume app. It preserves the current interface and behavior while moving third-party libraries from browser CDNs into version-locked project dependencies.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Keep the supplied local settings file, or copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
4. Run `npm run dev`.

The `.env.local` file is ignored by Git. Do not commit a service-role key. Only use a Supabase publishable key (or the older public anon key) in a browser app.

## Deploy with GitHub and Netlify

1. Add this project folder to your GitHub repository and commit everything except `.env.local`, `node_modules`, and `dist`.
2. In Netlify, use the included settings: build command `npm run build`, publish directory `dist`.
3. In **Netlify → Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Trigger a new deployment.

The included `netlify.toml` configures the build, long-lived caching for fingerprinted assets, and a single-page-app fallback. The `public/_headers` file adds production security headers.

## Project map

- `src/main.js` is now a small, predictable application entry point.
- `src/platform/` separates environment validation, Supabase setup, compatibility globals, optional imports, startup recovery, and service-worker registration.
- `src/platform/csv-export.js` prefixes formula-like text with a tab inside quoted cells in transaction, tax and Administration CSV downloads. Numeric values stay numeric; the tab remains in the CSV data if another program imports it.
- Statement imports reject files larger than 10 MB at selection, before CSV, Excel or PDF parsing and before optional backend PDF processing. The limit is shown beside the file picker. It does not change saved transactions or import mapping.
- Finance statement imports now read current cloud transactions before preparing a whole-list save and show the import summary only after the write is confirmed. If the save response fails, FinLume reads again to identify a commit whose response was lost; an uncertain result stays in the dialog with a retry message. Repeating an import checks the cloud list for duplicates first. The dialog cannot be closed while its save is in progress.
- Creating a new account inside the statement-import dialog now waits for a confirmed settings write before advancing to file selection. A failed or uncertain response keeps the account step open; retry reads current cloud settings first so a previously committed account is reused. The existing account list, account types and other settings retain their stored format.
- `src/features/split/receipt-ocr.js` loads the receipt scanner's OCR engine only when a scan starts. Its worker and English data are served from this project; `scripts/prepare-ocr-assets.cjs` copies the pinned dependency files into `public/ocr/` before local development and production builds. That generated folder is ignored by Git and is included in `dist/` by the build.
- `src/features/split/receipt-scanner.js` contains the Split receipt scanner's capture, verification, item allocation and review screens, along with its receipt parsing. The scanner UI loads when opened; its access check and expense save callbacks remain connected to the Split application.
- `src/features/split/expenses.js` contains the group overview, expenses card, expense rows, add chooser and Split CSV/Excel import dialog. It loads when a group is opened. The overview retains its balance, settlement and budget callbacks, while the manual expense dialog stays shared with quick add and scanner access remains connected through the feature factory.
- `src/features/split/expense-modal.js` contains the shared manual expense dialog, split-method controls, and quick-add group chooser. These open from a group or the Split quick-add button without loading their UI into the startup shell. The same group, guest, payer, split and save callbacks remain connected.
- `src/features/split/balances.js` contains group balances, settlement recording and preview, UPI link helpers, and settlement PDF export. It loads when a Split group opens. Existing real-member and guest settlement calls, local UPI ID storage, and PDF behavior remain connected.
- `src/features/split/recurring.js` contains Split recurring rules, their editor and rows, due-date advancement, and their Supabase calls. It loads when a group opens. Rules remain reminders until a person chooses to log an expense.
- `src/features/split/groups.js` contains the group list and detail screens, including creation, membership, guests, and activity. It loads when the Groups tab opens and keeps the existing group service calls and lazy group cards connected.
- `src/features/split/overview.js` contains the Split overview dashboard and its cross-group totals. It loads when the Overview tab opens and retains the existing balance, expense, settlement, chart and recent-activity data flow.
- `src/features/split/shell.js` contains Split navigation, the top bar, notifications, quick-add control, announcements and the shared profile-name editor. It loads when the user enters Split while its Overview and Groups tabs remain independently loaded.
- `src/features/split/services.js` contains the shared Split group, member, expense, balance and settlement calls, plus guest rows, claims, expense migration and their response mapping. The existing Split screens use the same callbacks and stored fields.
- Split group budgets and archive changes now wait for Supabase confirmation before the screen changes. Failed writes leave the current value visible and show an error so the action can be retried.
- Split budget and archived-group reads now distinguish a missing record from a failed request. The budget card offers Retry after a load failure, and the group list does not report “No groups yet” when archived preferences could not load.
- Guest linking waits for the claim write to complete. If it fails after the membership step, the group shows a retry message that explains an invitation may already have been sent.
- Guest expense reads now report errors instead of returning an empty list. Guest removal and history migration stop if the expense list is unavailable, while the expense and balance cards show a retry action.
- Guest settlement reads also report failures. Migration loads both guest expense and settlement lists before changing history, and the balance card offers Retry if either list fails.
- Guest roster and claim reads now report failures rather than appearing empty. Group detail keeps a separate retryable guest-data error, and quick add retains its existing error screen.
- Guest-history migration now reports settlement updates that Supabase rejected, so the group no longer claims all past settlements moved when some remain unchanged.
- Linking a guest to an account already in the group now runs history migration on retry. Its status calls out failed expense and settlement moves instead of reporting a full migration.
- Split recurring reminders distinguish a failed cloud read from an empty list and show a Retry action without changing reminder records.
- Split recurring pause and removal now change the screen only after Supabase confirms the write. A failed removal leaves the dialog open for retry.
- If logging a Split recurring reminder saves the expense but advancing its due date fails, the row offers “Advance reminder” without posting another expense. A small browser marker retains that retry after reload and clears when the saved reminder advances or changes.
- The guest account-link form now keeps its entered email and stays open after a failed link attempt, making the error retryable without retyping.
- Split group cards and activity now distinguish failed member, expense-total and activity reads from genuinely empty data; the group summary offers Retry.
- Split toast messages wrap instead of truncating on narrow screens, announce as status text, and stay visible longer when they need more reading time.
- The shared Finance/Split display-name update now requires Supabase to confirm one matching profile row before either name editor reports success. Split also shows a retryable profile-load error instead of silently treating a failed read as a missing profile.
- Finance now also shows a retryable profile-load error when its profile request fails, instead of silently treating the profile as absent and hiding profile-dependent navigation.
- Split overview totals now require confirmed balance, expense and settlement reads for every group. A failed read shows Retry instead of zero-valued financial cards.
- Split balance cards now require confirmed balance, expense, settlement and guest reads before showing totals or settlement actions. A failed read shows Retry instead of a misleading zero balance.
- Split guest settlement recording and deletion now wait for the cloud write before reporting success. A failed delete keeps its confirmation dialog open for retry.
- Split guest expense deletion now reports a failed cloud write instead of silently showing “Expense deleted”; the confirmation stays available for retry.
- The overview inside a Split group now requires successful balance, expense and settlement reads before showing totals. Failed reads offer Retry without partial financial cards.
- Real-member Split expense deletion now requires an affirmative cloud result for single, bulk and redo actions; a `false` response no longer appears successful.
- If a Split bulk expense deletion stops partway through, the screen reports the completed count, refreshes the list, and keeps the remaining items selected for retry. Completed deletes remain available in Undo.
- Split bulk recategorization now skips rows already in the chosen category and tracks confirmed edits. On a partial failure it refreshes the list, reports the changed count, keeps unfinished rows selected and offers Undo for the confirmed subset.
- Split CSV/Excel import preview now marks confirmed rows as Imported after a partial run and retries only failed rows. The dialog stays open for those failures and cannot be closed while rows are saving.
- Startup now distinguishes a failed Supabase session check from a signed-out account. A failed check shows Try again instead of leaving the loading spinner indefinitely.
- Split group creation now reports when its icon could not be saved after the group itself was created, and a missing group ID leaves the creation form available for retry.
- Finance saves now require Supabase to return exactly one updated row for the signed-in account before showing Saved. A zero-row or mismatched response shows a save error.
- Erase-all Finance data now waits for every cloud operation and reports a possible partial erase if any fail. The confirmation stays open, and Notes clear locally only after their cloud delete succeeds.
- Split CSV/Excel import rejects files over 10 MB before loading the parser; the picker shows the limit. Files exactly 10 MB remain accepted.
- The local Vite server ignores generated `outputs/` packages and `work/` helpers while watching for source changes, so repackaging does not interrupt a browser session.
- The Finance hub's announcement banner is restored after the Split shell extraction; entering the signed-in hub no longer leaves a blank background. The banner keeps its existing display and dismissal behavior.
- An unexpected app-level render error now shows an accessible recovery screen with Reload FinLume instead of leaving an empty background.
- The local package helper builds and checks a staged ZIP before archiving the previous latest ZIP. It also works in Windows PowerShell 5.1.
- `src/features/` contains independently tested budget, dashboard, Financial Review, liability, recurring-payment, transaction, wealth, goal and tax calculations. About, Administration, Dashboard, budget, Dates to Remember, Documents, Financial Review, goal, investment, liability, Notes, recurring, Reports, Tax, Insights, Transactions, Settings and wealth folders also contain lazy-loaded page UI or page-specific panels. The statement-import dialog loads when opened. Administration includes its import, hard-refresh and account-deletion dialogs, overview, audit, health, scanner and Split administration tabs, plus their Supabase service calls and CSV download helper; Settings includes extracted backup/restore, document-vault, account-control and category-management panels.
- `src/legacy-app.js` contains the remaining established page interface and shared UI while feature code is progressively moved into modules. Lazy page loading states use one shared accessible component. The what-if dialog is still shared with Net Worth.
- `src/styles.css` contains the existing visual system without redesigning it.
- `src/legal.js` and `src/accessibility.js` keep supporting features separate.
- `public/` contains the web-app manifest, service worker, and Netlify headers. The scanner's local WebAssembly engine requires the narrowly scoped `wasm-unsafe-eval` Content Security Policy allowance in both the HTML fallback policy and production headers.
- The service worker keeps the current and previous FinLume shell caches so an already-open page can still load a cached fingerprinted feature chunk during an upgrade. It rejects HTML served at asset URLs, leaves other apps' caches alone, and only handles same-origin shell and `/assets/` requests; authenticated Supabase responses are not cached.

## Commands

- `npm run dev` — local development server
- `npm run check` — JavaScript syntax validation
- `npm test` — financial-calculation and extracted page render tests
- `npm run build` — optimized production build
- `npm run preview` — preview the production build locally
- `npm run validate` — run source checks, tests and the production build together before publishing

## Local browser verification

Earlier public-screen checks covered startup, sign-in through the welcome screen, account creation, password recovery, and the Terms/Privacy dialog. The sign-in screen had no horizontal overflow at 320, 375, 390, 768, 1024 and 1440 px; the legal dialog switched tabs and closed with Escape while returning focus to its opener.

On 20 October 2026, a signed-in Chrome session was confirmed to use the supplied isolated test account. Read-only checks opened the Finance dashboard, Transactions, Financial Review, Budgets, Recurring & Subscriptions, Liabilities and its What-if tab, Investments, Net Worth & Goals, Reports, Insights, and Settings. Split Overview and Groups opened with the expected empty state. The statement-import dialog advanced from account choice to the CSV/XLSX/PDF file picker, which showed the 10 MB limit; no file was selected. The test account did not show an Administration navigation item. These checks found no blank screen or page-loading failure. No records were created or changed. Populated-data actions, actual imports and scans, Administration authorization on the server, mobile widths, and keyboard workflows still need isolated verification.

## Roadmap

### Latest reliability phase: Documents

- Document uploads and single or bulk deletes now wait for a confirmed cloud save before the list changes. A lost response triggers a fresh cloud read; an uncertain result asks the user to review Documents before retrying. Failed bulk deletion keeps its dialog open, and confirmed deletions retain the existing short Undo option.
- File selection can be retried with the same file after an error. A batch stops at the first failed save and identifies files that were not attempted. Document-vault encryption changes now stop on a failed conversion or save rather than claiming completion.
- Browser checks with isolated populated documents, vault changes, narrow layouts, and keyboard controls remain pending. Whole-array document writes can race across devices and need a separately authorized server-side version check or atomic operation.

### Vault setup recovery

- Turning on the document vault now confirms its saved settings before converting existing files. If conversion stops, the saved vault can still be unlocked after reload; the recovery code stays visible and an unlocked vault offers **Encrypt remaining files**. Recovery-code changes and turning off the vault also require a confirmed settings save.
- A failed settings write refreshes the cloud value and does not claim completion. Partial conversion and cross-device writes still need live isolated-data checks; document and settings updates remain separate cloud operations.

### Documents keyboard controls

- Each stored document now has a separately labelled selection checkbox and preview button. Keyboard users can reach either action without nested controls. Live focus, screen reader, and narrow-screen checks are still pending.

### Backup restore confirmation

- The Settings backup panel's document restore callback is connected again. Restore now rereads cloud collections, confirms each transaction, document, and settings write, and skips completed steps on retry after a partial failure. Failed steps remain visible in the review dialog.
- Encrypted documents require matching vault settings for a merge, or a complete replace with documents and settings selected. Merging settings leaves the current vault configuration alone. Separate cloud fields still cannot be restored atomically, so live isolated restore tests remain required.

### Service-worker cache privacy

- The service worker now bypasses requests carrying an Authorization header and refuses to cache or serve responses marked private, no-store, or no-cache. It still handles only the same-origin shell and static assets, and retains one previous FinLume cache for an already-open page during an upgrade.

### Corrupt backup guard

- Backup preview now identifies malformed or duplicated document records. It disables document restore when any document entry is unreadable and blocks Replace when transaction entries are unreadable, preventing a partial backup from silently replacing complete records. Valid transactions can still be merged after reviewing the warning.

### Manual entry confirmation

- Adding a Finance transaction now waits for a confirmed cloud save before closing the form. A lost response is checked against the saved entry ID; a failed or uncertain result keeps the entered details and shows an error for review and retry.

### Transaction deletion confirmation

- Single and bulk transaction deletes now wait for cloud confirmation. A failed bulk delete keeps its confirmation and selection for retry; Undo is offered only after a confirmed removal. Undo itself checks the cloud write before clearing its action.

### Release-readiness audit

- The local package uses a source allowlist, excludes `.env.local`, build output, work helpers, and old packages, and includes the published configuration and tests. A source pattern scan found no service-role key or private-key markers. Netlify currently defines static cache headers; global content-type and referrer headers have not been added or verified on a deployed site.

See `ROADMAP.md` for the completed first roadmap and the next maintainability steps.

### Populated Finance check

- On 21 October 2026, the isolated Test profile saved a labelled ₹12.34 expense in Groceries. A full Chrome reload showed the ₹12.34 spending total and one expense, confirming the test entry persisted. The Add Entry form also exposed an incorrect expense default of Income; it now starts at Needs review when that category exists and resets to the matching default when expense/income is switched. Chrome verified both defaults. The sample test record remains in the isolated account for further checks. Editing, deletion, and narrow-width workflows remain unverified. Validation passed 178 tests, production build, and six OCR asset checks.

### Transaction split confirmation

- A populated Chrome check verified matching and nonmatching transaction search, amount filtering, the saved entry's Details dialog, and opening its Split dialog. The Split dialog now avoids Income as an expense's second default, explains a zero-valued part, keeps the form open on failure, and waits for a confirmed cloud write before closing. Child IDs and creation time stay stable across retries, so a lost response can be reconciled without another split. Live split save and failure checks remain pending.

### Confirmed transaction details

- The isolated ₹12.34 test entry was split into ₹7.34 Groceries and ₹5.00 Needs review, and both parts were present after a refresh. The Details form now keeps edits visible until a cloud save is confirmed, checks a lost response against the saved row, and refuses to overwrite an entry changed elsewhere. A test note was saved on the ₹5.00 part. Adding a name rule now waits for confirmed settings, and an uncategorized expense requires an explicit rule category. Validation passed 190 tests, production build, and six OCR asset checks. Live failed-write and post-edit reload checks remain pending.

### Confirmed category changes

- Changing a transaction category in the Transactions table now uses the same confirmed edit path as Details. The row shows Saving while the cloud write is pending, retains its prior category after a rejected write, and shows an error for review. The existing optional keyword-rule suggestion still follows a confirmed category change. Validation passed 190 tests, production build, and six OCR asset checks. Live failed-write and cross-device concurrency checks remain pending.

### Confirmed transaction tags

- Inline tag removal waits for a confirmed transaction edit and reports failures. The tag editor stays open until the transaction tags and any new account tag names are confirmed in the cloud. If the transaction save succeeds but the account tag list fails, the entered tags remain available for retry; a second attempt skips the already saved transaction and retries registration. Validation passed 193 tests, production build, and six OCR asset checks. Live partial-failure and narrow-layout checks remain pending.

### Confirmed Dates payments

- Marking a date paid now confirms an optional linked transaction and the saved date status before closing. A stable transaction ID prevents a retry from creating another linked entry. Undo confirms both the transaction removal and date status, reports a failed step, and keeps retry available. Validation passed 198 tests, production build, and six OCR asset checks. These are separate cloud-field writes, so a failure or concurrent edit between them can leave a partial result requiring review; isolated live failure and mobile checks remain pending.

### Welcome screen refresh

- Entering the dashboard now saves the existing per-account welcome-seen flag. Refreshing the signed-in page returns to the dashboard; signing out clears that flag so the welcome screen appears at the next sign-in. Live Chrome confirmation remains pending.

### Confirmed Dates editing

- Adding, editing, deleting, and restoring Dates to Remember now use a fresh cloud read and confirmed settings save. Dialogs stay open on failure, retries keep the same generated IDs and deletion timestamp, and a changed cloud date list blocks a stale write. Validation passed 202 tests, production build, and six OCR asset checks. Live failed-write and concurrent-device checks remain pending; the cloud settings field still needs server-side version checks to prevent simultaneous whole-field updates.

### Confirmed manual budgets

- The shared entry form now shows pending saves and errors without closing an unfinished action. Manual budget creation, editing, and deletion use fresh cloud reads and confirmed settings saves. A retry keeps the prepared budget ID, while a changed cloud budget list stops a stale update. Validation passed 206 tests, production build, and six OCR asset checks. Budget planning and other settings actions still use their earlier save paths; live failure and cross-device checks remain pending.

### Confirmed monthly money plan

- Saving expected income now waits for cloud confirmation, keeps the draft open on failure, and recognizes a completed save after a lost response. Validation passed 210 tests, production build, and six OCR asset checks. Live failed-write and concurrent-device checks remain pending.

### Confirmed recurring entries

- Manual recurring-payment and subscription add, edit, and delete now wait for confirmed settings writes. A failed form stays open and a retry keeps the prepared entry ID. Validation passed 214 tests, production build, and six OCR asset checks. Suggestion Keep/Ignore, linking, and audit dismissal still use their earlier save paths; live failed-write and cross-device checks remain pending.

### Confirmed recurring suggestions

- Keep and Ignore now wait for a confirmed settings save before a suggestion disappears. Keep saves the entry, dismissal, and optional name rule in one settings-field update; retry keeps the same generated IDs. A rejected action shows an error on its card. Validation passed 218 tests, production build, and six OCR asset checks. Linking and audit dismissal still need targeted confirmation; live failure and cross-device checks remain pending.

### Confirmed recurring links

- Linking an existing recurring item to a transaction merchant now holds the chooser open through the confirmed settings save and shows failures there. Unlink also waits for confirmation and reports failures on the page. Validation passed 218 tests, production build, and six OCR asset checks. Audit dismissal and notification tracking still need targeted review; live failure and cross-device checks remain pending.

### Recurring audit reliability

- Audit dismissal now waits for a confirmed settings save and shows a failed action. Subscription alerts are marked notified only after their notification call succeeds and the flag save is confirmed. Failed alerts have a visible Retry action; a failed flag save retains its pending update during the current page session. Validation passed 219 tests, production build, and six OCR asset checks. A reload between notification creation and flag confirmation can still repeat an alert without server idempotency; live failure and cross-device checks remain pending.

### Shared settings confirmation

- Dates, manual budgets, recurring entries, and recurring suggestions now share one tested settings-field confirmation routine. It retains each feature's messages and rejects fields outside that feature's allowlist. Validation passed 221 tests, production build, and six OCR asset checks. The server-side version check and live concurrent-device verification remain pending.

### Confirmed Goals editing

- Goal creation, editing, and deletion from both Goals and the embedded Wealth view now wait for confirmed settings saves. The form stays open on failure, and a retry keeps the prepared goal ID and creation date. Validation passed 221 tests, production build, and six OCR asset checks. Live populated and cross-device checks remain pending.

### Dates to Remember page recovery

Dates to Remember now guards its page against malformed saved date entries, reports the affected count, and preserves those records during valid date edits. The payment override helper also leaves malformed sibling entries untouched. This addresses a reproducible page-render failure path; the screenshot account has not been inspected, so a live Chrome recheck is still needed. `npm.cmd run validate` passed 222 tests, production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy stayed 307.67 / 96.18 KB. Other populated, mobile, and cross-device checks remain pending.

### Safe date reminders and shortcut

The Important Dates shortcut and reminder scan now use the same guarded date-record view as Dates to Remember. Malformed siblings and invalid override values no longer break date expansion; automatic cleanup preserves malformed deleted records and leaves stored data unchanged. `npm.cmd run validate` passed 224 tests, production build, and six OCR asset checks. Main entry remained 26.63 / 10.19 KB raw/gzip; legacy increased from 307.67 / 96.18 KB to 308.10 / 96.32 KB. The screenshot account still needs a live browser recheck; populated, mobile, and concurrent-device verification remains pending.

### Confirmed category suggestions

The suggested “Always categorize” action now confirms the category-keyword settings write, then applies the rule to matching Needs review expenses from a fresh transaction read. A failed second step keeps the prompt and shows Retry; repeating it does not duplicate the keyword, and a lost transaction response is checked against cloud data. `npm.cmd run validate` passed 228 tests, production build, and six OCR asset checks. Main entry remained 26.63 / 10.19 KB raw/gzip; legacy increased from 308.10 / 96.32 KB to 309.92 / 96.77 KB. Settings and transactions are still separate cloud writes and need server-side atomicity for cross-device guarantees; isolated browser checks remain pending.

### Confirmed Settings maintenance

Settings data-maintenance actions for imported income, rule reapplication, and raw-narration display now read current cloud transactions, wait for a confirmed write, and show a retryable error instead of an early success count. Lost responses are checked against the changed rows. `npm.cmd run validate` passed 231 tests, production build, and six OCR asset checks. Main entry remained 26.63 / 10.19 KB raw/gzip; legacy increased from 309.92 / 96.77 KB to 310.95 / 96.97 KB, and the lazy Settings page grew from 56.00 / 15.65 KB to 56.60 / 15.87 KB. Whole-array writes still need server-side version protection; live populated checks remain pending.

### Confirmed Finance edit route

The remaining optimistic Finance transaction callback and unused immediate-commit import branch were removed. Transactions now receives only its confirmed edit callback, and all callers of the import preparation helper use its prepared result for confirmed writes. Stored transaction fields and visible controls are unchanged. `npm.cmd run validate` passed 231 tests, production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy decreased from 310.95 / 96.97 KB to 310.34 / 96.87 KB, while the lazy Settings page stayed 56.60 / 15.87 KB. Live populated and cross-device checks remain pending.

### Confirmed keyword and subcategory edits

Quick category keywords and subcategories in Settings now use field-scoped, fresh-read confirmed cloud writes. Add drafts remain in place after a failed save, remove actions keep the existing item visible, and the controls show an error for retry. Existing categories, stored maps, and advanced when/then rule behavior remain unchanged. `npm.cmd run validate` passed 233 tests, production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy changed from 310.34 / 96.87 KB to 310.89 / 96.95 KB, and the lazy Settings page changed from 56.60 / 15.87 KB to 57.48 / 16.01 KB. Advanced when/then rules and other general settings actions still use earlier save paths; live populated and cross-device checks remain pending.

### Confirmed advanced categorization rules

Advanced when/then categorization rules now use the confirmed settings-field path for add, edit, toggle, and delete. Failed form writes keep the dialog and its draft open; row actions report an error, and a retry of a new rule keeps its prepared ID. `npm.cmd run validate` passed 234 tests, production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy stayed near 310.90 / 96.95 KB, and the lazy Settings page changed from 57.48 / 16.01 KB to 58.21 / 16.17 KB. Shared Name Rules and broader general settings remain on earlier save paths; live populated and cross-device checks remain pending.

### Confirmed name rules

The shared Name & keyword rules manager now uses confirmed settings writes in both Settings and the Transactions rules dialog. A failed add keeps its keyword draft and prepared ID; a failed remove leaves the existing rule visible with a retryable error. Stored name-rule fields and matching behavior are unchanged. `npm.cmd run validate` passed 235 tests, production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy increased from 310.90 / 96.95 KB to 311.40 / 97.10 KB, and the lazy Settings page stayed near 58.22 / 16.18 KB. General appearance and other settings controls still use earlier save paths; live populated and cross-device checks remain pending.


### Cloud-confirmed backup downloads

Backup download, the pre-replace safety backup, and the account-deletion backup now read transactions, documents, and settings from the cloud before preparing a file. A failed or malformed read stops the download and leaves restore and deletion flows retryable. Stored records and backup format are unchanged. `npm.cmd run validate` passed 238 tests, production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 311.40 / 97.10 KB to 312.04 / 97.27 KB; lazy Settings grew from 58.22 / 16.18 KB to 58.29 / 16.20 KB. Populated browser backup/restore checks and cross-device write protection remain pending.

### Confirmed core Settings lists

Categories, tags, accounts, payment methods, and income sources now use fresh cloud reads and confirmed settings writes. Their add and remove controls wait for confirmation, show a retryable error on failure, and keep an unsaved add draft. The backup reader also refuses incomplete cloud rows. Stored list formats and the existing Settings layout remain unchanged. `npm.cmd run validate` passed 240 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 312.04 / 97.27 KB to 313.15 / 97.46 KB; lazy Settings grew from 58.29 / 16.20 KB to 58.46 / 16.23 KB. Other appearance and preference controls still use the earlier optimistic save path, and populated/mobile/cross-device browser checks remain pending.

### Confirmed appearance preferences

Theme, text size, liquid glass, contrast, motion, link underlines, tap targets, focus outlines, colour-safe charts, and balance privacy now wait for a fresh-read cloud confirmation. The previous selection remains visible on failure with an error and retry path; multi-field glass mode changes are confirmed together. The shared settings helper now handles false values correctly. Stored fields and the visual design are unchanged. `npm.cmd run validate` passed 241 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.18 KB raw/gzip; legacy grew from 313.15 / 97.46 KB to 313.81 / 97.62 KB; lazy Settings grew from 58.46 / 16.23 KB to 59.04 / 16.39 KB. Other general preferences, populated/mobile browser checks, and server-side concurrent-write protection remain pending.

### Confirmed general Settings controls

Currency, raw narration display, essential/discretionary category flags, ignored recurring-suggestion reset, and subscription creep threshold now wait for a fresh-read cloud confirmation. Failures keep the saved value and show an error; the threshold keeps a typing draft and saves on blur or Enter. The shared confirmation helper handles false and zero baselines. Existing settings keys and appearance are preserved. `npm.cmd run validate` passed 242 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 313.81 / 97.62 KB to 314.40 / 97.74 KB; lazy Settings grew from 59.04 / 16.39 KB to 59.94 / 16.55 KB. Other feature-level saves, populated/mobile browser checks, and server-side concurrent-write protection remain pending.

### Dates account-filter recovery

Dates to Remember now guards the saved account-choice list before rendering its filter and edit form. If that list is malformed, the page shows no account choices instead of crashing; the stored value is not rewritten. This closes another possible render failure path, but the screenshot account could not be inspected, so the exact cause remains unconfirmed. `npm.cmd run validate` passed 243 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy stayed 314.40 / 97.74 KB; lazy Dates grew from 19.53 / 6.07 KB to 19.59 / 6.08 KB. A live isolated-account recheck and populated/mobile/cross-device checks remain pending.

### Clear partial date-payment recovery

Dates to Remember now explains when a linked transaction step succeeded but the date-status step could not be confirmed. Payment and Undo still use the existing stable transaction ID and confirmed cloud helpers, so retrying the same action remains safe. A failed transaction step leaves the date status untouched. No saved fields or visible controls changed. `npm.cmd run validate` passed 246 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 314.40 / 97.74 KB to 314.94 / 97.86 KB; lazy Dates grew from 19.59 / 6.08 KB to 19.61 / 6.10 KB. The two cloud fields remain non-atomic; a server-side operation would be needed for cross-device guarantees. The screenshot account and populated/mobile browser workflows remain unverified.

### Date payment with malformed saved siblings

The confirmed date-payment helper now skips malformed sibling entries when locating a valid rule and preserves them during the settings write. An unsupported top-level dates value stops before a write. Linked-transaction category selection also falls back to Needs review if saved categories are malformed. Existing date and transaction IDs, stored records, and layout are preserved. `npm.cmd run validate` passed 249 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 314.94 / 97.86 KB to 315.19 / 97.93 KB; lazy Dates stayed 19.61 / 6.10 KB. The screenshot account still needs a live check, and cross-device date/transaction atomicity remains server-side work.

### Safe date-rule identity

Dates to Remember now hides saved entries with missing or duplicate IDs, including an otherwise valid entry that conflicts with a malformed sibling. These entries remain stored and are counted in the page warning. Payment confirmation refuses duplicate IDs before writing, preventing one action from changing multiple dates. Older numeric IDs remain supported. `npm.cmd run validate` passed 252 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.18 KB raw/gzip; legacy grew from 315.19 / 97.93 KB to 315.61 / 98.07 KB; lazy Dates stayed 19.61 / 6.10 KB. The screenshot account still requires a live check; populated/mobile workflows and cross-device atomicity remain pending.

### Visible unsupported date recurrence

Dates to Remember now counts saved rules with unsupported recurrence values or invalid end dates as entries it cannot show, instead of silently yielding no occurrences. Those records remain untouched. Supported one-time, monthly, quarterly, and annual rules keep their existing behavior. `npm.cmd run validate` passed 253 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 315.61 / 98.07 KB to 315.76 / 98.15 KB; lazy Dates stayed 19.61 / 6.10 KB. The screenshot account and populated/mobile browser workflows remain unverified; server-side date/transaction atomicity remains separate work.

### Confirmed deleted-date cleanup

Automatic removal of deleted dates older than the retention window now uses a fresh-read confirmed settings write. A failed or uncertain result raises a visible message with a reload retry path instead of changing the local date list optimistically. Malformed and recently deleted siblings remain untouched. `npm.cmd run validate` passed 255 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 315.76 / 98.15 KB to 316.02 / 98.26 KB; lazy Dates stayed 19.61 / 6.10 KB. Date notification flags still follow their earlier save path, while populated/mobile browser checks and server-side concurrent-write protection remain pending.

### Confirmed date-reminder tracking

Date reminders now hold successfully created notification keys in memory until a fresh-read cloud settings write confirms their tracking flags. Failed flag saves retry after 30 seconds without recreating those notifications during the current session; lost save responses are checked against cloud data. Malformed saved tracking flags stop notification creation and are not overwritten. `npm.cmd run validate` passed 259 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 316.02 / 98.26 KB to 317.69 / 98.66 KB. A reload between notification creation and flag confirmation can still repeat an alert without server idempotency. Populated/mobile browser and cross-device checks remain pending.

### Confirmed Notes reminder tracking

Notes reminders now use the shared confirmed notification-flag helper. Successfully created notifications stay pending in memory until their flags are confirmed, and the existing one-minute reminder check retries failed flag saves without recreating those notifications during the session. Malformed tracking data stops new notifications instead of being overwritten, and malformed note rows are skipped. `npm.cmd run validate` passed 259 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 317.69 / 98.66 KB to 318.47 / 98.82 KB. A reload before flag confirmation can still repeat an alert without server idempotency; populated/mobile and cross-device checks remain pending.

### Honest notification states

The notification bell now distinguishes a failed cloud read from an empty list, keeps previously loaded items visible, and offers Retry. Mark-one and Mark-all actions update the screen only after the cloud confirms the write; failures leave unread items available to retry. Notification data calls moved into a small shared service with focused tests. `npm.cmd run validate` passed 261 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy grew from 318.47 / 98.82 KB to 319.38 / 99.06 KB. Browser interaction and cross-device checks remain pending.

### Search with incomplete saved records

The header search now skips incomplete transaction, document, and investment rows instead of crashing while a query is typed. Valid matches remain searchable; saved rows are not changed. `npm.cmd run validate` passed 263 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy changed from 319.38 / 99.06 KB to 319.74 / 99.18 KB. Populated/mobile browser checks, the screenshot account's exact Dates error, and server-side concurrent-write protection remain pending.

### Admin and Dates render recovery; organized categorization settings

Admin now ignores malformed profile rows and invalid signup timestamps when preparing usage charts, so those saved values cannot crash the page. Dates to Remember now keeps rules with non-text display fields out of the actionable list and normalizes invalid paid dates before display; affected saved rules remain untouched and visible in the invalid-entry count. Settings now groups name/keyword rules, saved category keywords, and advanced when/then rules under Automatic categorization, with rule refresh beside them. The existing rule stores and matching priority remain unchanged. `npm.cmd run validate` passed 265 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy changed from 319.74 / 99.18 KB to 319.89 / 99.21 KB. The computer-use helper could not verify Chrome's URL, so the signed-in Admin and Dates screens could not be rechecked live; their exact account-specific failures remain unconfirmed.
### Live Admin and Dates page-loader repair

The signed-in localhost Chrome session reproduced both page crashes. Dates failed before rendering because its lazy loader referenced undefined Edit and Undo icons; those unused dependencies were removed. Admin failed because its lazy loader referenced an undefined User icon; it now receives an existing icon. The Admin Users view also referenced Users without binding it from page dependencies, which is now fixed. The live account then rendered Dates with its saved reminders and Admin Overview, Users, Usage & Growth, Feedback, Split & Scanner, Announcements, and Audit & Health without a page error. No saved data or server settings changed. `npm.cmd run validate` passed 265 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 KB raw and changed from 10.19 to 10.18 KB gzip; legacy changed from 319.89 / 99.21 KB to 319.88 / 99.20 KB raw/gzip. Admin write actions and Dates payment or editing actions were not exercised in the live account.
### Lazy page dependency audit

The normal source check now inspects dependency objects passed into page factories and fails if a shorthand name is not bound by the application shell. This guards against the undefined icon references that previously prevented Admin and Dates from opening. The check covered 27 factories with no missing names. No app behavior or saved data changed. `npm.cmd run validate` passed 265 tests, the production build, and six OCR asset checks. Main entry stayed 26.63 / 10.18 KB raw/gzip; legacy stayed 319.88 / 99.20 KB. This static check does not prove every page interaction or server operation; populated workflows and mobile checks remain pending.
### One keyword-rule control in Settings

Settings now shows saved name rules and older category keywords in one list with one Add rule control. New rules use the existing nameRules field; older categoryKeywords entries remain in their original field and can still be removed. No records were migrated, and the import matching order is unchanged. Advanced when/then rules remain alongside this list because they can also apply tags. A render test checks both saved rule sources and the single entry control. `npm.cmd run validate` passed 265 tests, the production build, six OCR asset checks, and the 27-factory dependency audit. Main entry changed from 26.63 / 10.18 KB to 26.63 / 10.19 KB raw/gzip; legacy changed from 319.88 / 99.20 KB to 319.86 / 99.20 KB; lazy Settings grew from 59.94 / 16.55 KB to 61.38 / 17.34 KB. Chrome's narrow-window navigation prevented a live Settings visual check, so that and rule-save interaction remain unverified.

### Explicit category choice for text rules

The signed-in Chrome Settings page renders the combined saved rule list. New text rules require an explicit category choice, and long saved rule labels fit inside narrow rows. Saved rules and matching order remain unchanged. `npm.cmd run validate` passed 265 tests, production build, the 27-factory dependency audit, and six OCR checks. Main entry stayed 26.63 / 10.19 KB raw/gzip; legacy stayed 319.86 KB raw and changed from 99.20 to 99.21 KB gzip; lazy Settings changed from 61.38 / 17.34 KB to 61.52 / 17.39 KB. Rule-save interactions still need the isolated test account.

### Preserve duplicate saved rules on removal

The Settings rule list now removes one selected saved entry, preserving identical legacy rules and malformed siblings. `npm.cmd run validate` passed 266 tests, production build, the 27-factory dependency audit, and six OCR checks. Main entry changed from 26.63 / 10.19 KB to 26.63 / 10.18 KB raw/gzip; legacy remained 319.86 / 99.21 KB; lazy Settings changed from 61.52 / 17.39 KB to 61.55 / 17.41 KB. Live writes await the isolated test account.

### Target one advanced rule at a time

Advanced categorization rule actions now target a single saved entry when IDs repeat. A malformed rules container cannot be overwritten through the screen. `npm.cmd run validate` passed 267 tests, production build, the 27-factory dependency audit, and six OCR checks. Main entry changed from 26.63 / 10.18 KB to 26.63 / 10.19 KB raw/gzip; legacy stayed 319.86 / 99.21 KB; lazy Settings changed from 61.55 / 17.41 KB to 61.73 / 17.45 KB. Live rule writes remain unverified.

### Malformed advanced-rule recovery

Malformed saved advanced-rule entries now display a placeholder without hiding valid siblings. Rule actions stop before writing over malformed saved data. `npm.cmd run validate` passed 267 tests, production build, the 27-factory dependency audit, and six OCR checks. Main entry changed from 26.63 / 10.19 KB to 26.63 / 10.18 KB raw/gzip; legacy changed from 319.86 / 99.21 KB to 319.86 / 99.20 KB; lazy Settings changed from 61.73 / 17.45 KB to 61.98 / 17.53 KB. Live save checks await the isolated test account.

### October 2026 local development phases

Completed Action Inbox, Categorization Rule Preview, Financial Timeline, Data Health Centre, Scenario Workspace, and grouped Finance navigation. The Action Inbox shows saved Needs review transactions, due dates, recurring commitments, budget warnings, Split status, and session import failures with links to the relevant pages. Rule Preview shows a bounded sample of affected transactions and priority conflicts before a confirmed settings save. Timeline separates recorded transactions from scheduled and estimated items. Data Health performs a fresh read-only cloud scan and reports duplicate candidates, malformed records, backup status, and current-session failures without automatic repair. Scenario Workspace keeps two assumption sets in memory, reuses existing forecasts, and exports an aggregate-only JSON comparison. Finance pages are grouped into Overview, Activity, Planning, and Account; mobile navigation has four primary destinations and an accessible More dialog. Dashboard labels distinguish recorded values from projections.

Final `npm.cmd run validate` passed 279 tests, the production build, the 27-factory lazy dependency check, and six OCR asset checks. The main entry is 26.68 / 10.21 KB raw/gzip; the legacy shell is 326.49 / 101.41 KB. Signed-in read-only Chrome checks covered Dashboard, Timeline, Data Health, and Scenarios; responsive views were inspected at 320, 375, 390, 768, and 1024 pixels. Browser history navigation followed the active page. Live rule writes, a complete WCAG 2.2 AA audit, cross-device behavior, and populated-account edge cases remain unverified. No Supabase schema, authentication, production data, GitHub, or Netlify changes were made.

### October 2026 dashboard and Settings refinements

Current position now appears before Action Inbox on Dashboard. Each Inbox item has a clearly labelled, reversible close control that hides it only for the current Dashboard visit; Show hidden items restores the list, and no saved transaction, reminder, or rule is changed. Financial Timeline is grouped under Planning. Data Health is reached from the Settings page, with a return link; it is removed from the main navigation. Saved name and keyword rules show eight rows initially with search, category filtering, and Show more, while editing and matching order stay intact.

`npm.cmd run validate` passed 280 tests, the production build, lazy dependency checks, and six OCR asset checks. These refinements were checked through source and render tests; the previous signed-in browser session was unavailable for a fresh visual pass, so the new layout and controls await live browser review. No cloud data, schema, auth, GitHub, or Netlify changes were made.

### Data Health review previews

Every Data Health finding now includes an expandable preview with the affected saved location, a proposed review step, and what remains untouched. Duplicate candidates list each saved position and ID so users can compare source records before making any separate, confirmed change in Transactions. Incomplete collections and settings point to checked backups. No automatic cleanup or cloud write was added. `npm.cmd run validate` passed 280 tests, the production build, lazy dependency checks, and six OCR assets. Browser control stopped because it could not verify Chrome's current URL, so live visual and isolated-account interaction checks remain unverified.

### Version-checked cloud saves and accessibility refinements

Finance field updates now compare the row's existing `updated_at` value before writing. A stale tab or device receives a conflict instead of replacing the newer whole-field value; a new row uses a null-version check. The app reads and tracks the confirmed version and refreshes optimistic Settings after a rejected save. Focused tests cover null versions, confirmed version return, and two devices attempting to save from the same version. Data Health review previews and the newest Dashboard/Settings controls now have explicit status announcements and larger touch targets. `npm.cmd run validate` passed 283 tests, the production build, lazy dependency checks, and six OCR asset checks.

The version check uses the existing Supabase column; no schema, RLS, function, or auth change was made. Live two-device conflict tests, interrupted network writes, and a complete WCAG 2.2 AA audit remain unverified: Computer Use stopped because it could not determine Chrome's current URL with enough confidence to enforce policy. Source and render tests cannot establish visual contrast, focus return, responsive overflow, or server access rules.

### October 2026 reliability follow-up

The Dashboard Inbox can snooze an item for one day in account-specific browser storage; changed items reappear and Show snoozed items restores the list. A test-account browser check confirmed that an item disappears when snoozed. The linked Dates to Remember payment and its optional transaction now use one version-checked update of the account row, so those two fields commit together. Data Health can open a uniquely identified transaction directly for review. Import completion reconciles source rows with saved, duplicate, and skipped rows. Service-worker tests cover cached assets, private-response exclusions, old-release chunks, and offline shell navigation. The shared icon set and optional parser service moved from the large app source into focused modules.

The user-supplied Supabase schema and RLS export were reviewed in [SECURITY-REVIEW-2026-10-23.md](SECURITY-REVIEW-2026-10-23.md), with a review-only proposal in [SECURITY-MIGRATION-DRAFT.sql](SECURITY-MIGRATION-DRAFT.sql). The report identifies removed-member access through `ks_is_group_member` and permissive deactivation guards. Targeted grants and the `auth.users` creation trigger show that direct profile role changes are blocked in the current configuration; profile policy tightening remains defense in depth. These require a reviewed database migration and cross-account tests; no Supabase changes were applied. Inbox snooze persisted after a browser reload in the test account and was restored afterward. Settings and Data Health navigation, the 320/375/390/768/1024-pixel render modes, and Escape/focus return in the rule dialog were also checked. Two-device conflicts, full overflow inspection, and a complete accessibility audit remain unverified.

An isolated test-account check then saved a one-time ₹1 date, marked it paid with the linked expense option, and found the matching ₹1 transaction in Transactions. A synthetic CSV with one valid and one invalid-date row reported `2 source rows accounted for: 1 saved, 0 already present, 1 skipped before import`. After a Chrome reload, both synthetic expenses reappeared and the date still showed Paid 23-10-2026. The user asked to retain all three records for review. The supplied triggers include `on_auth_user_created` and `krnshare_groups_immutables`; the targeted grants permit profile name updates but not role or deactivation updates. The security report and SQL draft reflect those findings; no server change was made.

A separate [staging access checklist](SECURITY-STAGING-CHECKS.md) now defines the account roles, access outcomes, release gate, and rollback checks for the review-only migration. Staging access and explicit authorization are required before changing database policies or functions.

`npm.cmd run validate` passed 292 tests, 30 lazy-page dependency checks, the production build, and six OCR asset checks. The linked-date transaction now uses settings from the same fresh cloud read, and PDF import reconciliation includes invalid candidate rows. The main entry stayed 26.68 / 10.21 KB raw/gzip; the legacy bundle changed from 330.60 / 102.67 KB to 328.53 / 102.42 KB. The local package excludes development folders and local secrets.
# Transaction review and discovery (local development, 23 October 2026)

Transactions now includes a focused Needs review queue opened from the Action Inbox or Transactions. It previews selected category, tag, or account edits, applies each through the existing confirmed cloud-write path, and retries only unfinished records. Combined date, amount, account, category, tag, source, import-session, and Needs review filters have one reset action. Three built-in quick views and up to five account-scoped, device-local named views are available. Local views do not sync across devices.

New CSV/PDF imports assign a unique session ID to newly saved rows; the confirmed import summary can open that session in Transactions. Existing imports have no session ID. Import reversal is withheld until a session-aware, read-before-delete cloud flow is implemented and verified. Production source maps are disabled in `vite.config.js` so deployment artifacts do not publish them. No production deployment or Supabase migration was made. See [phase status](docs/transaction-review-phase.md) for live checks and measurement work still required.
