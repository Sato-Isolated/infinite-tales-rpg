import { browser } from '$app/environment';

export interface MongoStorageInfo {
	isSupported: boolean;
	isInitialized: boolean;
	userId: string | null;
	lastError: string | null;
}

class MongoStorageManagerClass {
	private _isSupported = false;
	private _isInitialized = false;
	private _userId: string | null = null;
	private _lastError: string | null = null;

	constructor() {
		// Pas d'appel asynchrone dans le constructeur
	}

	private async checkSupport(): Promise<void> {
		try {
			// Test si l'API est accessible en faisant un ping
			const response = await fetch('/api/storage?userId=test&key=ping', {
				method: 'GET'
			});
			
			// API works if we get a 200 response (even if data=null)
			this._isSupported = response.ok;
			this._lastError = null;
		} catch (error) {
			this._isSupported = false;
			this._lastError = `API check failed: ${error}`;
		}
	}

	async initialize(): Promise<boolean> {
		if (!browser) {
			return false;
		}

		// Check support before initialization
		await this.checkSupport();

		if (!this._isSupported) {
			return false;
		}

		try {
			// Generate or retrieve a unique userId for this browser
			let userId = localStorage.getItem('mongo-user-id');
			if (!userId) {
				userId = crypto.randomUUID();
				localStorage.setItem('mongo-user-id', userId);
			}

			this._userId = userId;
			this._isInitialized = true;
			this._lastError = null;
			return true;
		} catch (error) {
			this._lastError = `Initialization failed: ${error}`;
			this._isInitialized = false;
			return false;
		}
	}

	async save(key: string, data: any): Promise<boolean> {
		if (!this._isInitialized || !this._userId) {
			return false;
		}

		try {
			const response = await fetch('/api/storage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userId: this._userId,
					key,
					data
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			this._lastError = null;
			return true;
		} catch (error) {
			this._lastError = `Save failed: ${error}`;
			return false;
		}
	}

	async load(key: string): Promise<any | null> {
		if (!this._isInitialized || !this._userId) {
			return null;
		}

		try {
			const response = await fetch(`/api/storage?userId=${encodeURIComponent(this._userId)}&key=${encodeURIComponent(key)}`);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			this._lastError = null;
			
			return result.found ? result.data : null;
		} catch (error) {
			this._lastError = `Load failed: ${error}`;
			return null;
		}
	}

	async delete(key: string): Promise<boolean> {
		if (!this._isInitialized || !this._userId) {
			return false;
		}

		try {
			const response = await fetch(`/api/storage?userId=${encodeURIComponent(this._userId)}&key=${encodeURIComponent(key)}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			this._lastError = null;
			return true;
		} catch (error) {
			this._lastError = `Delete failed: ${error}`;
			return false;
		}
	}

	getInfo(): MongoStorageInfo {
		return {
			isSupported: this._isSupported,
			isInitialized: this._isInitialized,
			userId: this._userId,
			lastError: this._lastError
		};
	}

	// Method to attempt reconnecting/fixing the connection
	async repair(): Promise<boolean> {
		this._isInitialized = false;
		this._userId = null;
		this._lastError = null;
		
		await this.checkSupport();
		if (this._isSupported) {
			return await this.initialize();
		}
		return false;
	}
}

export const mongoStorageManager = new MongoStorageManagerClass();

// Default export for compatibility
export default mongoStorageManager;
