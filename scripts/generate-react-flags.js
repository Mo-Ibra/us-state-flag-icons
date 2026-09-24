// Generates React components for every flag.
//
// Each optimized SVG is converted to a component with SVGR (which handles the
// SVG -> JSX attribute translation), then compiled by Babel to
// `React.createElement` calls and shipped as ES modules (`react/`). Passing
// `titleProp` makes SVGR render an accessible `<title>` and add the
// corresponding `aria-labelledby`, so `<CA title="California" />` just works.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from '@svgr/core'
import { transformSync } from '@babel/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SVG_DIR = path.join(ROOT, 'svg')
const ESM_DIR = path.join(ROOT, 'react')

// Shared TypeScript typings for a flag component. `HTMLSVGElement` works
// around the fact that a React component may render to an <svg> element.
const COMPONENT_TYPINGS = `import * as React from 'react';

type HTMLSVGElement = HTMLElement & SVGElement;

interface Props extends React.SVGAttributes<HTMLSVGElement> {}

type FlagComponent = (props: Props) => React.JSX.Element;

declare const Flag: FlagComponent;

export default Flag;
`

async function readFlagCodes() {
	const files = await readdir(SVG_DIR)
	return files
		.filter((file) => file.endsWith('.svg'))
		.map((file) => file.slice(0, -'.svg'.length))
		.sort()
}

function toEsm(code) {
	return transformSync(code, {
		configFile: false,
		babelrc: false,
		presets: [['@babel/preset-react', { runtime: 'classic' }]],
	}).code
}

// SVGR leaves attribute names it does not recognize hyphenated (e.g.
// `transform-origin="..."`), which React logs as invalid DOM properties.
// Convert those to camelCase while leaving `aria-*` and `data-*` attributes
// hyphenated, which is what React expects.
function normalizeAttributeNames(jsx) {
	const camelCase = (name) =>
		name.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase())
	const shouldKeep = (name) => name.startsWith('aria-') || name.startsWith('data-')
	return jsx
		.replace(/([a-z][a-z0-9]*(?:-[a-z0-9]+)+)=/g, (match, name) =>
			shouldKeep(name) ? match : `${camelCase(name)}=`
		)
		.replace(/"([a-z][a-z0-9]*(?:-[a-z0-9]+)+)":/g, (match, name) =>
			shouldKeep(name) ? match : `${camelCase(name)}:`
		)
}

async function main() {
	const codes = await readFlagCodes()
	if (codes.length === 0) {
		throw new Error('no flags found in svg/ — run `npm run optimize-flags` first')
	}

	await mkdir(ESM_DIR, { recursive: true })

	const esmImports = []
	const tyings = []

	for (const code of codes) {
		const svg = await readFile(path.join(SVG_DIR, `${code}.svg`), 'utf8')

		const component = normalizeAttributeNames(
			transform.sync(
				svg,
				{
					plugins: ['@svgr/plugin-jsx'],
					jsxRuntime: 'classic',
					expandProps: 'end',
					titleProp: true,
				},
				{ componentName: 'SvgComponent' }
			)
		)

		await writeFile(path.join(ESM_DIR, `${code}.js`), toEsm(component) + '\n', 'utf8')
		await writeFile(path.join(ESM_DIR, `${code}.d.ts`), COMPONENT_TYPINGS, 'utf8')

		esmImports.push(`export { default as ${code} } from './${code}.js'`)
		tyings.push(`export const ${code}: FlagComponent`)
	}

	const indexSource = esmImports.join('\n') + '\n'
	await writeFile(path.join(ESM_DIR, 'index.js'), toEsm(indexSource) + '\n', 'utf8')
	await writeFile(
		path.join(ESM_DIR, 'index.d.ts'),
		`import * as React from 'react';

type HTMLSVGElement = HTMLElement & SVGElement;

interface Props extends React.SVGAttributes<HTMLSVGElement> {}

type FlagComponent = (props: Props) => React.JSX.Element;

${tyings.join('\n')}
`,
		'utf8'
	)

	console.log(`Generated React components for ${codes.length} states.`)
}

main().catch((error) => {
	console.error(error.message || error)
	process.exit(1)
})
