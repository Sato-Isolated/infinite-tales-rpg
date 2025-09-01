import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToMongoDB, GameData, ensureMongoDBConnection } from '$lib/db/mongodb';

// GET /api/storage?key=xxx - Récupérer une donnée
export const GET: RequestHandler = async ({ url }) => {
	try {
		const key = url.searchParams.get('key');

		console.log(`📡 API GET request: key=${key}`);

		if (!key) {
			throw error(400, 'key is required');
		}

		// Vérifier la connexion MongoDB
		console.log('🔗 Checking MongoDB connection...');
		const isConnected = await ensureMongoDBConnection();
		console.log(`🔗 MongoDB connection status: ${isConnected}`);
		
		if (!isConnected) {
			console.error('❌ MongoDB not available, returning error 503');
			throw error(503, 'MongoDB not available');
		}

		console.log(`🔍 Searching for document: key=${key}`);
		// Récupérer la donnée (sans userId, juste la clé)
		const document = await GameData.findOne({ key });
		console.log(`📄 Document found:`, document ? 'Yes' : 'No');
		
		if (!document) {
			// Pas de donnée trouvée, retourner null
			return json({ data: null, found: false });
		}

		return json({ 
			data: document.data, 
			found: true,
			lastModified: document.lastModified 
		});

	} catch (err) {
		console.error('❌ Error fetching from MongoDB:', err);
		throw error(500, 'Failed to fetch data');
	}
};

// POST /api/storage - Sauvegarder une donnée
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { key, data } = await request.json();

		console.log(`📡 API POST request: key=${key}`);

		if (!key || data === undefined) {
			throw error(400, 'key and data are required');
		}

		// Vérifier la connexion MongoDB
		const isConnected = await ensureMongoDBConnection();
		if (!isConnected) {
			throw error(503, 'MongoDB not available');
		}

		// Upsert (insert ou update) - juste avec la clé
		const result = await GameData.findOneAndUpdate(
			{ key },
			{ 
				data,
				lastModified: new Date()
			},
			{ 
				upsert: true, // Créer si n'existe pas
				new: true     // Retourner le document mis à jour
			}
		);

		console.log(`✅ Saved ${key} to MongoDB`);

		return json({ 
			success: true,
			lastModified: result.lastModified 
		});

	} catch (err) {
		console.error('❌ Error saving to MongoDB:', err);
		throw error(500, 'Failed to save data');
	}
};

// DELETE /api/storage?key=xxx - Supprimer une donnée
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const key = url.searchParams.get('key');

		console.log(`📡 API DELETE request: key=${key}`);

		if (!key) {
			throw error(400, 'key is required');
		}

		// Vérifier la connexion MongoDB
		const isConnected = await ensureMongoDBConnection();
		if (!isConnected) {
			throw error(503, 'MongoDB not available');
		}

		// Supprimer juste avec la clé
		const result = await GameData.deleteOne({ key });

		console.log(`✅ Deleted ${key} from MongoDB`);

		return json({ 
			success: true,
			deleted: result.deletedCount > 0 
		});

	} catch (err) {
		console.error('❌ Error deleting from MongoDB:', err);
		throw error(500, 'Failed to delete data');
	}
};
