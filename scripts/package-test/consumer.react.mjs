// Package-test fixture: a React consumer that renders a flag to HTML.

import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { CA } from 'us-state-flag-icons/react'
import OH from 'us-state-flag-icons/react/OH'

const california = renderToStaticMarkup(createElement(CA, { title: 'California' }))
assert.match(california, /^<svg/)
assert.ok(california.includes('viewBox="0 0 900 600"'))
assert.ok(california.includes('<title>California</title>'))

const ohio = renderToStaticMarkup(createElement(OH))
assert.ok(ohio.includes('viewBox="0 0 26 16"'))

console.log('React consumer: OK')
