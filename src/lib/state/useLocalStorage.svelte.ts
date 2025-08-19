import { onMount } from 'svelte';
import cloneDeep from 'lodash.clonedeep';

export function useLocalStorage<T>(key: string, initialValue?: T) {
	function getInitial(): T | undefined {
		return cloneDeep(initialValue);
	}

	let value = $state<T>(getInitial() as T) as T;
	let isMounted = false;

	$effect(() => {
		// Need to read all values to trigger effect
		const json = JSON.stringify(value);
		if (isMounted) {
			if (value !== undefined) {
				localStorage.setItem(key, json);
			} else {
				localStorage.removeItem(key);
			}
		}
	});

	onMount(() => {
		const currentValue = localStorage.getItem(key);
		if (currentValue) {
			try {
				const parsedValue = JSON.parse(currentValue);
				// Validate that parsed value has a compatible type with initialValue
				if (Array.isArray(initialValue) && !Array.isArray(parsedValue)) {
					// If initial value is array but parsed is not, reset to initial
					console.warn(
						`localStorage key "${key}" expected array but got:`,
						typeof parsedValue,
						', resetting to initial value'
					);
					value = getInitial() as T;
				} else {
					value = parsedValue;
				}
			} catch (error) {
				console.warn(
					`Failed to parse localStorage value for key "${key}":`,
					error,
					', resetting to initial value'
				);
				value = getInitial() as T;
			}
		}
		isMounted = true;
	});

	return {
		get value() {
			return value;
		},
		set value(v: T) {
			value = v as T;
		},
		reset() {
			value = getInitial() as T;
		},
		resetProperty(stateRef: keyof T) {
			if (value && initialValue) {
				// @ts-expect-error can never be undefined
				value[stateRef] = getInitial()?.[stateRef];
			}
		}
	};
}
