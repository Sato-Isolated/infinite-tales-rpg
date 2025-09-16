/**
 * Modern Narrative Markup System - Type Definitions
 * XML-based unified markup system with strong TypeScript validation
 */

export interface MarkupNode {
	type: string;
	content: string;
	attributes?: Record<string, string>;
	children?: MarkupNode[];
	startIndex: number;
	endIndex: number;
}

export interface ParseResult {
	nodes: MarkupNode[];
	errors: ParseError[];
	warnings: ParseError[];
}

export interface ParseError {
	message: string;
	position: number;
	severity: 'error' | 'warning';
	suggestion?: string;
}

export type MarkupTag = 
	| 'speaker'
	| 'character' 
	| 'highlight'
	| 'location'
	| 'time'
	| 'whisper'
	| 'action'
	| 'thought'
	| 'break'
	| 'line-break';

export interface MarkupTagConfig {
	tag: MarkupTag;
	hasContent: boolean;
	hasAttributes: boolean;
	selfClosing: boolean;
	allowedAttributes?: string[];
	requiredAttributes?: string[];
	validator?: (node: MarkupNode) => ParseError[];
}

export interface NarrativeRendererProps {
	content: string;
	showErrors?: boolean;
	onParseError?: (errors: ParseResult['errors']) => void;
}

export interface MarkupComponentProps {
	node: MarkupNode;
}