/**
 * Type-safe validation utilities to replace unsafe 'as any' casts
 */

/**
 * Type guard to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
	return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * Safely gets a property from an object with type validation
 */
export function getProperty<T>(
	obj: unknown,
	key: string,
	validator: (value: unknown) => value is T,
	defaultValue: T
): T {
	if (!isObject(obj) || !(key in obj)) {
		return defaultValue;
	}

	const value = obj[key];
	return validator(value) ? value : defaultValue;
}

/**
 * Safely sets a property on an object with type validation
 */
export function setProperty<T>(
	obj: Record<string, unknown>,
	key: string,
	value: T,
	validator: (value: unknown) => value is T
): boolean {
	if (!validator(value)) {
		console.warn(`Invalid value for property ${key}:`, value);
		return false;
	}

	obj[key] = value;
	return true;
}

/**
 * Validates that an object has required properties
 */
export function hasRequiredProperties<T extends Record<string, unknown>>(
	obj: unknown,
	requiredKeys: (keyof T)[]
): obj is T {
	if (!isObject(obj)) {
		return false;
	}

	return requiredKeys.every((key) => key in obj);
}

/**
 * Safely merges objects with type validation
 */
export function safeMerge<T extends Record<string, unknown>>(
	target: T,
	source: unknown,
	validator: (value: unknown) => value is Partial<T>
): T {
	if (!validator(source)) {
		console.warn('Invalid source object for merge:', source);
		return target;
	}

	return { ...target, ...source };
}

/**
 * Creates a validated copy of an object
 */
export function validateAndCopy<T>(
	obj: unknown,
	validator: (value: unknown) => value is T,
	fallback: T
): T {
	return validator(obj) ? { ...obj } : fallback;
}

/**
 * Safely casts unknown to a specific type with validation
 */
export function safeCast<T>(
	value: unknown,
	validator: (value: unknown) => value is T,
	errorMessage?: string
): T {
	if (validator(value)) {
		return value;
	}

	const message = errorMessage || `Type validation failed for value: ${value}`;
	throw new TypeError(message);
}

/**
 * Optional safe cast that returns undefined on failure
 */
export function optionalSafeCast<T>(
	value: unknown,
	validator: (value: unknown) => value is T
): T | undefined {
	return validator(value) ? value : undefined;
}
