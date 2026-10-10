# Agent playbook

`@johnhenry/domable` -- conversions between HTML text, real DOM nodes, and
React-element-shaped objects, plus a hyperscript DOM builder and an
HTML-to-Custom-Element helper. Single package, Node >= 26, `node:test`,
ships source directly (`src/index.mjs` and friends via `exports`); no build
step. The library is browser code -- every module is written against
standard browser globals (`document`, `DOMParser`, `customElements`, ...)
and runs unmodified in a browser. Node only runs the tests, against a real
jsdom `Document`, not a mock.

`CLAUDE.md` in this directory is a symlink to this file.

## The verification loop (before every push)

1. `npm test` -- runs
   `node --import ./test/_setup-dom.mjs --test test/*.test.mjs`. The
   `--import` is load-bearing: it installs jsdom's globals onto
   `globalThis` *before* any `src/` module is imported by a test, since
   every module assumes `document`/`Node`/etc. already exist at import
   time, not just at call time.
2. A genuinely fresh clone:
   `git clone . /tmp/domable-verifyN && cd $_ && npm ci && npm test`. This
   is the only way to catch "works on my checked-out tree" bugs (missing
   `files` entries -- this package ships only `src`, undeclared deps).
3. Commit, push, close the issue with a comment naming the commit SHA.

CI (`.github/workflows/ci.yml`) runs the same `npm test` command; match it
locally.

## Repo-specific gotchas

- **`class` and `className` are deliberately translated, not unified.**
  `domToReact` maps DOM `class` -> React `className`; `reactToDom` maps it
  back. `domToHyperscript`, by contrast, keeps `class` as `class` (it
  targets `create-element`'s own convention, not React's). If you touch any
  of the four conversion functions, check which convention its *output*
  actually needs to feed into before renaming or unifying this -- it looks
  like an inconsistency but isn't one.
- **`createElement` props are explicit, never guessed (issue #9).**
  `".name"` is a DOM property, `"@type"` (non-string value) is a listener
  with a verbatim event type, a function-valued `on<Event>` is a listener
  for the lowercased name, and everything else is an attribute
  (`null`/`undefined`/`false` skip, `true` -> `""`, except `aria-*`/
  `data-*` booleans -> `"true"`/`"false"`). Don't add property-vs-attribute
  sniffing (`key in element`) -- `value` is both, with different meanings,
  and custom elements may not be upgraded yet. `reactToDom` builds through
  `createElementNS`, so these rules reach React-shaped props too.
- **Closed shadow roots are genuinely unrecoverable.** `element.shadowRoot`
  returns `null` for `mode: 'closed'` by spec -- don't add a "fix" that
  tries to reach into it; there is nothing to reach.
- **The six original standalone modules this package consolidates
  (`johnhenry/lib`) had real, previously-undetected bugs** (see
  "Bugs found while merging" in the README) -- when porting or referencing
  behavior from that old source, verify against this package's tests, not
  against the old module's code.

## Definition of done

A change is done when all of the following hold, not just when tests pass:
- A regression test exists for any bug fixed -- fixing a bug without a test
  that would have caught it means it can come back unnoticed.
- Anything the feature does **not** do is stated in the README's
  `## Honest limitations` section (or inline, for something scoped to one
  function), not only in an issue comment.
- `CHANGELOG.md` has an entry.

## Releases

Bump `version` in `package.json` in a PR, add the `CHANGELOG.md` entry,
merge, then `gh release create v<version>` -- the release event triggers
`.github/workflows/publish.yml`, which is idempotent (skips if the version
is already on npm).
