import { getRandomInteger, stringifyPretty } from '$lib/util.svelte';
import type { LLM, LLMMessage, LLMRequest } from '$lib/ai/llm';
import type { Action } from '$lib/ai/agents/gameAgent';
import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
import isEqual from 'fast-deep-equal';
import { exampleGameSystems } from '$lib/ai/agents/storyAgent';
import { TROPES_CLICHE_PROMPT } from '$lib/ai/prompts/shared';
import { chaptersPrompt, campaignJsonPrompt, plotPointNumberPrompt } from '$lib/ai/prompts/formats';
import { campaignMainAgent } from '$lib/ai/prompts/system';

export type CampaignChapterPlotPoint = {
	plotId: number;
	objective: string;
	location: string;
	description: string;
	important_NPCs: Array<string>;
	game_master_notes: Array<string>;
};

export type CampaignChapter = {
	chapterId: number;
	title: string;
	description: string;
	objective: string;
	plot_points: Array<CampaignChapterPlotPoint>;
};
export type Campaign = {
	game: string;
	campaign_title: string;
	campaign_description: string;
	world_details: string;
	character_simple_description: string;
	chapters: Array<CampaignChapter>;
	general_image_prompt: string;
	theme: string;
	tonality: string;
};

export const getNewChapterObject = (chapterId: number): CampaignChapter => {
	return {
		chapterId: chapterId,
		title: '',
		description: '',
		objective: '',
		plot_points: []
	};
};

export const getNewPlotPointObject = (plotId: number): CampaignChapterPlotPoint => {
	return {
		plotId: plotId,
		location: '',
		description: '',
		objective: '',
		important_NPCs: [],
		game_master_notes: []
	};
};

export const initialCampaignState = {
	game: '',
	campaign_title: '',
	campaign_description: '',
	world_details: '',
	character_simple_description: '',
	chapters: [],
	general_image_prompt: '',
	theme: '',
	tonality: ''
};

export class CampaignAgent {
	llm: LLM;

	constructor(llm: LLM) {
		this.llm = llm;
	}

	async generateCampaign(
		overwrites = {},
		characterDescription: CharacterDescription | undefined = undefined
	): Promise<Campaign> {
		const agent =
			campaignMainAgent +
			'\nProvide 3 - 6 chapters.\n' +
			plotPointNumberPrompt +
			'\nCRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.\n' +
			campaignJsonPrompt;

		const preset: Partial<Campaign> = {
			...overwrites
		};
		if (isEqual(overwrites, {})) {
			preset.game = exampleGameSystems[getRandomInteger(0, exampleGameSystems.length - 1)];
		}
		const request: LLMRequest = {
			userMessage:
				'Create a new randomized campaign considering the following settings: ' +
				stringifyPretty(preset),
			historyMessages: [],
			systemInstruction: agent,
			temperature: 2
		};
		if (characterDescription?.name) {
			request.historyMessages?.push({
				role: 'user',
				content:
					'The campaign story must have the character_simple_description as player character protagonist: ' +
					stringifyPretty(characterDescription)
			});
		}
		const campaign = (await this.llm.generateContent(request))?.content as Campaign;
		return campaign;
	}

	async checkCampaignDeviations(
		nextAction: Action,
		plannedCampaign: Campaign,
		actionHistory: Array<LLMMessage>
	): Promise<any> {
		//careful as these are proxies, adding is fine
		const actionHistoryStoryOnly = actionHistory
			.filter((message) => message.role === 'model')
			.map((message) => ({ role: 'model', content: JSON.parse(message.content).story }));

		actionHistoryStoryOnly.push({ role: 'user', content: nextAction.text });
		const agent =
			'You are Pen & Paper campaign agent, crafting an epic, overarching campaign with chapters. Each chapter is an own adventure with an own climax and then fades gradually into the next chapter.\n' +
			'You will be given a plan for a campaign as plannedCampaign and how the actual campaign unfolded during the play session as actualCampaign.\n' +
			'Then you must decide if the actualCampaign has deviated too much from plannedCampaign and create a nudge that gently guides the character back to follow the chapter plot.\n' +
			'Do not micro manage every single plot point but only take care that the overall chapter and campaign stay on track.\n' +
			'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.\n' +
			`{
				"currentChapter": Identify the most relevant chapterId in plannedCampaign that the story aligns with; Explain your reasoning briefly; Format "{Reasoning} - CHAPTER_ID: {chapterId}",
				"currentPlotPoint": Identify the most relevant plotId in plannedCampaign that the story aligns with; Explain your reasoning briefly; Format "{Reasoning} - PLOT_ID: {plotId}",
  			"nextPlotPoint": Identify the next plotId in plannedCampaign, must be greater than currentPlotPoint or null if there is no next plot point; Format: "Reasoning why story is currently at this plotId - PLOT_ID: {plotId}",
  			"deviationExplanation": is the currentChapter still on track; if not include reasons why the actualCampaign deviated from currentChapter,
				"deviation": integer 0 - 100 how much the actualCampaign deviated from currentChapter,
				"pacingExplanation": reasoning on how quickly the characters are proceeding through the currentChapter,
				"pacing": integer 0 - 100 value increases/decreases depending on how quickly the characters are proceeding through the currentChapter,
				#only include plotNudge object if deviation > 50, else null
				"plotNudge": {
					"nudgeExplanation": Explain why the characters are guided back to follow the currentChapter plot,
					"nudgeStory": Create an NPC or event that gently guides the character back to follow the currentChapter plot. It must fit to the last character action.
				}
			}`;

		const request: LLMRequest = {
			userMessage: 'Check if the actualCampaign is on course with the plannedCampaign.',
			historyMessages: [
				{
					role: 'user',
					content: 'plannedCampaign: ' + stringifyPretty(plannedCampaign)
				},
				{
					role: 'user',
					content: 'actualCampaign: ' + stringifyPretty(actionHistoryStoryOnly)
				}
			],
			systemInstruction: agent
		};
		return (await this.llm.generateContent(request))?.content as Campaign;
	}

	async generateSingleChapter(
		campaignState: Campaign,
		characterState: CharacterDescription,
		chapterNumberToGenerate: number,
		chapter: CampaignChapter
	): Promise<CampaignChapter> {
		const agentInstruction = [campaignMainAgent, plotPointNumberPrompt];
		if (chapter) {
			agentInstruction.push(
				'Important instruction! The new chapter must be based on the following: ' +
					stringifyPretty(chapter)
			);
		}
		agentInstruction.push(
			'The new chapter must fit within the other chapters, generate a chapter with chapterId: ' +
				chapterNumberToGenerate
		);
		agentInstruction.push(
			'CRITICAL: You MUST respond with ONLY valid JSON in the exact format specified below. Do not include any additional text, explanations, or formatting.\n' +
				chaptersPrompt
		);

		let userMessage = 'Generate the new chapter.';
		if (chapter) {
			userMessage +=
				' Important! The new chapter must be based on the following:\n' + stringifyPretty(chapter);
		}
		const request: LLMRequest = {
			userMessage,
			historyMessages: [
				{
					role: 'user',
					content: 'Description of the campaign: ' + stringifyPretty(campaignState)
				}
			],
			systemInstruction: agentInstruction
		};
		if (characterState?.name) {
			request.historyMessages?.push({
				role: 'user',
				content: 'Description of the character: ' + stringifyPretty(characterState)
			});
		}
		return (await this.llm.generateContent(request))?.content as CampaignChapter;
	}
}
