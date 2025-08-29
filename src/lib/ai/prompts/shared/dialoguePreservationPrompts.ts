/**
 * Dialogue Preservation Prompts
 * Specialized prompts for preserving user dialogue fidelity vs allowing creative interpretation
 * Based on advanced prompt engineering principles for LLM fidelity control
 */

/**
 * Core prompt for distinguishing actions from dialogue - critical for proper formatting
 */
export const ACTION_DIALOGUE_DISTINCTION_PROMPT = `
🎭 CRITICAL: ACTION vs DIALOGUE CLASSIFICATION GUIDE

BEFORE PROCESSING ANY USER INPUT, DETERMINE THE TYPE:

📋 CLASSIFICATION CRITERIA:

1. 🗣️ SPOKEN DIALOGUE (Use dialogue formatting):
   ✅ Speech verbs: "Je dis", "Je réponds", "Je crie", "Je murmure", "Je chuchote"
   ✅ Direct quotes: "Bonjour", "Je ne sais pas", "Attendez!"
   ✅ Dialogue tags: "dit-il", "répond-elle"
   ✅ Communication intent: "J'explique que...", "Je lui demande si..."

2. 🎬 PHYSICAL ACTIONS (Use action description formatting):
   ✅ Body movements: "je bouge", "j'avance", "je recule", "mes mains tremblent"
   ✅ Physical changes: "mes pupilles se fendis", "mon aura s'intensifie", "mes cheveux volent"
   ✅ Magical effects: "je lance un sort", "ma magie s'active", "l'énergie circule"
   ✅ Emotional states: "je deviens nerveux", "ma colère monte", "je me calme"
   ✅ Mental processes: "je réfléchis", "je me concentre", "j'analyse la situation"
   ✅ Preparations: "je me prépare à", "je cherche", "j'observe"

3. 🔍 MIXED ACTIONS (Separate into components):
   - "J'avance et je dis bonjour" → Action description + Dialogue
   - "Je souris en répondant oui" → Action description + Dialogue
   - "Je lève la main pour parler" → Action description (preparation) + Dialogue (if speech follows)

⚠️ COMMON MISTAKES TO AVOID:
❌ NEVER format physical actions as spoken dialogue
❌ NEVER put action descriptions in dialogue boxes
❌ NEVER assume simple actions are spoken words
❌ NEVER interpret "je fais X" as "je dis 'je fais X'"

✅ CORRECT EXAMPLE PROCESSING:
User: "mes pupilles se fendis tel un prédateur et mon aura s'intensifia"
Classification: PHYSICAL ACTION (body change + magical effect)
Formatting: Action description with border-info styling

User: "Je lui dis 'Attention, danger!'"  
Classification: SPOKEN DIALOGUE (speech verb + quoted words)
Formatting: Dialogue with border-primary styling

This classification step is MANDATORY before applying any fidelity rules.
`;

/**
 * Core prompt for exact dialogue preservation
 * Based on research: "preserve user input exact wording LLM prompting techniques"
 */
export const EXACT_DIALOGUE_PRESERVATION_PROMPT = `
🎯 DIALOGUE PRESERVATION MODE: EXACT FIDELITY

CRITICAL INSTRUCTION: The user has specified dialogue that must be preserved EXACTLY as written.

🎭 FIRST: IDENTIFY ACTION vs DIALOGUE TYPE
1. 🗣️ ACTUAL SPOKEN DIALOGUE:
   - Contains speech verbs: "Je dis", "Je réponds", "Je crie"
   - Has quotation marks or dialogue indicators
   - Represents words the character speaks aloud
   → FORMAT AS DIALOGUE with speaker name

2. 🎬 PHYSICAL/MENTAL ACTIONS:
   - Physical movements, changes, transformations
   - Mental states, thoughts, internal processes  
   - Magical/supernatural effects
   - Descriptions of what character DOES (not says)
   → FORMAT AS ACTION DESCRIPTION (never as spoken dialogue)

PRESERVATION RULES:
1. 📝 EXACT WORD PRESERVATION:
   - Use the user's EXACT words without paraphrasing
   - Maintain the user's original tone, style, and word choice
   - Preserve grammar, sentence structure, and linguistic style
   - Do not "improve" or "correct" the user's language

2. 🚫 FORBIDDEN MODIFICATIONS:
   - NO paraphrasing or synonym substitution
   - NO emotional embellishment unless explicitly stated
   - NO expanding brief statements into lengthy speeches
   - NO adding personality traits not mentioned by user
   - NO interpreting simple statements as complex emotions
   - NO formatting physical actions as spoken dialogue

3. ✅ PERMITTED ADDITIONS:
   - HTML/DaisyUI formatting for proper display (action vs dialogue)
   - Narrative context around the dialogue (setting, NPC reactions)
   - Game mechanics applications (dice rolls, consequences)
   - Environmental descriptions and atmosphere

4. 🎭 FORMATTING RULES:
   - SPOKEN DIALOGUE: Use dialogue formatting with speaker name
   - PHYSICAL ACTIONS: Use action description formatting
   - Ensure the exact words feel natural within the game world

EXAMPLE TRANSFORMATIONS:

🎬 PHYSICAL ACTION:
User Input: "mes pupilles se fendis tel un prédateur et mon aura s'intensifia"
✅ CORRECT (Action Description):
<div class="border-l-3 border-info pl-3 py-1 mb-2 bg-info/5">
<span class="font-semibold text-info">*Mes pupilles se fendis tel un prédateur et mon aura s'intensifia*</span>
</div>

❌ INCORRECT (Dialogue Format):
CHARACTER: 'mes pupilles se fendis tel un prédateur et mon aura s'intensifia'

🗣️ SPOKEN DIALOGUE:
User Input: Je dis "Non, je ne peux pas."
✅ CORRECT PRESERVATION:
<div class="border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg">
<strong class="text-primary text-sm uppercase tracking-wide">CHARACTER NAME:</strong> 
<em class="text-primary font-medium">"Non, je ne peux pas."</em>
</div>

❌ INCORRECT (Over-interpretation):
Character hesitates, their voice trembling with uncertainty...

REMEMBER: The user's exact words are sacred - preserve them with absolute fidelity AND correct formatting type.
`;

/**
 * Prompt for essence preservation - balanced approach between exact preservation and creative interpretation
 * This preserves the core meaning and style while allowing minor adjustments for narrative flow
 */
export const PRESERVE_ESSENCE_DIALOGUE_PROMPT = `
⚖️ DIALOGUE PRESERVATION MODE: ESSENCE FIDELITY

BALANCED APPROACH: Preserve the core meaning, intention, and style while allowing minor adjustments for narrative flow.

🎭 CRITICAL: ACTION vs DIALOGUE CLASSIFICATION
BEFORE PROCESSING, IDENTIFY THE INPUT TYPE:

1. 🗣️ SPOKEN DIALOGUE INDICATORS:
   - Direct quotes: "Je dis...", "Elle répond...", "Je crie..."
   - Speech verbs: parler, dire, crier, chuchoter, murmurer
   - Explicit dialogue markers or quotation marks
   → FORMAT AS DIALOGUE with speaker name

2. 🎬 PHYSICAL/MENTAL ACTION INDICATORS:
   - Physical movements: "mes pupilles se fendis", "je bouge", "j'avance"
   - Mental states: "je pense", "je réfléchis", "je me concentre"
   - Magical/supernatural effects: "mon aura s'intensifia", "je lance un sort"
   - Emotional/internal changes: "je deviens nerveux", "ma colère monte"
   → FORMAT AS ACTION DESCRIPTION (not dialogue)

3. 🎯 MIXED ACTIONS:
   - Action + spoken words → Separate into action description + dialogue
   - Example: "Je m'approche et dit bonjour" → Action description + dialogue formatting

ESSENCE PRESERVATION RULES:
1. 🎯 CORE MEANING PRESERVATION:
   - Maintain the user's exact intention and message
   - Preserve the emotional tone and attitude
   - Keep the same level of formality/informality
   - Honor the character's agency and decision

2. 🎨 PERMITTED ADJUSTMENTS:
   - Minor grammatical improvements for flow
   - Natural dialogue formatting and punctuation (ONLY for actual speech)
   - Adding connecting words for narrative coherence
   - Adjusting sentence structure slightly for readability

3. 🚫 FORBIDDEN TRANSFORMATIONS:
   - DO NOT format physical actions as spoken dialogue
   - DO NOT change the core meaning or intention
   - DO NOT add emotions not implied in the original
   - DO NOT expand simple statements into complex speeches  
   - DO NOT completely rewrite the user's phrasing
   - DO NOT add dramatic interpretations not present

4. ✅ ENHANCEMENT GUIDELINES:
   - Make minimal adjustments for narrative flow
   - Use correct formatting for action vs dialogue
   - Include natural reactions from NPCs
   - Ensure the essence feels authentic to the character

EXAMPLE TRANSFORMATIONS:

🎬 PHYSICAL ACTION INPUT:
User: "mes pupilles se fendis tel un prédateur et mon aura s'intensifia"
✅ CORRECT (Action Description):
<div class="border-l-3 border-info pl-3 py-1 mb-2 bg-info/5">
<span class="font-semibold text-info">*Ses pupilles se fendent tel un prédateur et son aura s'intensifie*</span>
</div>

❌ INCORRECT (Dialogue Format):
<div class="border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg">
<strong class="text-primary text-sm uppercase tracking-wide">CHARACTER:</strong> 
<em class="text-primary font-medium">'mes pupilles se fendis tel un prédateur'</em>
</div>

🗣️ DIALOGUE INPUT:
User: "Je dis 'Attendez-moi ici'"
✅ CORRECT (Dialogue Format):
<div class="border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg">
<strong class="text-primary text-sm uppercase tracking-wide">CHARACTER:</strong> 
<em class="text-primary font-medium">'Attendez-moi ici'</em>
</div>

PRINCIPLE: Honor the user's voice AND format type while ensuring natural narrative integration.
`;

/**
 * Prompt for creative dialogue interpretation
 */
export const CREATIVE_DIALOGUE_INTERPRETATION_PROMPT = `
🎨 DIALOGUE INTERPRETATION MODE: CREATIVE EXPANSION

CREATIVE FREEDOM: The user is open to creative interpretation and expansion of their dialogue intent.

EXPANSION GUIDELINES:
1. 🎭 CHARACTER VOICE DEVELOPMENT:
   - Enhance dialogue with character-appropriate personality
   - Add emotional subtext and motivational depth
   - Include speech patterns, accents, or verbal tics
   - Expand on the core intention with character flavor

2. ✨ NARRATIVE ENHANCEMENT:
   - Transform simple statements into dramatic moments
   - Add internal thoughts and emotional context
   - Include physical actions and body language
   - Create atmosphere through expanded dialogue

3. 🎪 CREATIVE TECHNIQUES:
   - Use subtext and implied meanings
   - Add dramatic tension or comedic timing
   - Include character growth moments
   - Create memorable, quotable dialogue

4. ⚖️ CREATIVE BOUNDARIES:
   - Stay true to the user's core intention
   - Maintain character consistency
   - Respect established relationships and history
   - Keep expansions relevant to the scene

EXAMPLE TRANSFORMATION:
User Input: "Je vais convaincre le garde."
✅ CREATIVE EXPANSION:
Character straightens their shoulders, adopting a confident posture as they approach the guard. With practiced charm and a disarming smile:
<div class="border-l-4 border-primary pl-4 py-2 mb-3 bg-base-200/30 rounded-r-lg">
<strong class="text-primary text-sm uppercase tracking-wide">CHARACTER NAME:</strong> 
<em class="text-primary font-medium">"Listen, friend, I think we can help each other here. What would it take to make this work for both of us?"</em>
</div>

BALANCE: Be creative while honoring the user's fundamental intent and character agency.
`;

/**
 * Dynamic fidelity prompt based on analysis
 */
export const generateDynamicFidelityPrompt = (
   fidelityLevel: 'preserve_exact' | 'preserve_essence' | 'allow_creative',
   detectedPatterns: string[],
   originalText: string,
   reasoning: string
): string => {
   let basePrompt: string;
   let processingInstructions: string;

   switch (fidelityLevel) {
      case 'preserve_exact':
         basePrompt = EXACT_DIALOGUE_PRESERVATION_PROMPT;
         processingInstructions = 'CRITICAL: This text contains elements requiring exact preservation. Honor the user\'s precise wording.';
         break;
      case 'preserve_essence':
         basePrompt = PRESERVE_ESSENCE_DIALOGUE_PROMPT;
         processingInstructions = 'BALANCED: Preserve the core meaning and style while allowing minor adjustments for narrative flow.';
         break;
      case 'allow_creative':
         basePrompt = CREATIVE_DIALOGUE_INTERPRETATION_PROMPT;
         processingInstructions = 'CREATIVE OPPORTUNITY: This text invites interpretation and expansion. Use your narrative skills to enhance the user\'s intent.';
         break;
      default:
         basePrompt = PRESERVE_ESSENCE_DIALOGUE_PROMPT; // Default to essence preservation
         processingInstructions = 'DEFAULT: Preserving essence with minor adjustments for narrative flow.';
   }

   return `${basePrompt}

📊 FIDELITY ANALYSIS RESULTS:
- Detected Fidelity Level: ${fidelityLevel.toUpperCase()}
- Analysis Reasoning: ${reasoning}
- Detected Patterns: ${detectedPatterns.join(', ') || 'None'}

🎯 ORIGINAL USER INPUT TO PROCESS:
"${originalText}"

${processingInstructions}
`;
};

/**
 * Anti-transformation prompt for preventing over-interpretation
 */
export const ANTI_TRANSFORMATION_PROMPT = `
🛡️ ANTI-TRANSFORMATION SAFEGUARDS

BEFORE GENERATING DIALOGUE, ASK:
1. "Am I changing the user's actual words?"
2. "Am I adding emotions not explicitly mentioned?"
3. "Am I expanding beyond what the user intended?"
4. "Would the user recognize their input in my output?"

RED FLAGS - STOP IF YOU'RE DOING THIS:
❌ Turning "Oui" into "Yes, absolutely, I completely agree with that assessment"
❌ Turning "Je dis bonjour" into "Character warmly greets everyone with a radiant smile"
❌ Adding psychological motivations not mentioned by user
❌ Interpreting simple actions as complex emotional states

SAFE ZONE - THESE ARE ACCEPTABLE:
✅ Adding proper formatting and HTML styling
✅ Including NPC reactions to the preserved dialogue
✅ Describing environmental context around the dialogue
✅ Applying game mechanics and consequences

PRINCIPLE: When in doubt, preserve rather than transform.
`;

/**
 * Fidelity mode instructions for system prompts
 */
export const FIDELITY_SYSTEM_INSTRUCTION = `
DIALOGUE FIDELITY SYSTEM:
This system includes advanced dialogue fidelity detection. When fidelity preservation instructions are provided in the user's message, follow them precisely. The system will indicate:

- PRESERVE EXACT: Honor user's exact words with minimal interpretation
- ALLOW CREATIVE: User permits creative expansion and interpretation
- Analysis reasoning and detected patterns will be provided

Always respect the fidelity level specified in the user's message.
`;

/**
 * Quick reference for different dialogue types
 */
export const DIALOGUE_TYPE_EXAMPLES = `
DIALOGUE TYPE REFERENCE:

1. QUOTED DIALOGUE → PRESERVE EXACT
   Input: Je dis "Non merci"
   Output: Character says exactly "Non merci"

2. FIRST-PERSON DIALOGUE → PRESERVE EXACT  
   Input: Je réponds que c'est une bonne idée
   Output: Character responds that it's a good idea

3. ACTION WITH INTENT → ALLOW CREATIVE
   Input: Je tente de persuader le marchand
   Output: Creative interpretation of persuasion attempt

4. COMPLEX EMOTIONAL ACTION → ALLOW CREATIVE
   Input: J'essaie de cacher ma nervosité en souriant
   Output: Enhanced description with emotional context

5. EXPLICIT CREATIVE REQUEST → ALLOW CREATIVE
   Input: J'improvise une réponse intelligente
   Output: Creative dialogue crafted by AI

Remember: Default to preservation when uncertain about user intent.
`;

/**
 * Integration instructions for game agents
 */
export const GAME_AGENT_FIDELITY_INTEGRATION = `
🔗 GAME AGENT FIDELITY INTEGRATION

WHEN FIDELITY INSTRUCTIONS ARE PRESENT:
1. Read the fidelity analysis provided in the user message
2. Apply the specified preservation or creative mode
3. Follow the dynamic fidelity prompt guidelines
4. Include the preserved/interpreted dialogue in your story response
5. Continue with normal game progression around the dialogue

WORKFLOW:
User Action → Fidelity Analysis → Apply Mode → Generate Story → Continue Game

QUALITY CHECK:
- Does the dialogue match the specified fidelity level?
- Are exact preservation rules followed when required?
- Is creative interpretation appropriate when allowed?
- Does the result serve the user's gameplay intent?

This system enhances user agency while maintaining narrative quality.
`;
