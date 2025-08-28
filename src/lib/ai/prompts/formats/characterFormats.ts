/**
 * Character description format template
 */
export const characterDescriptionJsonFormat = `{
    "name": "character name",
    "class": "character class",
    "race": "character race",
    "gender": "character gender",
    "appearance": "physical description",
    "alignment": "character alignment",
    "personality": "personality traits",
    "background": "character background",
    "motivation": "character motivation"
}`;

/**
 * Character description instructions
 */
export const characterDescriptionInstructions = [
    'CHARACTER DESCRIPTION RULES:',
    '- name: Unique, fitting name for the character',
    '- class: Character profession or role',
    '- race: Character species or ethnic background',
    '- gender: Character gender identity',
    '- appearance: Physical description including distinguishing features',
    '- alignment: Moral and ethical orientation',
    '- personality: Key personality traits and behavioral patterns',
    '- background: Character history and origins',
    '- motivation: Primary goals and driving forces',
    '',
    'Avoid clichés and create original, engaging characters that fit the story world.'
].join('\n');

/**
 * Legacy export for backward compatibility
 */
export const characterDescriptionForPrompt = characterDescriptionJsonFormat;
