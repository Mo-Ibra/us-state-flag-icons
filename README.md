# us-state-flag-icons

[![npm version](https://img.shields.io/npm/v/us-state-flag-icons.svg)](https://www.npmjs.com/package/us-state-flag-icons)
[![npm downloads](https://img.shields.io/npm/dm/us-state-flag-icons.svg)](https://www.npmjs.com/package/us-state-flag-icons)

Vector flags for the 50 US states, the District of Columbia, and the inhabited
territories, available as plain SVG files, React components, JS strings, and CSS
classes.

- Covers all 50 states plus `DC`, `PR`, `GU`, `VI`, `AS`, and `MP`.
- Preserves each flag's **native aspect ratio** (state flags are not all the
  same shape — Ohio is a swallowtail pennant).
- React components render an accessible `<title>` automatically.
- Tiny core API (`hasState`, `states`, `getStateName`).

> There is no Unicode/emoji equivalent for US state flags, so unlike
> `country-flag-icons` this package has no `/unicode` subpackage.

## Install

```
npm install us-state-flag-icons
```

## Usage

### SVG files

The optimized SVGs live in the `svg/` folder of the package:

```html
<img
  alt="California"
  src="https://unpkg.com/us-state-flag-icons/svg/CA.svg"
  height="40"/>
```

Or import the file path through your bundler:

```js
import caFlagUrl from 'us-state-flag-icons/svg/CA.svg'
```

Because flags have different aspect ratios, set only **one** of `width`/`height`
(and let the SVG scale) to avoid distortion.

### CSS

```js
import 'us-state-flag-icons/flags.css'
```

```html
<span class="flag:CA"></span>
```

The icon height is controlled by the `--StateFlagIcon-height` CSS variable
(default `1em`), so it also follows `font-size`:

```css
/* Global flag height. */
[class*=' flag:'],
[class^='flag:'] {
  --StateFlagIcon-height: 24px;
}

/* Or per flag. */
.flag\:CA {
  font-size: 24px;
}
```

### React

```jsx
import { CA, TX } from 'us-state-flag-icons/react'

<CA title="California"/>
<TX title="Texas" className="my-flag"/>
```

Every flag is also available as a per-flag default import (useful if your
bundler does not support tree-shaking):

```jsx
import CA from 'us-state-flag-icons/react/CA'

<CA title="California"/>
```

Passing `title` renders a `<title>` element (and `aria-labelledby`) for
accessibility. `react` is an optional peer dependency — only install it if you
use the `/react` subpackage.

### String

```js
import { CA } from 'us-state-flag-icons/string'

// Or the per-flag default import:
import CA from 'us-state-flag-icons/string/CA'

console.log(CA) // > '<svg xmlns="http://www.w3.org/2000/svg" ...</svg>'
```

## API

The core entry point is available as both ESM and CommonJS.

```js
import { hasState, states, getStateName, stateData } from 'us-state-flag-icons'

hasState('CA') // => true
hasState('ZZ') // => false

states // => ['AK', 'AL', 'AZ', ...]

getStateName('CA') // => 'California'
getStateName('ZZ') // => undefined

stateData[0]
// => {
//      code: 'AK',
//      name: 'Alaska',
//      width: 1416, height: 1000, aspectRatio: 1.416,
//      viewBox: '0 0 1416 1000',
//      license: 'Public domain',
//      source: 'https://commons.wikimedia.org/wiki/File:Flag_of_Alaska.svg'
//    }
```

### `hasState(code: string): boolean`

Whether a flag exists for a two-letter code.

### `states: string[]`

All supported codes.

### `getStateName(code: string): string | undefined`

The display name for a code.

### `stateData: State[]`

The full dataset, one record per flag.

## Aspect ratios

Unlike national flags, US state flags are **not** a uniform shape. The library
keeps each flag's native ratio and exposes it via `stateData`, so the React
components, the CSS classes, and the SVGs all scale correctly.

| Flag | Ratio | Note |
| --- | --- | --- |
| `AL`, `CA`, `TX` | 3:2 | standard |
| `OH` | 26:16 | swallowtail (non-rectangular) |
| `HI`, `NY`, `DC`, `AS`, `MP` | 2:1 | |
| `RI` | ~1.14:1 | nearly square |
| `PA` | 1.37:1 | |

There are 16 distinct aspect ratios in total.

## Package size

The artwork is detailed (many flags contain a state seal), so the published
package is several megabytes. For comparison, `country-flag-icons` ships
simplified, hand-drawn flags at roughly 1 KB each. If package size is critical,
that simplified approach is the alternative.

The React and string subpackages are **ES modules only**; the core API also
provides a CommonJS build.

## Licensing

- **Code:** [MIT](./LICENSE).
- **Flag artwork:** sourced from Wikimedia Commons. Almost all of it is public
  domain; per-flag provenance, author, and license are recorded in
  [`flags/credits.json`](./flags/credits.json). No attribution is required, but
  check that file before redistribution.

## Development

```
npm install

# Re-download/re-curate the source SVGs (only needed to add or refresh a flag).
npm run fetch-flags

npm run build
```

| Script | Description |
| --- | --- |
| `npm run fetch-flags` | Download + normalize the source SVGs and license metadata |
| `npm run generate-states` | Build `source/states.json` from the flags + credits |
| `npm run build` | Generate all distributable assets and the `exports` map |
| `npm test` | Unit tests (API, generated assets, React rendering) |
| `npm run test:package` | Pack the tarball, install it in a temp project, run ESM/CJS/React consumers |
| `npm run lint:package` | Validate the package with [`publint`](https://publint.dev) |
| `npm run check:types` | Validate type resolution with [Are The Types Wrong](https://arethetypeswrong.github.io) |

### Build pipeline

```
flags/                  hand-curated source SVGs (+ credits.json)
  │  optimize-flags
  ▼
svg/                    optimized, scalable SVGs
  ├─ generate-string-flags   → string/
  ├─ generate-react-flags    → react/
  ├─ generate-css            → flags.css
  └─ create-flags-zip        → flags.zip
source/states.json      generated dataset (from flags + credits)
  └─ update-package-exports → package.json "exports"/"files"
```

## Publishing

`npm publish` runs a full gate via `prepublishOnly`:

```
build → unit tests → publint → Are The Types Wrong → install-the-tarball package test
```

Before the first publish, set `repository`, `homepage`, and `bugs` in
`package.json`, and make sure the package name is available on npm.

### Previewing the tarball

To see exactly what would be uploaded, without publishing:

```
npm publish --dry-run --ignore-scripts
```

`--ignore-scripts` is required because the gate itself runs `npm pack`, which
npm suppresses while it is in dry-run mode. Use `npm run prepublishOnly` to
exercise the full gate.

### GitHub Actions

`.github/workflows/ci.yml` runs the gate on push/PR.
`.github/workflows/publish.yml` publishes on GitHub release; add an `NPM_TOKEN`
repository secret (or configure
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers)) for it to
work.

