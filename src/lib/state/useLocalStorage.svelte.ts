import { onMount } from 'svelte';
import cloneDeep from 'lodash.clonedeep';

/**
 * Enhanced useLocalStorage utility with optimized Svelte 5 patterns
 * - Uses more efficient $effect patterns
 * - Better TypeScript integration
 * - Improved error handling
 * - Optimized for performance
 */
export function useLocalStorage<T>(key: string, initialValue?: T) {
	function getInitial(): T | undefined {
		return cloneDeep(initialValue);
	}

	let value = $state<T>(getInitial() as T) as T;
	let isMounted = $state(false);
	let hasHydrated = $state(false);

	// Optimized effect that only runs when value changes and we're mounted
	$effect(() => {
		if (!isMounted || !hasHydrated) return;

		// Use $derived to create a stable reference for JSON serialization
		const serializedValue = JSON.stringify(value);

		try {
			if (value !== undefined) {
				localStorage.setItem(key, serializedValue);
			} else {
				localStorage.removeItem(key);
			}
		} catch (error) {
			console.warn(`Failed to save to localStorage for key "${key}":`, error);
		}
	});

	onMount(() => {
		isMounted = true;

		try {
			const currentValue = localStorage.getItem(key);
			if (currentValue) {
				const parsedValue = JSON.parse(currentValue);

				// Enhanced type validation
				if (initialValue !== undefined) {
					const initialType = Array.isArray(initialValue) ? 'array' : typeof initialValue;
					const parsedType = Array.isArray(parsedValue) ? 'array' : typeof parsedValue;

					if (initialType !== parsedType) {
						console.warn(
							`localStorage key "${key}" type mismatch. Expected ${initialType}, got ${parsedType}. Resetting to initial value.`
						);
						value = getInitial() as T;
					} else {
						value = parsedValue;
					}
				} else {
					value = parsedValue;
				}
			}
		} catch (error) {
			console.warn(
				`Failed to parse localStorage value for key "${key}":`,
				error,
				'. Resetting to initial value.'
			);
			value = getInitial() as T;
		} finally {
			hasHydrated = true;
		}
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
				// @ts-expect-error Property assignment for reset functionality
				value[stateRef] = getInitial()?.[stateRef];
			}
		},
		// New utility methods for better state management
		update(updater: (current: T) => T) {
			value = updater(value);
		},
		get isMounted() {
			return isMounted;
		},
		get hasHydrated() {
			return hasHydrated;
		}
	};
}
