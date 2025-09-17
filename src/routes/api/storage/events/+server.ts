import type { RequestEvent } from '@sveltejs/kit';
import { subscribeToChanges, getConnectionStatus } from '$lib/db/mongodb';

// GET /api/storage/events - Server-Sent Events for real-time updates
export async function GET({ request }: RequestEvent) {
	// Check if client supports Server-Sent Events
	const acceptHeader = request.headers.get('accept');
	if (!acceptHeader?.includes('text/event-stream')) {
		return new Response('Server-Sent Events not supported', { 
			status: 406,
			headers: { 'Content-Type': 'text/plain' }
		});
	}

	// Create readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			// Send initial connection status
			const connectionStatus = getConnectionStatus();
			const initialData = JSON.stringify({
				type: 'connection-status',
				data: connectionStatus,
				timestamp: new Date().toISOString()
			});
			
			controller.enqueue(`data: ${initialData}\n\n`);

			// Keep connection alive with periodic heartbeat
			const heartbeatInterval = setInterval(() => {
				try {
					const heartbeat = JSON.stringify({
						type: 'heartbeat',
						timestamp: new Date().toISOString()
					});
					controller.enqueue(`data: ${heartbeat}\n\n`);
				} catch (error) {
					console.warn('Failed to send heartbeat:', error);
					clearInterval(heartbeatInterval);
				}
			}, 30000); // Every 30 seconds

			// Subscribe to MongoDB changes
			let changeSubscription: (() => void) | null = null;
			
			try {
				changeSubscription = subscribeToChanges(null, (changeEvent) => {
					try {
						const eventData = JSON.stringify({
							type: 'change',
							key: changeEvent.key,
							data: changeEvent.fullDocument?.data,
							operationType: changeEvent.operationType,
							timestamp: changeEvent.wallTime?.toISOString() || new Date().toISOString()
						});
						
						controller.enqueue(`data: ${eventData}\n\n`);
					} catch (error) {
						console.warn('Failed to send change event:', error);
					}
				});
			} catch (error) {
				console.warn('Failed to setup change stream subscription:', error);
				// Send error event to client
				const errorData = JSON.stringify({
					type: 'error',
					message: 'Change streams not available',
					timestamp: new Date().toISOString()
				});
				controller.enqueue(`data: ${errorData}\n\n`);
			}

			// Cleanup when client disconnects
			request.signal?.addEventListener('abort', () => {
				clearInterval(heartbeatInterval);
				if (changeSubscription) {
					changeSubscription();
				}
				controller.close();
			});
		},

		cancel() {
			// Stream cancelled by client
			console.log('SSE stream cancelled by client');
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET',
			'Access-Control-Allow-Headers': 'Accept, Cache-Control'
		}
	});
}

// HEAD /api/storage/events - Check if SSE endpoint exists
export async function HEAD() {
	return new Response(null, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream',
			'Access-Control-Allow-Origin': '*'
		}
	});
}