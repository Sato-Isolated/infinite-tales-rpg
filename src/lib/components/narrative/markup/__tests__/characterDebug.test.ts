import { describe, it, expect } from 'vitest';
import { MarkupParser } from '../parser';

describe('Character Debug - Empty Display Issue', () => {
  it('should debug why character tags are showing empty', () => {
    const parser = new MarkupParser();
    
    console.log('=== DEBUG CHARACTER VIDE ===');
    
    // Test 1: Character self-closing
    const selfClosing = `<character name="Bob" />`;
    console.log('\n1. Self-closing character:');
    console.log('Input:', selfClosing);
    
    const result1 = parser.parse(selfClosing);
    const charNode1 = result1.nodes[0];
    
    console.log('Node type:', charNode1.type);
    console.log('Node content:', JSON.stringify(charNode1.content));
    console.log('Node attributes:', JSON.stringify(charNode1.attributes));
    console.log('Node children:', charNode1.children ? charNode1.children.length : 'undefined');
    console.log('Character name from attributes:', charNode1.attributes?.name);
    
    // Test 2: Character avec contenu
    const withContent = `<character name="Alice">Alice</character>`;
    console.log('\n2. Character avec contenu:');
    console.log('Input:', withContent);
    
    const result2 = parser.parse(withContent);
    const charNode2 = result2.nodes[0];
    
    console.log('Node type:', charNode2.type);
    console.log('Node content:', JSON.stringify(charNode2.content));
    console.log('Node attributes:', JSON.stringify(charNode2.attributes));
    console.log('Node children:', charNode2.children ? charNode2.children.length : 'undefined');
    if (charNode2.children) {
      console.log('Children details:', charNode2.children.map(c => ({ type: c.type, content: c.content })));
    }
    
    // Test 3: Character dans speaker
    const inSpeaker = `<speaker name="Test">Hello <character name="Charlie" /> and <character name="Diana">Diana</character>!</speaker>`;
    console.log('\n3. Character dans speaker:');
    console.log('Input:', inSpeaker);
    
    const result3 = parser.parse(inSpeaker);
    const speakerNode = result3.nodes[0];
    
    console.log('Speaker children count:', speakerNode.children?.length);
    if (speakerNode.children) {
      speakerNode.children.forEach((child, index) => {
        if (child.type === 'character') {
          console.log(`Character [${index}]:`, {
            type: child.type,
            content: child.content,
            attributes: child.attributes,
            hasChildren: child.children ? child.children.length : 'none'
          });
        }
      });
    }
    
    // Validations
    expect(result1.errors.length).toBe(0);
    expect(result2.errors.length).toBe(0);
    expect(result3.errors.length).toBe(0);
  });
});