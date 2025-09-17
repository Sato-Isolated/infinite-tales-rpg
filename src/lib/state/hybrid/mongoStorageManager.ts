/**
 * MongoDB Storage Manager - Client-side HTTP API manager with enhanced reactivity
 * Replaces direct MongoDB connection with HTTP calls to SvelteKit API routes
 * Adds real-time subscriptions, optimistic updates, and better error handling
 */

// Enhanced types for better reactivity
export interface MongoStorageInfo {
  save: (key: string, data: any) => Promise<void>;
  load: (key: string) => Promise<any>;
  delete: (key: string) => Promise<void>;
  saveBatch: (items: Array<{ key: string; data: any }>) => Promise<void>;
  loadBatch: (keys: string[]) => Promise<Record<string, any>>;
  subscribe: (key: string | null, listener: (event: ChangeEvent) => void) => () => void;
  isSupported: boolean;
  connectionStatus: ConnectionStatus;
  initialize: () => Promise<void>;
}

export interface ChangeEvent {
  type: 'insert' | 'update' | 'delete';
  key: string;
  data?: any;
  timestamp: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  lastError?: string;
  changeStreamsSupported: boolean;
  lastConnectionTime?: Date;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export class MongoStorageManager {
  private isApiSupported = false;
  private isInitialized = false;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isReconnecting: false,
    changeStreamsSupported: false,
    connectionQuality: 'disconnected'
  };
  
  // Enhanced reactivity support
  private changeListeners = new Map<string, Set<(event: ChangeEvent) => void>>();
  private eventSource: EventSource | null = null;
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000; // Start with 1 second

  constructor() {
  // Constructor no longer performs async initialization
  }

  /**
   * Returns information about the manager (for compatibility with the old API)
   */
  getInfo(): MongoStorageInfo {
    return {
      save: this.save.bind(this),
      load: this.load.bind(this),
      delete: this.delete.bind(this),
      saveBatch: this.saveBatch.bind(this),
      loadBatch: this.loadBatch.bind(this),
      subscribe: this.subscribe.bind(this),
      isSupported: this.isApiSupported,
      connectionStatus: this.connectionStatus,
      initialize: this.initialize.bind(this)
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Connectivity test to our API
      await this.checkSupport();
      
      // Initialize real-time connection if supported
      if (this.isApiSupported) {
        await this.initializeRealtimeConnection();
      }
      
      this.isInitialized = true;
      console.log('✅ MongoDB API manager initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize MongoDB API manager:', error);
      this.isApiSupported = false;
      this.connectionStatus.isConnected = false;
      this.connectionStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.isInitialized = true;
    }
  }

  /**
   * Initialize real-time connection for change events
   */
  private async initializeRealtimeConnection(): Promise<void> {
    try {
      // Test if SSE endpoint exists
      const response = await fetch('/api/storage/events', {
        method: 'HEAD'
      });
      
      if (response.ok) {
        this.connectionStatus.changeStreamsSupported = true;
        this.startEventStream();
      } else {
        this.connectionStatus.changeStreamsSupported = false;
        console.log('ℹ️ Real-time events not available (SSE endpoint not found)');
      }
    } catch (error) {
      this.connectionStatus.changeStreamsSupported = false;
      console.log('ℹ️ Real-time events not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Start Server-Sent Events stream for real-time updates
   */
  private startEventStream(): void {
    if (this.eventSource) {
      return; // Already connected
    }

    try {
      this.eventSource = new EventSource('/api/storage/events');
      
      this.eventSource.onopen = () => {
        console.log('🔄 Real-time event stream connected');
        this.retryCount = 0;
        this.connectionStatus.changeStreamsSupported = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          
          // Handle different event types
          if (eventData.type === 'change') {
            const changeEvent: ChangeEvent = {
              type: eventData.operationType === 'insert' ? 'insert' : 
                    eventData.operationType === 'delete' ? 'delete' : 'update',
              key: eventData.key,
              data: eventData.data,
              timestamp: new Date(eventData.timestamp)
            };
            this.notifyChangeListeners(changeEvent);
          } else if (eventData.type === 'connection-status') {
            // Update connection status from server
            if (eventData.data) {
              this.connectionStatus = { ...this.connectionStatus, ...eventData.data };
            }
          } else if (eventData.type === 'heartbeat') {
            // Keep connection alive
            console.debug('📡 SSE heartbeat received');
          } else if (eventData.type === 'error') {
            console.warn('🚨 SSE error from server:', eventData.message);
          }
        } catch (error) {
          console.warn('Failed to parse SSE event:', error);
        }
      };

      this.eventSource.onerror = (event) => {
        console.warn('Event stream error:', event);
        this.eventSource?.close();
        this.eventSource = null;
        
        // Exponential backoff retry
        if (this.retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, this.retryCount);
          this.retryCount++;
          
          console.log(`⏳ Retrying SSE connection in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
          setTimeout(() => {
            this.startEventStream();
          }, delay);
        } else {
          console.error('❌ Max SSE retries reached, disabling real-time updates');
          this.connectionStatus.changeStreamsSupported = false;
        }
      };
    } catch (error) {
      console.error('Failed to start event stream:', error);
      this.connectionStatus.changeStreamsSupported = false;
    }
  }

  /**
   * Notify all relevant change listeners
   */
  private notifyChangeListeners(event: ChangeEvent): void {
    // Notify specific key listeners
    const keyListeners = this.changeListeners.get(event.key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.warn('Error in change listener:', error);
        }
      });
    }

    // Notify global listeners (null key)
    const globalListeners = this.changeListeners.get('all');
    if (globalListeners) {
      globalListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.warn('Error in global change listener:', error);
        }
      });
    }
  }

  private async checkSupport(): Promise<void> {
    try {
      // Simple test with a ping
      const response = await fetch('/api/storage?key=ping-test');
      
      if (response.ok) {
        this.isApiSupported = true;
        this.connectionStatus.isConnected = true;
        this.connectionStatus.lastConnectionTime = new Date();
        this.connectionStatus.connectionQuality = 'good';
        console.log('✅ MongoDB API is available and working');
      } else {
        this.isApiSupported = false;
        this.connectionStatus.isConnected = false;
        this.connectionStatus.connectionQuality = 'disconnected';
        this.connectionStatus.lastError = `HTTP ${response.status}`;
        console.log('❌ MongoDB API not available (status:', response.status, ')');
      }
    } catch (error) {
      this.isApiSupported = false;
      this.connectionStatus.isConnected = false;
      this.connectionStatus.connectionQuality = 'disconnected';
      this.connectionStatus.lastError = error instanceof Error ? error.message : 'Network error';
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
      // Optimistic update - notify listeners immediately
      this.notifyChangeListeners({
        type: 'update',
        key,
        data,
        timestamp: new Date()
      });

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
        // Revert optimistic update on failure
        this.notifyChangeListeners({
          type: 'update',
          key,
          data: undefined, // Signal that update failed
          timestamp: new Date()
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Saved ${key} to MongoDB`);
    } catch (error) {
      console.error(`❌ Failed to save ${key} to MongoDB:`, error);
      throw error;
    }
  }

  /**
   * Enhanced batch save with optimistic updates
   */
  async saveBatch(items: Array<{ key: string; data: any }>): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('MongoDB API not supported');
    }

    try {
      // Optimistic updates for all items
      items.forEach(item => {
        this.notifyChangeListeners({
          type: 'update',
          key: item.key,
          data: item.data,
          timestamp: new Date()
        });
      });

      const response = await fetch('/api/storage/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        // Revert optimistic updates on failure
        items.forEach(item => {
          this.notifyChangeListeners({
            type: 'update',
            key: item.key,
            data: undefined,
            timestamp: new Date()
          });
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Batch saved ${items.length} items to MongoDB`);
    } catch (error) {
      console.error(`❌ Failed to batch save to MongoDB:`, error);
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

  /**
   * Load multiple keys efficiently
   */
  async loadBatch(keys: string[]): Promise<Record<string, any>> {
    if (!this.isSupported()) {
      throw new Error('MongoDB API not supported');
    }

    try {
      const response = await fetch('/api/storage/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Batch loaded ${keys.length} keys from MongoDB`);
      return result.data || {};
    } catch (error) {
      console.error(`❌ Failed to batch load from MongoDB:`, error);
      return {}; // Return empty object on error
    }
  }

  /**
   * Subscribe to changes for a specific key or all keys
   */
  subscribe(key: string | null, listener: (event: ChangeEvent) => void): () => void {
    const keyStr = key || 'all';
    
    if (!this.changeListeners.has(keyStr)) {
      this.changeListeners.set(keyStr, new Set());
    }
    
    this.changeListeners.get(keyStr)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.changeListeners.get(keyStr);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.changeListeners.delete(keyStr);
        }
      }
    };
  }

  async delete(key: string): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('MongoDB API not supported');
    }

    try {
      // Optimistic delete - notify listeners immediately
      this.notifyChangeListeners({
        type: 'delete',
        key,
        timestamp: new Date()
      });

      // Match server API: DELETE /api/storage?key=xxx
      const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Note: We don't revert delete optimistic updates as it's complex
        // to restore the previous value. The next load will get the real state.
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Deleted ${key} from MongoDB`);
    } catch (error) {
      console.error(`❌ Failed to delete ${key} from MongoDB:`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources when no longer needed
   */
  cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.changeListeners.clear();
  }
}

// Singleton instance
export const mongoStorageManager = new MongoStorageManager();
