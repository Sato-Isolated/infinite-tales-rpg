/**
 * Story format prompts
 */

/**
 * Story JSON format template
 */
export const storyJsonFormat = `{
	"game": "Dungeons & Dragons",
	"world_details": "detailed world description including geography, culture, history, and unique elements",
	"story_pace": "slice-of-life",
	"main_scenario": "central situation or context description",
	"character_simple_description": "character description fitting the game system",
	"general_image_prompt": "visual style genre artist reference",
	"theme": "overall theme or setting",
	"tonality": "writing style and mood",
	"background_context": "background elements and atmosphere",
	"social_dynamics": "social environment and relationships",
	"locations": "list of everyday and special locations",
	"npcs": "list of people character interacts with regularly",
	"story_catalyst": "initial situation that provides starting momentum",
	"potential_developments": "subtle elements that could develop into events",
	"narrative_flexibility": "how story can shift between different paces",
	"player_agency": "how character choices influence story development",
	"content_rating": "safe",
	"tags": "keywords describing genres, themes, or mood"
}`;

/**
 * Story creation instructions
 */
export const storyInstructions = [
  'STORY CREATION RULES:',
  '- game: Choose any pen & paper system (Pathfinder, Call of Cthulhu, Star Wars, Fate Core, etc.)',
  '- world_details: Key characteristics defining daily life and setting essence',
  '- story_pace: slice-of-life, balanced, adventure-focused, or player-controlled',
  '- main_scenario: Central situation ranging from daily life to epic adventures',
  '- character_simple_description: Character fitting the game system in scenario context',
  '- general_image_prompt: Visual prompt (max 10 words) format: {visualStyle} {genre} {artistReference}',
  '- theme: Overall theme or setting of the story',
  '- tonality: Writing style and mood that fits the game system',
  '- background_context: Background elements matching chosen pace',
  '- social_dynamics: Social environment, relationships, and daily interactions',
  '- locations: 2-3 everyday locations plus one optional special location',
  '- npcs: 2-4 people with simple motivations and relationship dynamics',
  '- story_catalyst: Initial situation fitting desired pace',
  '- potential_developments: Optional plot seeds that can remain dormant or develop',
  '- narrative_flexibility: How story can shift between different paces',
  '- player_agency: How character choices influence immediate and long-term development',
  '- content_rating: safe (family-friendly), mid (mild mature), adult (mature), or uncensored',
  '- tags: 4-6 keywords describing preferred genres, themes, or mood'
].join('\n');
