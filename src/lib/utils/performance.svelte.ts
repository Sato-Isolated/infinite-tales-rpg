/**
 * Performance Optimization Utilities for Svelte 5
 * Provides utilities for lazy loading, memoization, and efficient reactive patterns
 */

import type { ComponentType } from 'svelte';

/**
 * Lazy loading utility for heavy components
 * Uses modern Svelte 5 patterns for optimal performance
 */
export function createLazyLoader<T extends ComponentType>(
	loader: () => Promise<{ default: T }>
): {
	Component: T | null;
	load: () => Promise<void>;
	isLoading: boolean;
	hasLoaded: boolean;
} {
	let Component = $state<T | null>(null);
	let isLoading = $state(false);
	let hasLoaded = $state(false);

	const load = async () => {
		if (hasLoaded || isLoading) return;

		isLoading = true;
		try {
			const module = await loader();
			Component = module.default;
			hasLoaded = true;
		} catch (error) {
			console.error('Failed to load component:', error);
		} finally {
			isLoading = false;
		}
	};

	return {
		get Component() {
			return Component;
		},
		get isLoading() {
			return isLoading;
		},
		get hasLoaded() {
			return hasLoaded;
		},
		load
	};
}

/**
 * Optimized debounce function using Svelte 5 patterns
 * Better performance for frequent state updates
 */
export function createDebouncer<T extends (...args: any[]) => any>(fn: T, delay: number): T {
	let timeoutId = $state<NodeJS.Timeout | null>(null);

	return ((...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn(...args);
			timeoutId = null;
		}, delay);
	}) as T;
}

/**
 * Efficient intersection observer for lazy loading
 * Uses modern patterns for optimal performance
 */
export function createIntersectionObserver(
	callback: (entry: IntersectionObserverEntry) => void,
	options: IntersectionObserverInit = {}
) {
	let observer = $state<IntersectionObserver | null>(null);
	let isObserving = $state(false);

	const observe = (element: Element) => {
		if (!observer) {
			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach(callback);
				},
				{
					threshold: 0.1,
					rootMargin: '50px',
					...options
				}
			);
		}

		observer.observe(element);
		isObserving = true;
	};

	const unobserve = (element: Element) => {
		if (observer) {
			observer.unobserve(element);
		}
	};

	const disconnect = () => {
		if (observer) {
			observer.disconnect();
			observer = null;
			isObserving = false;
		}
	};

	return {
		get isObserving() {
			return isObserving;
		},
		observe,
		unobserve,
		disconnect
	};
}

/**
 * Efficient state batching utility
 * Reduces unnecessary reactive updates
 */
export function createStateBatcher<T>(initialValue: T) {
	let currentValue = $state<T>(initialValue);
	let pendingUpdates = $state<Array<(current: T) => T>>([]);
	let isProcessing = $state(false);

	const batch = (updater: (current: T) => T) => {
		pendingUpdates.push(updater);

		if (!isProcessing) {
			isProcessing = true;
			// Use requestAnimationFrame for optimal batching
			requestAnimationFrame(() => {
				const updates = pendingUpdates.splice(0);
				currentValue = updates.reduce((acc, update) => update(acc), currentValue);
				isProcessing = false;
			});
		}
	};

	const setValue = (value: T) => {
		batch(() => value);
	};

	const updateValue = (updater: (current: T) => T) => {
		batch(updater);
	};

	return {
		get value() {
			return currentValue;
		},
		setValue,
		updateValue,
		get isProcessing() {
			return isProcessing;
		}
	};
}

/**
 * Memory-efficient collection manager using SvelteSet/SvelteMap
 * Better performance for large collections
 */
export function createCollectionManager<T>(compareFn?: (a: T, b: T) => boolean) {
	const items = $state<Set<T>>(new Set());

	const add = (item: T) => {
		items.add(item);
	};

	const remove = (item: T) => {
		items.delete(item);
	};

	const clear = () => {
		items.clear();
	};

	const has = (item: T) => {
		if (compareFn) {
			for (const existingItem of items) {
				if (compareFn(existingItem, item)) {
					return true;
				}
			}
			return false;
		}
		return items.has(item);
	};

	const size = $derived(items.size);
	const isEmpty = $derived(items.size === 0);
	const asArray = $derived(Array.from(items));

	return {
		add,
		remove,
		clear,
		has,
		get size() {
			return size;
		},
		get isEmpty() {
			return isEmpty;
		},
		get items() {
			return asArray;
		},
		get raw() {
			return items;
		}
	};
}

/**
 * Efficient async state manager
 * Handles loading states and error handling
 */
export function createAsyncState<T, E = Error>(asyncFn: () => Promise<T>) {
	let data = $state<T | null>(null);
	let error = $state<E | null>(null);
	let isLoading = $state(false);

	const execute = async () => {
		if (isLoading) return;

		isLoading = true;
		error = null;

		try {
			data = await asyncFn();
		} catch (err) {
			error = err as E;
		} finally {
			isLoading = false;
		}
	};

	const reset = () => {
		data = null;
		error = null;
		isLoading = false;
	};

	return {
		get data() {
			return data;
		},
		get error() {
			return error;
		},
		get isLoading() {
			return isLoading;
		},
		get isSuccess() {
			return data !== null && error === null;
		},
		get isError() {
			return error !== null;
		},
		execute,
		reset
	};
}

/**
 * Optimized virtual list utility for large datasets
 * Uses modern Svelte 5 patterns
 */
export function createVirtualList<T>(items: T[], itemHeight: number, containerHeight: number) {
	let scrollTop = $state(0);

	const visibleCount = $derived(Math.ceil(containerHeight / itemHeight) + 2);
	const startIndex = $derived(Math.floor(scrollTop / itemHeight));
	const endIndex = $derived(Math.min(startIndex + visibleCount, items.length));
	const visibleItems = $derived(items.slice(startIndex, endIndex));

	const totalHeight = $derived(items.length * itemHeight);
	const offsetY = $derived(startIndex * itemHeight);

	const handleScroll = (e: Event) => {
		const target = e.target as HTMLElement;
		scrollTop = target.scrollTop;
	};

	return {
		get visibleItems() {
			return visibleItems;
		},
		get totalHeight() {
			return totalHeight;
		},
		get offsetY() {
			return offsetY;
		},
		get startIndex() {
			return startIndex;
		},
		get endIndex() {
			return endIndex;
		},
		handleScroll
	};
}
