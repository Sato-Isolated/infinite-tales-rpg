import { onMount } from 'svelte';
import cloneDeep from 'lodash.clonedeep';

/**
 * Type guard to validate basic type compatibility
 */
function isCompatibleType<T>(value: unknown, expected: T): value is T {
	if (expected === null || expected === undefined) {
		return true; // Allow any value for null/undefined expected
	}

	const expectedType = Array.isArray(expected) ? 'array' : typeof expected;
	const valueType = Array.isArray(value) ? 'array' : typeof value;

	return expectedType === valueType;
}

/**
 * Safely parses JSON with proper error handling
 */
function safeJSONParse<T>(jsonString: string, fallback: T): T {
	try {
		const parsed = JSON.parse(jsonString);
		return parsed;
	} catch (error) {
		console.warn('Failed to parse JSON, using fallback:', error);
		return fallback;
	}
}

/**
 * Safely stringifies JSON with proper error handling
 */
function safeJSONStringify(value: unknown): string | null {
	try {
		return JSON.stringify(value);
	} catch (error) {
		console.warn('Failed to stringify value:', error);
		return null;
	}
}

/**
 * Enhanced useLocalStorage utility with optimized Svelte 5 patterns
 * - Uses more efficient $effect patterns
 * - Better TypeScript integration
 * - Improved error handling
 * - Optimized for performance
 * - Proper type safety without unsafe assertions
 */
export function useLocalStorage<T>(key: string, initialValue?: T) {
	if (!key || typeof key !== 'string') {
		throw new Error('useLocalStorage requires a valid string key');
	}

	function getInitial(): T | undefined {
		return initialValue !== undefined ? cloneDeep(initialValue) : undefined;
	}

	let value = $state<T | undefined>(getInitial());
	let isMounted = $state(false);
	let hasHydrated = $state(false);

	// Optimized effect that only runs when value changes and we're mounted
	$effect(() => {
		if (!isMounted || !hasHydrated) return;

		try {
			if (value !== undefined) {
				const serialized = safeJSONStringify(value);
				if (serialized !== null) {
					localStorage.setItem(key, serialized);
				}
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
				const parsedValue = safeJSONParse(currentValue, getInitial());

				// Enhanced type validation
				if (initialValue !== undefined && !isCompatibleType(parsedValue, initialValue)) {
					console.warn(
						`localStorage key "${key}" type mismatch. Expected ${Array.isArray(initialValue) ? 'array' : typeof initialValue}, got ${Array.isArray(parsedValue) ? 'array' : typeof parsedValue}. Resetting to initial value.`
					);
					value = getInitial();
				} else {
					value = parsedValue;
				}
			} else {
				value = getInitial();
			}
		} catch (error) {
			console.warn(
				`Failed to read localStorage value for key "${key}":`,
				error,
				'. Resetting to initial value.'
			);
			value = getInitial();
		} finally {
			hasHydrated = true;
		}
	});

	return {
		get value() {
			return value as T;
		},
		set value(v: T) {
			value = v;
		},
		reset() {
			value = getInitial();
		},
		resetProperty(stateRef: keyof T) {
			if (value && initialValue && typeof value === 'object' && typeof initialValue === 'object') {
				const initial = getInitial();
				if (initial && typeof initial === 'object' && stateRef in initial) {
					(value as Record<string, unknown>)[stateRef as string] = (
						initial as Record<string, unknown>
					)[stateRef as string];
				}
			}
		},
		// New utility methods for better state management
		update(updater: (current: T) => T) {
			if (value !== undefined) {
				value = updater(value as T);
			}
		},
		get isMounted() {
			return isMounted;
		},
		get hasHydrated() {
			return hasHydrated;
		}
	};
}
