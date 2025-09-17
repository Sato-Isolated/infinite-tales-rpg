import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureMongoDBConnection, saveBatch, loadBatch } from '$lib/db/mongodb';

// POST /api/storage/batch - Handle batch operations
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();

		// Check MongoDB connection
		const isConnected = await ensureMongoDBConnection();
		if (!isConnected) {
			throw error(503, 'MongoDB not available');
		}

		// Batch save operation
		if (body.items && Array.isArray(body.items)) {
			console.log(`📡 API batch save request: ${body.items.length} items`);
			
			// Validate batch items
			for (const item of body.items) {
				if (!item.key || item.data === undefined) {
					throw error(400, 'Each batch item must have key and data');
				}
			}

			// Use the enhanced batch save function
			const success = await saveBatch(body.items);
			if (!success) {
				throw error(500, 'Batch save failed');
			}

			console.log(`✅ Batch saved ${body.items.length} items to MongoDB`);
			return json({ 
				success: true,
				operation: 'save',
				count: body.items.length,
				lastModified: new Date()
			});
		}

		// Batch load operation
		if (body.keys && Array.isArray(body.keys)) {
			console.log(`📡 API batch load request: ${body.keys.length} keys`);

			// Use the enhanced batch load function
			const data = await loadBatch(body.keys);

			console.log(`✅ Batch loaded ${body.keys.length} keys from MongoDB`);
			return json({ 
				success: true,
				operation: 'load',
				data,
				count: Object.keys(data).length
			});
		}

		throw error(400, 'Invalid batch request: provide either items (for save) or keys (for load)');

	} catch (err) {
		console.error('❌ Error in batch operation:', err);
		throw error(500, 'Failed to complete batch operation');
	}
}