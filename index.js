import STATES from './source/states.json.js'

/**
 * Whether a flag exists for a US state/territory code (case-sensitive,
 * e.g. `"CA"`, `"DC"`, `"PR"`).
 */
export function hasState(code) {
	return STATES.some((state) => state.code === code)
}

/** All supported US state/territory codes, e.g. `["AK", "AL", ...]`. */
export const states = STATES.map((state) => state.code)

/** The full dataset: one record per state/territory (name, dimensions, ...). */
export const stateData = STATES

/** The display name for a code, or `undefined` if unknown. */
export function getStateName(code) {
	const state = STATES.find((state) => state.code === code)
	return state ? state.name : undefined
}
