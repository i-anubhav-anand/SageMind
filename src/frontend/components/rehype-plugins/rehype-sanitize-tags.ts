/**
 * A rehype plugin to sanitize specific HTML tags that might cause React rendering issues.
 * Specifically targets <think> tags that would otherwise be interpreted as React components.
 */
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

interface ElementNode extends Node {
  type: 'element';
  tagName: string;
  properties: Record<string, any>;
  children: Node[];
  value?: string;
}

interface TextNode extends Node {
  type: 'text';
  value: string;
}

function isTextNode(node: Node): node is TextNode {
  return node.type === 'text';
}

function isElementNode(node: Node): node is ElementNode {
  return node.type === 'element';
}

/**
 * Removes or encodes problematic tags like <think> that React tries to render as components
 */
export function rehypeSanitizeTags() {
  return (tree: Node) => {
    // Step 1: Find and sanitize any literal <think> tags in text nodes
    visit(tree, 'text', (node: TextNode) => {
      const thinkTagRegex = /<\/?think[^>]*>|<\/?Think[^>]*>/g;
      if (thinkTagRegex.test(node.value)) {
        node.value = node.value
          .replace(/<think/gi, '&lt;think')
          .replace(/<\/think/gi, '&lt;/think')
          .replace(/<Think/gi, '&lt;Think')
          .replace(/<\/Think/gi, '&lt;/Think');
      }
    });

    // Step 2: Find and handle any think elements that made it through as actual elements
    visit(tree, 'element', (node: ElementNode) => {
      if (node.tagName.toLowerCase() === 'think') {
        // Convert to text node with encoded tags
        const content = getNodeContent(node);
        const replacement: TextNode = {
          type: 'text',
          value: `&lt;think&gt;${content}&lt;/think&gt;`,
        };
        
        // Replace the node
        Object.assign(node, replacement);
      }
    });
  };
}

// Helper to extract text content from a node and its children
function getNodeContent(node: ElementNode): string {
  let content = '';
  
  if (node.children) {
    for (const child of node.children) {
      if (isTextNode(child)) {
        content += child.value;
      } else if (isElementNode(child)) {
        content += getNodeContent(child);
      }
    }
  }
  
  return content;
} 