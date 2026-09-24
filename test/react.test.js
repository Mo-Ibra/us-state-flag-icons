// React component tests: rendering, accessibility title, and coverage across
// every state.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { CA } from 'us-state-flag-icons/react'
import OH from 'us-state-flag-icons/react/OH'
import * as Flags from 'us-state-flag-icons/react'
import { states } from 'us-state-flag-icons'

describe('React components', () => {
	it('renders an <svg> with the flag viewBox', () => {
		const html = renderToStaticMarkup(createElement(CA))
		assert.match(html, /^<svg/)
		assert.ok(html.includes('viewBox="0 0 900 600"'))
	})

	it('renders an accessible <title> when the title prop is given', () => {
		const html = renderToStaticMarkup(createElement(CA, { title: 'California' }))
		assert.ok(html.includes('<title>California</title>'))
	})

	it('omits the <title> when no title prop is given', () => {
		const html = renderToStaticMarkup(createElement(CA))
		assert.ok(!html.includes('<title>'))
	})

	it('supports the per-flag subpath import', () => {
		const html = renderToStaticMarkup(createElement(OH, { title: 'Ohio' }))
		// Ohio is a swallowtail pennant: its native ratio is not 3:2.
		assert.ok(html.includes('viewBox="0 0 26 16"'))
	})

	it('exposes a component for every state that renders', () => {
		for (const code of states) {
			const Component = Flags[code]
			assert.equal(typeof Component, 'function', `component for ${code}`)
			const html = renderToStaticMarkup(createElement(Component, { title: code }))
			assert.match(html, /^<svg/, `rendering ${code}`)
		}
	})

	it('does not trigger React invalid DOM property warnings', () => {
		const messages = []
		const originalError = console.error
		console.error = (...args) => messages.push(args.join(' '))
		try {
			for (const code of states) {
				renderToStaticMarkup(createElement(Flags[code]))
			}
		} finally {
			console.error = originalError
		}
		const invalid = messages.filter((message) => message.includes('Invalid DOM property'))
		assert.deepEqual(invalid, [])
	})
})
