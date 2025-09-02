// Minimal ambient module declarations to satisfy TS in Svelte files
declare module 'lodash/cloneDeep' {
	import cloneDeep from 'lodash/cloneDeep.js';
	export default cloneDeep as <T>(value: T) => T;
}
// Replaced lodash isEqual with fast-deep-equal
declare module 'fast-deep-equal' {
	const isEqual: (a: any, b: any) => boolean;
	export default isEqual;
}
declare module 'lodash.isplainobject' {
	const isPlainObject: (v: any) => v is Record<string, unknown>;
	export default isPlainObject;
}
declare module 'lodash.isstring' {
	const isString: (v: any) => v is string;
	export default isString;
}
declare module 'lodash.clonedeep' {
	const cloneDeep: <T>(value: T) => T;
	export default cloneDeep;
}
declare module '@3d-dice/dice-box' {
	export default class DiceBox {
		constructor(selector: string, options?: { assetPath: string });
		init(): Promise<void> | void;
		roll(notation: string): Promise<Array<{ value: number }>>;
		clear(): void;
		onRollComplete?: (result: Array<{ value: number }>) => void;
	}
}
declare module 'dice-notation-js' {
	type DetailedResult = {
		result: number;
		number?: number;
		type?: number;
		modifier?: number;
		rolls?: number[];
	};
	const Dice: { detailed: (notation: string) => DetailedResult };
	export default Dice;
}
