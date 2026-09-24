export interface State {
	code: string
	name: string
	width: number
	height: number
	aspectRatio: number
	viewBox: string
	license: string
	source?: string
}

export const states: string[]
export const stateData: State[]
export function hasState(code: string): boolean
export function getStateName(code: string): string | undefined
