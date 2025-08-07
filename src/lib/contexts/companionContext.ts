import { getContext, setContext } from 'svelte';
import { CompanionManager } from '$lib/services/companionManager';

const COMPANION_CONTEXT_KEY = Symbol('companion-manager');

export function setCompanionManager(): CompanionManager {
	const manager = new CompanionManager();
	setContext(COMPANION_CONTEXT_KEY, manager);
	return manager;
}

export function getCompanionManager(): CompanionManager {
	const manager = getContext<CompanionManager>(COMPANION_CONTEXT_KEY);
	if (!manager) {
		throw new Error('CompanionManager context not found. Make sure to call setCompanionManager in a parent component.');
	}
	return manager;
}
