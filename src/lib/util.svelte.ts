import { errorState } from './state/errorState.svelte';
import { hybridStorageConfig } from './state/hybrid/config';
import { mongoStorageManager } from './state/hybrid/mongoStorageManager';
import isPlainObject from 'lodash.isplainobject';
// Type-only import to avoid loading pdfjs in Node test environment
import type * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { Action } from '$lib/types/action';
import type { NpcID } from '$lib/ai/agents/characterStatsAgent';

export type ThoughtsState = {
	storyThoughts: string;
	actionsThoughts: string;
	eventThoughts: string;
};

export const initialThoughtsState: ThoughtsState = {
	storyThoughts: '',
	actionsThoughts: '',
	eventThoughts: ''
};

// Local type guard to avoid extra dependency on lodash.isstring
const isString = (value: unknown): value is string =>
	typeof value === 'string' || value instanceof String;

/**
 * Enhanced JSON stringify without caching - no performance optimization cache
 * Generates fresh JSON strings on each call to prevent repetitive content patterns
 */
export function stringifyPretty(object: unknown): string {
	try {
		return JSON.stringify(object, null, 2);
	} catch (error) {
		console.warn('Failed to stringify object:', error);
		return String(object);
	}
}

/**
 * Improved error handling with better state management
 * Compatible with Svelte 5 reactive patterns
 */
export function handleError(e: string, retryable = true): void {
	console.error('Application Error:', e);
	if (!errorState.exception) {
		errorState.exception = e;
		errorState.userMessage = e;
		errorState.retryable = retryable;
	}
}

/**
 * Path sanitization utility for security
 */
function sanitizePath(path: string): string {
	// Remove potentially dangerous characters
	return path.replace(/[<>'"\\]/g, '').replace(/\.{2,}/g, '');
}

/**
 * Enhanced navigation utility with better security and error handling
 * More robust error handling and modern patterns
 */
export function navigate(path: string): void {
	try {
		// Enhanced validation to prevent XSS and path traversal
		if (!path || typeof path !== 'string' || path.trim().length === 0) {
			throw new Error('Invalid navigation path');
		}

		// Sanitize path to prevent malicious URLs and path traversal
		const sanitizedPath = sanitizePath(path.trim());

		// Additional security check for empty path after sanitization
		if (!sanitizedPath) {
			throw new Error('Path became empty after sanitization');
		}

		// Use modern navigation approach
		const targetUrl =
			'/game' + (sanitizedPath.startsWith('/') ? sanitizedPath : '/' + sanitizedPath);

		// Create temporary link element for programmatic navigation
		const anchorElement = document.createElement('a');
		anchorElement.href = targetUrl;
		anchorElement.style.display = 'none';

		// Append, click, and clean up immediately
		document.body.appendChild(anchorElement);
		anchorElement.click();
		document.body.removeChild(anchorElement);
	} catch (error) {
		console.error('Navigation failed:', error);

		// Enhanced fallback with better error handling
		try {
			const safePath = sanitizePath(path || '');
			if (safePath) {
				window.location.href = '/game/' + safePath;
			} else {
				window.location.href = '/game';
			}
		} catch (fallbackError) {
			console.error('Fallback navigation also failed:', fallbackError);
			// Last resort: navigate to game root
			window.location.href = '/game';
		}
	}
}

/**
 * Enhanced localStorage key validation with better security patterns
 */
function isValidLocalStorageKey(key: string): boolean {
	return (
		typeof key === 'string' &&
		key.length > 0 &&
		key.length <= 256 && // Reasonable length limit
		!/[<>'"\\]/.test(key) && // Prevent injection attacks
		!/^(__proto__|constructor|prototype)$/i.test(key) // Prevent prototype pollution
	);
}

/**
 * Enhanced localStorage export with better performance and security
 */
export const downloadLocalStorageAsJson = (): void => {
	try {
		const toSave: Record<string, string> = {};
		const excludedKeys = new Set(['apiKeyState']); // Sensitive keys to exclude

		// Optimized localStorage iteration with validation
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (!key || !isValidLocalStorageKey(key) || excludedKeys.has(key)) {
				continue;
			}

			try {
				const value = localStorage.getItem(key);
				if (value !== null) {
					// Validate that the value is valid JSON before including
					JSON.parse(value);
					toSave[key] = value;
				}
			} catch (parseError) {
				console.warn(`Skipping invalid JSON for key "${key}":`, parseError);
				continue;
			}
		}

		const parsedData: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(toSave)) {
			try {
				parsedData[key] = JSON.parse(value);
			} catch (parseError) {
				console.warn(`Failed to parse localStorage value for key "${key}":`, parseError);
				// Skip invalid JSON rather than including raw string
				continue;
			}
		}

		const json = encodeURIComponent(JSON.stringify(parsedData, null, 2));
		const dataStr = 'data:application/json;charset=utf-8,' + json;

		const dlAnchorElem = document.createElement('a');
		dlAnchorElem.setAttribute('href', dataStr);
		dlAnchorElem.setAttribute('download', 'infinite-tales-rpg.json');
		dlAnchorElem.click();

		// Clean up DOM element immediately
		dlAnchorElem.remove();
	} catch (error) {
		console.error('Failed to download localStorage:', error);
		handleError('Failed to export game data. Please try again.');
	}
};

/**
 * Export both MongoDB-backed (fileSystem) keys and localStorage keys to JSON
 * Falls back to localStorage when MongoDB is not available.
 */
export const downloadHybridStorageAsJson = async (): Promise<void> => {
	try {
		const excludedKeys = new Set(['apiKeyState']); // Sensitive keys to exclude

		// Aggregate keys from config + any extra keys currently in localStorage
		const fsKeys = hybridStorageConfig.fileSystemKeys || [];
		const lsKeys = hybridStorageConfig.localStorageKeys || [];
		const lsRuntimeKeys: string[] = [];
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const k = localStorage.key(i);
				if (k) lsRuntimeKeys.push(k);
			}
		} catch {
			// ignore if not available
		}
		const allKeys = Array.from(new Set([...fsKeys, ...lsKeys, ...lsRuntimeKeys])).filter(
			(k) => !excludedKeys.has(k)
		);

		// Try initialize Mongo API (safe no-op if unavailable)
		const info = mongoStorageManager.getInfo();
		try {
			await info.initialize();
		} catch {
			// Non-blocking; will fallback to localStorage
		}

		const result: Record<string, unknown> = {};

		for (const key of allKeys) {
			let value: unknown = undefined;

			// Prefer Mongo for fileSystem keys when supported
			if (fsKeys.includes(key) && info.isSupported) {
				try {
					const loaded = await info.load(key);
					if (loaded !== null && loaded !== undefined) {
						value = loaded;
					}
				} catch {
					// ignore and fallback
				}
			}

			// Fallback to localStorage when needed or for ls-only keys
			if (value === undefined) {
				try {
					const raw = localStorage.getItem(key);
					if (raw !== null) {
						value = JSON.parse(raw);
					}
				} catch (e) {
					console.warn(`Skipping invalid or unavailable key "${key}" during hybrid export:`, e);
				}
			}

			if (value !== undefined) {
				result[key] = value;
			}
		}

		const json = encodeURIComponent(JSON.stringify(result, null, 2));
		const dataStr = 'data:application/json;charset=utf-8,' + json;

		const dlAnchorElem = document.createElement('a');
		dlAnchorElem.setAttribute('href', dataStr);
		dlAnchorElem.setAttribute('download', 'infinite-tales-rpg.json');
		dlAnchorElem.click();
		dlAnchorElem.remove();
	} catch (error) {
		console.error('Failed to export hybrid storage:', error);
		handleError('Failed to export game data. Please try again.');
	}
};

/**
 * Enhanced file import with proper validation and security checks
 */
export const importJsonFromFile = (callback: (data: unknown) => void) => {
	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.accept = 'application/json';

	// Add size limit (10MB max)
	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

	fileInput.addEventListener('change', function (event) {
		const target = event.target as HTMLInputElement;
		const file = target?.files?.[0];

		if (!file) {
			return;
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			handleError('File size too large. Maximum allowed size is 10MB.');
			return;
		}

		// Validate file type
		if (!file.type.includes('application/json') && !file.name.endsWith('.json')) {
			handleError('Invalid file type. Please select a JSON file.');
			return;
		}

		const reader = new FileReader();

		reader.onload = (evt) => {
			try {
				const result = evt.target?.result;
				if (!result) {
					handleError('Failed to read file.');
					return;
				}

				let jsonText: string;
				if (result instanceof ArrayBuffer) {
					jsonText = new TextDecoder('utf-8').decode(result);
				} else {
					jsonText = result;
				}

				// Validate JSON size in memory
				if (jsonText.length > MAX_FILE_SIZE) {
					handleError('File content too large after reading.');
					return;
				}

				const parsed = JSON.parse(jsonText);

				// Basic validation that it's an object (expected for localStorage export)
				if (typeof parsed !== 'object' || parsed === null) {
					handleError('Invalid file format. Expected JSON object.');
					return;
				}

				callback(parsed);
			} catch (error) {
				console.error('Failed to parse imported file:', error);
				handleError('Failed to parse JSON file. Please check the file format.');
			}
		};

		reader.onerror = () => {
			handleError('Failed to read file.');
		};

		reader.readAsArrayBuffer(file);
	});

	fileInput.click();

	// Clean up DOM element after use
	setTimeout(() => {
		fileInput.remove();
	}, 1000);
};

let worker: pdfjs.PDFWorker | undefined;

export async function loadPDF(file: File) {
	// Ensure this only runs in the browser
	if (typeof window === 'undefined') {
		throw new Error('loadPDF is only available in the browser environment');
	}
	const pdfjs = await import('pdfjs-dist');
	if (!worker) {
		worker = new pdfjs.PDFWorker({
			port: new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url), {
				type: 'module'
			}) as unknown as null
		});
	}
	const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), worker }).promise;
	const maxPages = pdf._pdfInfo.numPages;
	const countPromises: Array<Promise<string>> = []; // collecting all page promises
	for (let j = 1; j <= maxPages; j++) {
		const page = pdf.getPage(j);

		countPromises.push(
			page.then(function (page) {
				// add page promise
				const textContent = page.getTextContent();
				return textContent.then(function (text) {
					// return content promise
					return text.items
						.map(function (s) {
							return (s as TextItem).str;
						})
						.join(''); // value page text
				});
			})
		);
	}
	// Wait for all pages and join text
	return Promise.all(countPromises).then(function (texts) {
		return texts.join('\n');
	});
}

export function getRowsForTextarea(object: Record<string, any>) {
	const mappedRows: Record<string, any> = {};
	if (!object) {
		return undefined;
	}
	Object.keys(object).forEach((key) => {
		if (isPlainObject(object[key])) {
			mappedRows[key] = getRowsForTextarea(object[key]);
		} else {
			const textLength = (object[key] + '').length;
			mappedRows[key] = 2;
			if (textLength >= 100) {
				mappedRows[key] = 3;
			}
			if (textLength >= 200) {
				mappedRows[key] = 4;
			}
			if (textLength >= 300) {
				mappedRows[key] = 5;
			}
			if (textLength <= 30) {
				mappedRows[key] = 1;
			}
		}
	});
	return mappedRows;
}

export function parseState(newState: Record<string, any>) {
	Object.keys(newState).forEach((key) => {
		if (isString(newState[key])) {
			newState[key] = JSON.parse(newState[key] as string);
		}
	});
}

export function getRandomInteger(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const removeEmptyValues = (object: Record<string, any>) =>
	object &&
	Object.fromEntries(
		Object.entries(object)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.filter(
				([_, value]) =>
					value && typeof value === 'object' && Object.keys(value as object).length > 0
			)
	);

export function getTextForActionButton(action: Action) {
	// Handle undefined action.text gracefully with logging
	if (!action.text) {
		console.warn('Action with undefined text found:', JSON.stringify(action, null, 2));
		return action.characterName ? `${action.characterName} - Action manquante` : 'Action manquante';
	}

	const actionText = action.text;
	let text = '';
	const cost = parseInt(action.resource_cost?.cost as unknown as string) || 0;

	if (cost > 0) {
		const costString = ` (${cost} ${action.resource_cost?.resource_key?.replaceAll('_', ' ')}).`;
		text = actionText.replaceAll('.', '');
		text += costString;
	} else {
		const hasEndingChar =
			actionText.endsWith('.') ||
			actionText.endsWith('. ') ||
			actionText.endsWith('! ') ||
			actionText.endsWith('!') ||
			actionText.endsWith('? ') ||
			actionText.endsWith('?');
		text += hasEndingChar ? actionText : actionText + '.';
	}
	return text;
}

export const getNPCDisplayName = (npc: NpcID) => {
	return npc.displayName || npc.uniqueTechnicalNameId || JSON.stringify(npc);
};

export const getNPCTechnicalID = (npc: NpcID) => {
	return npc.uniqueTechnicalNameId || npc.displayName || JSON.stringify(npc);
};

export function shuffleArray<T>(array: T[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}
