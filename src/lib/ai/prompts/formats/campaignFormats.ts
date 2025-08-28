/**
 * Campaign format prompts
 */

/**
 * Format template for campaign chapters
 */
export const chaptersJsonFormat = `{
		"chapterId": 1,
		"title": "chapter title",
		"description": "chapter description",
		"objective": "chapter objective",
		"plot_points": [
			{
				"plotId": 1,
				"location": "location name",
				"description": "plot point description",
				"objective": "plot point objective",
				"important_NPCs": ["NPC description 1", "NPC description 2"],
				"game_master_notes": ["rule or obstacle description", "special requirement note"]
			}
		]
	}`;

/**
 * Complete campaign JSON format template
 */
export const campaignJsonFormat = `{
	"game": "Dungeons & Dragons",
	"campaign_title": "campaign title",
	"campaign_description": "campaign description",
	"world_details": "detailed world description including geography, cultures, history, and unique elements",
	"character_simple_description": "simple character description fitting the game system and world",
	"general_image_prompt": "visual style genre artist reference",
	"theme": "story theme and world location",
	"tonality": "writing style and narrative tone fitting the game system",
	"chapters": [
		${chaptersJsonFormat}
	]
}`;

/**
 * Campaign creation instructions
 */
export const campaignInstructions = [
	'CAMPAIGN CREATION RULES:',
	'- game: Choose any pen & paper system (Pathfinder, Call of Cthulhu, Star Wars, Fate Core, etc.)',
	'- campaign_title: Engaging title that captures the campaign essence',
	'- campaign_description: Overview of the main story arc and adventure',
	'- world_details: Vivid description of geography, cultures, history, technologies, politics',
	'- character_simple_description: Random character fitting the game system and world',
	'- general_image_prompt: Visual style guide (max 10 words) for AI image generation',
	'- theme: Story world and setting theme',
	'- tonality: Writing style that matches the game system',
	'- chapters: Campaign structure with 2-4 plot points per chapter',
	'',
	'PLOT POINT RULES:',
	'- plotId: Sequential numbering starting at 1 for each new chapter',
	'- important_NPCs: Array of descriptive strings, one per NPC',
	'- game_master_notes: Array of specific rules and obstacles for the plot point'
].join('\n');

/**
 * Number of plot points per chapter guidance
 */
export const plotPointNumberPrompt = 'Each chapter with 2 - 4 plot points';

/**
 * Legacy exports for backward compatibility
 */
export const chaptersPrompt = chaptersJsonFormat;
export const campaignJsonPrompt = campaignJsonFormat;
