/**
 * MongoDB Storage Manager - Client-side HTTP API manager
 * Replaces direct MongoDB connection with HTTP calls to SvelteKit API routes
 */

export interface MongoStorageInfo {
  save: (key: string, data: any) => Promise<void>;
  load: (key: string) => Promise<any>;
  delete: (key: string) => Promise<void>;
  isSupported: boolean;
  initialize: () => Promise<void>;
}

export class MongoStorageManager {
  private isApiSupported = false;
  private isInitialized = false;

  constructor() {
    // Constructor ne fait plus l'initialisation async
  }

  /**
   * Retourne les informations sur le manager (pour compatibilité avec l'ancienne API)
   */
  getInfo(): MongoStorageInfo {
    return {
      save: this.save.bind(this),
      load: this.load.bind(this),
      delete: this.delete.bind(this),
      isSupported: this.isApiSupported,
      initialize: this.initialize.bind(this)
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Test de connectivité à notre API
      await this.checkSupport();
      this.isInitialized = true;
      console.log('✅ MongoDB API manager initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize MongoDB API manager:', error);
      this.isApiSupported = false;
      this.isInitialized = true;
    }
  }

  private async checkSupport(): Promise<void> {
    try {
      // Test simple avec un ping
      const response = await fetch('/api/storage?key=ping-test');
      
      if (response.ok) {
        this.isApiSupported = true;
        console.log('✅ MongoDB API is available and working');
      } else {
        this.isApiSupported = false;
        console.log('❌ MongoDB API not available (status:', response.status, ')');
      }
    } catch (error) {
      this.isApiSupported = false;
      console.log('❌ MongoDB API check failed:', error);
      throw error;
    }
  }

  isSupported(): boolean {
    return this.isApiSupported;
  }

  async save(key: string, data: any): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('MongoDB API not supported');
    }

    try {
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          data
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Saved ${key} to MongoDB`);
    } catch (error) {
      console.error(`❌ Failed to save ${key} to MongoDB:`, error);
      throw error;
    }
  }

  async load(key: string): Promise<any> {
    if (!this.isSupported()) {
      throw new Error('MongoDB API not supported');
    }

    try {
      const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.found) {
        console.log(`✅ Loaded ${key} from MongoDB`);
        return result.data;
      } else {
        console.log(`ℹ️ No data found for ${key}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to load ${key} from MongoDB:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('MongoDB API not supported');
    }

    try {
      const response = await fetch('/api/storage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Deleted ${key} from MongoDB`);
    } catch (error) {
      console.error(`❌ Failed to delete ${key} from MongoDB:`, error);
      throw error;
    }
  }
}

// Instance singleton
export const mongoStorageManager = new MongoStorageManager();
