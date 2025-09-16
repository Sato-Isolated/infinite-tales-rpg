/**
 * Modern XML-based Narrative Markup Parser
 * AST-based parser replacing fragile regex patterns
 */

import type { MarkupNode, ParseResult, MarkupTag, MarkupTagConfig, ParseError } from './types';

const MARKUP_CONFIG: Record<MarkupTag, MarkupTagConfig> = {
	speaker: {
		tag: 'speaker',
		hasContent: true,
		hasAttributes: true,
		selfClosing: false,
		allowedAttributes: ['name'],
		requiredAttributes: ['name'],
		validator: (node) => {
			const errors: ParseError[] = [];
			if (!node.attributes?.name?.trim()) {
				errors.push({
					message: 'Speaker tag requires name attribute',
					position: node.startIndex,
					severity: 'error',
					suggestion: 'Add name attribute: <speaker name="CharacterName">dialogue</speaker>'
				});
			}
			if (!node.content?.trim()) {
				errors.push({
					message: 'Speaker tag requires dialogue content',
					position: node.startIndex,
					severity: 'error'
				});
			}
			return errors;
		}
	},
	character: {
		tag: 'character',
		hasContent: true, // Permet du contenu pour les balises imbriquées
		hasAttributes: true,
		selfClosing: false, // Peut être non-self-closing pour le contenu
		allowedAttributes: ['name', 'id'],
		requiredAttributes: ['name'],
		validator: (node) => {
			if (!node.attributes?.name?.trim()) {
				return [{
					message: 'Character tag requires name attribute',
					position: node.startIndex,
					severity: 'error',
					suggestion: 'Add name attribute: <character name="CharacterName">content</character> or <character name="CharacterName" />'
				}];
			}
			return [];
		}
	},
	highlight: {
		tag: 'highlight',
		hasContent: true,
		hasAttributes: false,
		selfClosing: false,
		validator: (node) => {
			if (!node.content?.trim()) {
				return [{
					message: 'Highlight tag requires content',
					position: node.startIndex,
					severity: 'error'
				}];
			}
			return [];
		}
	},
	location: {
		tag: 'location',
		hasContent: true, // Permet du contenu pour les balises imbriquées
		hasAttributes: true,
		selfClosing: false, // Peut être non-self-closing pour le contenu
		allowedAttributes: ['name'],
		requiredAttributes: ['name'],
		validator: (node) => {
			if (!node.attributes?.name?.trim()) {
				return [{
					message: 'Location tag requires name attribute',
					position: node.startIndex,
					severity: 'error',
					suggestion: 'Add name attribute: <location name="PlaceName">content</location> or <location name="PlaceName" />'
				}];
			}
			return [];
		}
	},
	time: {
		tag: 'time',
		hasContent: true,
		hasAttributes: false,
		selfClosing: false,
		validator: (node) => {
			if (!node.content?.trim()) {
				return [{
					message: 'Time tag requires content',
					position: node.startIndex,
					severity: 'error'
				}];
			}
			return [];
		}
	},
	whisper: {
		tag: 'whisper',
		hasContent: true,
		hasAttributes: false,
		selfClosing: false,
		validator: (node) => {
			if (!node.content?.trim()) {
				return [{
					message: 'Whisper tag requires content',
					position: node.startIndex,
					severity: 'error'
				}];
			}
			return [];
		}
	},
	action: {
		tag: 'action',
		hasContent: true,
		hasAttributes: false,
		selfClosing: false,
		validator: (node) => {
			if (!node.content?.trim()) {
				return [{
					message: 'Action tag requires content',
					position: node.startIndex,
					severity: 'error'
				}];
			}
			return [];
		}
	},
	thought: {
		tag: 'thought',
		hasContent: true,
		hasAttributes: false,
		selfClosing: false,
		validator: (node) => {
			if (!node.content?.trim()) {
				return [{
					message: 'Thought tag requires content',
					position: node.startIndex,
					severity: 'error'
				}];
			}
			return [];
		}
	},
	break: {
		tag: 'break',
		hasContent: false,
		hasAttributes: false,
		selfClosing: true
	},
	'line-break': {
		tag: 'line-break',
		hasContent: false,
		hasAttributes: false,
		selfClosing: true,
		validator: () => {
			// Line breaks don't need special validation
			return [];
		}
	}
};

export class MarkupParser {
	private text: string = '';
	private position: number = 0;
	private nodes: MarkupNode[] = [];
	private errors: ParseError[] = [];
	private warnings: ParseError[] = [];

	parse(text: string): ParseResult {
		this.reset(text);
		
		while (this.position < this.text.length) {
			if (this.isTagStart()) {
				this.parseTag();
			} else {
				this.parseText();
			}
		}

		return {
			nodes: this.nodes,
			errors: this.errors,
			warnings: this.warnings
		};
	}

	private reset(text: string): void {
		this.text = text;
		this.position = 0;
		this.nodes = [];
		this.errors = [];
		this.warnings = [];
	}

	private isTagStart(): boolean {
		return this.peek() === '<' && this.peek(1) !== '/';
	}

	private parseTag(): void {
		const startPos = this.position;
		
		if (!this.consume('<')) {
			this.addError('Expected <', startPos);
			return;
		}

		const tagName = this.parseTagName();
		if (!tagName) {
			this.addError('Invalid tag name', startPos);
			this.skipToNext();
			return;
		}

		const config = MARKUP_CONFIG[tagName as MarkupTag];
		if (!config) {
			this.addError(`Unknown tag: ${tagName}`, startPos, `Available tags: ${Object.keys(MARKUP_CONFIG).join(', ')}`);
			this.skipToNext();
			return;
		}

		const attributes = this.parseAttributes(config);
		
		// Détection dynamique du type de balise
		const isSelfClosing = this.peek() === '/';
		
		if (isSelfClosing) {
			// Balise self-closing
			if (!this.consume('/') || !this.consume('>')) {
				this.addError('Self-closing tag must end with />', this.position);
				return;
			}
			
			const node: MarkupNode = {
				type: tagName,
				content: '',
				attributes,
				startIndex: startPos,
				endIndex: this.position
			};
			
			this.validateNode(node, config);
			this.nodes.push(node);
		} else {
			// Balise avec contenu
			if (!this.consume('>')) {
				this.addError('Expected >', this.position);
				return;
			}

			const contentResult = this.parseContent(tagName);
			const endPos = this.position;

			const node: MarkupNode = {
				type: tagName,
				content: contentResult.content,
				attributes,
				children: contentResult.children.length > 0 ? contentResult.children : undefined,
				startIndex: startPos,
				endIndex: endPos
			};

			this.validateNode(node, config);
			this.nodes.push(node);
		}
	}

	private parseTagName(): string {
		let name = '';
		while (this.position < this.text.length && /[a-zA-Z_-]/.test(this.peek())) {
			name += this.consume();
		}
		return name;
	}

	private parseAttributes(config: MarkupTagConfig): Record<string, string> {
		const attributes: Record<string, string> = {};

		while (this.position < this.text.length && this.peek() !== '>' && this.peek() !== '/') {
			this.skipWhitespace();
			
			if (this.peek() === '>' || this.peek() === '/') break;
			
			const attrName = this.parseAttributeName();
			if (!attrName) break;

			if (config.allowedAttributes && !config.allowedAttributes.includes(attrName)) {
				this.addWarning(`Attribute '${attrName}' not allowed on <${config.tag}>`, this.position, 
					`Allowed attributes: ${config.allowedAttributes.join(', ')}`);
			}

			this.skipWhitespace();
			if (!this.consume('=')) {
				this.addError('Expected = after attribute name', this.position);
				break;
			}

			this.skipWhitespace();
			const attrValue = this.parseAttributeValue();
			attributes[attrName] = attrValue;
		}

		// Check required attributes
		if (config.requiredAttributes) {
			for (const required of config.requiredAttributes) {
				if (!attributes[required]) {
					this.addError(`Missing required attribute '${required}' on <${config.tag}>`, this.position);
				}
			}
		}

		return attributes;
	}

	private parseAttributeName(): string {
		let name = '';
		while (this.position < this.text.length && /[a-zA-Z_]/.test(this.peek())) {
			name += this.consume();
		}
		return name;
	}

	private parseAttributeValue(): string {
		if (this.peek() === '"') {
			return this.parseQuotedString();
		}
		
		let value = '';
		while (this.position < this.text.length && !/[\s>\/]/.test(this.peek())) {
			value += this.consume();
		}
		return value;
	}

	private parseQuotedString(): string {
		if (!this.consume('"')) return '';
		
		let value = '';
		while (this.position < this.text.length && this.peek() !== '"') {
			if (this.peek() === '\\') {
				this.consume(); // Skip escape
				if (this.position < this.text.length) {
					value += this.consume();
				}
			} else {
				value += this.consume();
			}
		}
		
		this.consume('"'); // Closing quote
		return value;
	}

	private parseContent(tagName: string): { content: string; children: MarkupNode[] } {
		const startPos = this.position;
		const children: MarkupNode[] = [];
		let textContent = '';

		while (this.position < this.text.length) {
			if (this.isClosingTag(tagName)) {
				// Add any remaining text as a text node
				if (textContent.trim()) {
					children.push({
						type: 'text',
						content: textContent.trim(),
						startIndex: this.position - textContent.length,
						endIndex: this.position
					});
				}
				this.skipClosingTag(tagName);
				break;
			} else if (this.peek() === '<' && this.peek(1) !== '/') {
				// This is a nested opening tag
				// Add any accumulated text before this tag
				if (textContent.trim()) {
					children.push({
						type: 'text',
						content: textContent.trim(),
						startIndex: this.position - textContent.length,
						endIndex: this.position
					});
					textContent = '';
				}
				
				// Parse the nested tag
				this.parseTag();
				
				// The parseTag() method adds to this.nodes, so we take the last one
				if (this.nodes.length > 0) {
					const nestedNode = this.nodes.pop(); // Remove from main nodes list
					if (nestedNode) {
						children.push(nestedNode);
					}
				}
			} else {
				textContent += this.consume();
			}
		}

		// Check if we exited because we reached end of text (error case)
		if (this.position >= this.text.length) {
			// Only report error if we haven't found the closing tag
			let foundClosing = false;
			const currentPos = this.position;
			
			// Quick scan backwards to see if we consumed the closing tag
			for (let i = Math.max(0, currentPos - 20); i <= currentPos; i++) {
				if (this.text.substr(i, tagName.length + 3) === `</${tagName}>`) {
					foundClosing = true;
					break;
				}
			}
			
			if (!foundClosing) {
				this.addError(`Unclosed tag: ${tagName}`, startPos, `Add closing tag: </${tagName}>`);
			}
		}

		// Combine text content from children for backward compatibility
		const combinedContent = children
			.map(child => {
				if (child.type === 'text') {
					return child.content;
				} else {
					// For other tags, represent them in a consistent way
					return child.attributes ? 
						`<${child.type}${Object.entries(child.attributes).map(([k, v]) => ` ${k}="${v}"`).join('')} />` :
						`<${child.type} />`;
				}
			})
			.join('')
			.trim();

		return { content: combinedContent, children };
	}

	private parseText(): void {
		const startPos = this.position;
		let content = '';

		while (this.position < this.text.length && !this.isTagStart()) {
			content += this.consume();
		}

		if (content.trim()) {
			this.nodes.push({
				type: 'text',
				content: content.trim(),
				startIndex: startPos,
				endIndex: this.position
			});
		}
	}

	// Helper methods
	private peek(offset: number = 0): string {
		return this.text[this.position + offset] || '';
	}

	private consume(expected?: string): string {
		const char = this.text[this.position] || '';
		if (expected && char !== expected) {
			return '';
		}
		this.position++;
		return char;
	}

	private skipWhitespace(): void {
		while (this.position < this.text.length && /\s/.test(this.peek())) {
			this.position++;
		}
	}

	private isClosingTag(tagName: string): boolean {
		return this.text.substr(this.position, tagName.length + 3) === `</${tagName}>`;
	}

	private skipClosingTag(tagName: string): void {
		this.position += tagName.length + 3; // Skip </{tagName}>
	}

	private skipToNext(): void {
		while (this.position < this.text.length && this.peek() !== '<') {
			this.position++;
		}
	}

	private validateNode(node: MarkupNode, config: MarkupTagConfig): void {
		if (config.validator) {
			const errors = config.validator(node);
			this.errors.push(...errors);
		}
	}

	private addError(message: string, position: number, suggestion?: string): void {
		this.errors.push({ message, position, severity: 'error', suggestion });
	}

	private addWarning(message: string, position: number, suggestion?: string): void {
		this.warnings.push({ message, position, severity: 'warning', suggestion });
	}
}

export { MARKUP_CONFIG };