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
