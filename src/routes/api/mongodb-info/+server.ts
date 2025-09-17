import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getMongoDBInfo } from '$lib/db/mongodb';

// GET /api/mongodb-info - Get MongoDB server information
export async function GET({ }: RequestEvent) {
	try {
		const info = await getMongoDBInfo();
		
		return json({
			success: true,
			...info
		});
	} catch (error) {
		console.error('❌ Error getting MongoDB info:', error);
		
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			isConnected: false,
			changeStreamsSupported: false,
			serverType: 'unknown',
			connectionQuality: 'disconnected',
			recommendations: [
				'MongoDB connection failed',
				'Check MongoDB connection string and server status'
			]
		});
	}
}