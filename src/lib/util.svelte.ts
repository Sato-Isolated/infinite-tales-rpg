import { errorState } from './state/errorState.svelte';
import isPlainObject from 'lodash.isplainobject';
// Type-only import to avoid loading pdfjs in Node test environment
import type * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { Action } from '$lib/ai/agents/gameAgent';
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
 * Enhanced JSON stringify with better formatting for debugging
 * Uses Svelte 5 patterns for optimal performance
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
 * Enhanced navigation utility
 * More robust error handling and modern patterns
 */
export function navigate(path: string): void {
	try {
		// Validate path to prevent XSS
		if (!path || typeof path !== 'string') {
			throw new Error('Invalid navigation path');
		}

		// Sanitize path to prevent malicious URLs
		const sanitizedPath = path.replace(/[<>'"]/g, '');

		const a = document.createElement('a');
		a.href = '/game' + sanitizedPath;
		a.click();

		// Clean up DOM element immediately
		a.remove();
	} catch (error) {
		console.error('Navigation failed:', error);
		// Fallback to window.location with validation
		const safePath = path.replace(/[<>'"]/g, '');
		window.location.href = '/game' + safePath;
	}
}

/**
 * Safely validates localStorage keys to prevent injection
 */
function isValidLocalStorageKey(key: string): boolean {
	return typeof key === 'string' && key.length > 0 && !/[<>'"\\]/.test(key);
}

/**
 * Safely downloads localStorage as JSON with proper validation
 */
export const downloadLocalStorageAsJson = () => {
	try {
		const toSave: Record<string, string> = {};

		// Safely copy localStorage with validation
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && isValidLocalStorageKey(key) && key !== 'apiKeyState') {
				const value = localStorage.getItem(key);
				if (value) {
					toSave[key] = value;
				}
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

export function playAudioFromStream(
	text: string,
	voice: string,
	onended?: () => void
): HTMLAudioElement {
	const audio = new Audio();
	audio.src = getTTSUrl(text, voice);
	audio.autoplay = true;
	if (onended) {
		audio.onended = onended;
	}
	return audio;
}

export function getTTSUrl(text: string, voice: string) {
	return '/api/edgeTTSStream?voice=' + encodeURI(voice) + '&text=' + encodeURI(text);
}

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
