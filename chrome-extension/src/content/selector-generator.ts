import {
  SelectorResult,
  SelectorStrategy,
  AlternativeSelector,
  DEFAULT_SETTINGS
} from '../types';

// Framework-generated class patterns to exclude
const EXCLUDED_CLASS_PATTERNS = DEFAULT_SETTINGS.excludedClassPatterns.map(
  pattern => new RegExp(`^${pattern.replace('*', '.*')}$`)
);

export class SelectorGenerator {
  private excludedPatterns: RegExp[];

  constructor(excludedPatterns: string[] = DEFAULT_SETTINGS.excludedClassPatterns) {
    this.excludedPatterns = excludedPatterns.map(
      pattern => new RegExp(`^${pattern.replace('*', '.*')}$`)
    );
  }

  generate(element: Element): SelectorResult {
    const strategies: Array<{
      strategy: SelectorStrategy;
      generator: (el: Element) => string | null;
      confidence: number;
    }> = [
      { strategy: 'data-testid', generator: this.getDataTestId, confidence: 100 },
      { strategy: 'data-cy', generator: this.getDataCy, confidence: 100 },
      { strategy: 'data-test', generator: this.getDataTest, confidence: 100 },
      { strategy: 'aria-label', generator: this.getAriaLabel, confidence: 95 },
      { strategy: 'role', generator: this.getRoleWithName, confidence: 90 },
      { strategy: 'id', generator: this.getUniqueId, confidence: 85 },
      { strategy: 'text', generator: this.getTextSelector, confidence: 80 },
      { strategy: 'class', generator: this.getStableClassSelector, confidence: 60 },
      { strategy: 'css-path', generator: this.getCssPath, confidence: 40 }
    ];

    let bestResult: SelectorResult | null = null;
    const alternatives: AlternativeSelector[] = [];

    for (const { strategy, generator, confidence } of strategies) {
      const selector = generator.call(this, element);

      if (selector && this.isUnique(selector)) {
        const result: AlternativeSelector = {
          selector,
          strategy,
          confidence
        };

        if (!bestResult) {
          bestResult = {
            selector,
            strategy,
            confidence,
            isUnique: true,
            alternatives: []
          };
        } else {
          alternatives.push(result);
        }
      }
    }

    // Fallback to CSS path if nothing else works
    if (!bestResult) {
      const cssPath = this.getCssPath(element) || this.buildFallbackPath(element);
      bestResult = {
        selector: cssPath,
        strategy: 'css-path',
        confidence: 30,
        isUnique: this.isUnique(cssPath),
        alternatives: []
      };
    }

    bestResult.alternatives = alternatives.slice(0, 5);
    return bestResult;
  }

  private getDataTestId(element: Element): string | null {
    const value = element.getAttribute('data-testid');
    return value ? `[data-testid="${value}"]` : null;
  }

  private getDataCy(element: Element): string | null {
    const value = element.getAttribute('data-cy');
    return value ? `[data-cy="${value}"]` : null;
  }

  private getDataTest(element: Element): string | null {
    const value = element.getAttribute('data-test');
    return value ? `[data-test="${value}"]` : null;
  }

  private getAriaLabel(element: Element): string | null {
    const label = element.getAttribute('aria-label');
    if (!label) return null;

    // Escape special characters in attribute value
    const escaped = this.escapeAttributeValue(label);
    return `[aria-label="${escaped}"]`;
  }

  private getRoleWithName(element: Element): string | null {
    const role = element.getAttribute('role') || this.getImplicitRole(element);
    if (!role) return null;

    // Try to find accessible name
    const name = this.getAccessibleName(element);
    if (name) {
      const escaped = this.escapeAttributeValue(name);
      // Check if role + name combination is unique
      const selector = `[role="${role}"][aria-label="${escaped}"]`;
      if (this.isUnique(selector)) return selector;

      // Try with text content
      const textSelector = this.buildRoleTextSelector(role, name);
      if (textSelector && this.isUnique(textSelector)) return textSelector;

      // Role + text not unique - try adding distinguishing class
      const classes = Array.from(element.classList);
      const stableClasses = classes.filter(cls => !this.isFrameworkClass(cls));

      // Sort by specificity
      const sortedClasses = [...stableClasses].sort((a, b) => {
        const aHasModifier = a.includes('-');
        const bHasModifier = b.includes('-');
        if (aHasModifier && !bHasModifier) return -1;
        if (!aHasModifier && bHasModifier) return 1;
        return b.length - a.length;
      });

      const escapedText = this.escapeTextForContains(name.substring(0, 30));
      for (const cls of sortedClasses) {
        const selectorWithClass = `[role="${role}"].${CSS.escape(cls)}:contains("${escapedText}")`;
        if (this.isUnique(selectorWithClass)) return selectorWithClass;
      }

      // Try just role + class (without text)
      for (const cls of sortedClasses) {
        const selectorWithClass = `[role="${role}"].${CSS.escape(cls)}`;
        if (this.isUnique(selectorWithClass)) return selectorWithClass;
      }
    }

    // Role alone might work for some elements
    const roleOnlySelector = `[role="${role}"]`;
    if (this.isUnique(roleOnlySelector)) return roleOnlySelector;

    return null;
  }

  private getUniqueId(element: Element): string | null {
    const id = element.id;
    if (!id) return null;

    // Skip dynamic/generated IDs
    if (this.isDynamicId(id)) return null;

    const selector = `#${CSS.escape(id)}`;
    return this.isUnique(selector) ? selector : null;
  }

  private getTextSelector(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();

    // Only use text content for interactive elements
    if (!['button', 'a', 'label', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      return null;
    }

    const text = this.getDirectTextContent(element);
    if (!text || text.length > 50) return null;

    // Use Cypress contains for text matching
    const escaped = this.escapeTextForContains(text);
    const textOnlySelector = `${tagName}:contains("${escaped}")`;

    // If text-only selector is unique, use it
    if (this.isUnique(textOnlySelector)) {
      return textOnlySelector;
    }

    // Text isn't unique - try combining with distinguishing classes
    const classes = Array.from(element.classList);
    const stableClasses = classes.filter(cls => !this.isFrameworkClass(cls));

    // Sort by specificity (classes with modifiers like btn-primary are more specific)
    const sortedClasses = [...stableClasses].sort((a, b) => {
      const aHasModifier = a.includes('-');
      const bHasModifier = b.includes('-');
      if (aHasModifier && !bHasModifier) return -1;
      if (!aHasModifier && bHasModifier) return 1;
      return b.length - a.length;
    });

    // Try combining text with a distinguishing class
    for (const cls of sortedClasses) {
      const selector = `${tagName}.${CSS.escape(cls)}:contains("${escaped}")`;
      if (this.isUnique(selector)) {
        return selector;
      }
    }

    return null;
  }

  private getStableClassSelector(element: Element): string | null {
    const classes = Array.from(element.classList);
    if (classes.length === 0) return null;

    // Filter out framework-generated classes
    const stableClasses = classes.filter(cls => !this.isFrameworkClass(cls));
    if (stableClasses.length === 0) return null;

    const tagName = element.tagName.toLowerCase();

    // Sort classes to prioritize more specific/distinguishing ones
    // Classes with modifiers (containing -) are often more specific (e.g., btn-primary vs btn)
    const sortedClasses = [...stableClasses].sort((a, b) => {
      const aHasModifier = a.includes('-') && !a.startsWith('ng-') && !a.startsWith('sc-');
      const bHasModifier = b.includes('-') && !b.startsWith('ng-') && !b.startsWith('sc-');
      if (aHasModifier && !bHasModifier) return -1;
      if (!aHasModifier && bHasModifier) return 1;
      // Prefer longer class names (usually more specific)
      return b.length - a.length;
    });

    // Try single stable class (prioritizing distinguishing ones)
    for (const cls of sortedClasses) {
      const selector = `${tagName}.${CSS.escape(cls)}`;
      if (this.isUnique(selector)) return selector;
    }

    // Try combination of stable classes
    if (sortedClasses.length >= 2) {
      // Try pairs of classes
      for (let i = 0; i < Math.min(sortedClasses.length, 3); i++) {
        for (let j = i + 1; j < Math.min(sortedClasses.length, 4); j++) {
          const selector = `${tagName}.${CSS.escape(sortedClasses[i])}.${CSS.escape(sortedClasses[j])}`;
          if (this.isUnique(selector)) return selector;
        }
      }

      // Try three classes
      if (sortedClasses.length >= 3) {
        const classSelector = sortedClasses.slice(0, 3).map(c => `.${CSS.escape(c)}`).join('');
        const selector = `${tagName}${classSelector}`;
        if (this.isUnique(selector)) return selector;
      }
    }

    return null;
  }

  private getCssPath(element: Element): string | null {
    const path: string[] = [];
    let current: Element | null = element;
    let depth = 0;
    const maxDepth = 5;

    while (current && current !== document.body && depth < maxDepth) {
      const tagName = current.tagName.toLowerCase();
      const parent: Element | null = current.parentElement;

      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child: Element) => child.tagName.toLowerCase() === tagName
        );

        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          path.unshift(`${tagName}:nth-of-type(${index})`);
        } else {
          path.unshift(tagName);
        }
      } else {
        path.unshift(tagName);
      }

      current = parent;
      depth++;
    }

    if (path.length === 0) return null;

    const selector = path.join(' > ');
    return this.isUnique(selector) ? selector : null;
  }

  private buildFallbackPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.documentElement) {
      const tagName = current.tagName.toLowerCase();
      const parent: Element | null = current.parentElement;

      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current) + 1;
        path.unshift(`${tagName}:nth-child(${index})`);
      } else {
        path.unshift(tagName);
      }

      current = parent;
    }

    return path.join(' > ');
  }

  // Helper methods
  private isUnique(selector: string): boolean {
    try {
      // Handle :contains pseudo-selector (Cypress-specific)
      if (selector.includes(':contains(')) {
        return this.isUniqueContains(selector);
      }
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  private isUniqueContains(selector: string): boolean {
    // Parse :contains() selector and verify uniqueness manually
    // Format: "baseSelector:contains("text")" or "[role="x"]:contains("text")"
    const containsMatch = selector.match(/^(.+?):contains\("(.+?)"\)$/);
    if (!containsMatch) return false;

    const [, baseSelector, searchText] = containsMatch;

    try {
      const elements = document.querySelectorAll(baseSelector);
      let matchCount = 0;

      elements.forEach(el => {
        const text = (el.textContent || '').trim();
        if (text.includes(searchText.trim())) {
          matchCount++;
        }
      });

      return matchCount === 1;
    } catch {
      return false;
    }
  }

  private isDynamicId(id: string): boolean {
    // Common patterns for dynamic/generated IDs
    const dynamicPatterns = [
      /^[a-f0-9]{8,}$/i,           // Hex hashes
      /^\d+$/,                      // Pure numbers
      /^[a-z]+-\d+$/i,             // prefix-123
      /^:r[a-z0-9]+:$/,            // React IDs like :r0:
      /^ember\d+$/,                // Ember IDs
      /^ui-id-\d+$/,               // jQuery UI IDs
      /^ext-\d+$/,                 // ExtJS IDs
      /^[a-z]+_[a-f0-9]{4,}$/i,    // prefix_hash
    ];

    return dynamicPatterns.some(pattern => pattern.test(id));
  }

  private isFrameworkClass(className: string): boolean {
    return this.excludedPatterns.some(pattern => pattern.test(className));
  }

  private getImplicitRole(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');

    const roleMap: Record<string, string> = {
      'button': 'button',
      'a': 'link',
      'input': type === 'submit' || type === 'button' ? 'button' :
               type === 'checkbox' ? 'checkbox' :
               type === 'radio' ? 'radio' :
               type === 'search' ? 'searchbox' : 'textbox',
      'select': 'combobox',
      'textarea': 'textbox',
      'img': 'img',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'aside': 'complementary',
      'article': 'article',
      'section': 'region',
      'form': 'form',
      'table': 'table',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem'
    };

    return roleMap[tagName] || null;
  }

  private getAccessibleName(element: Element): string | null {
    // Priority: aria-label > aria-labelledby > visible text
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent?.trim() || null;
    }

    // For form controls, check associated label
    if (element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement) {
      const id = element.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent?.trim() || null;
      }
    }

    return this.getDirectTextContent(element);
  }

  private getDirectTextContent(element: Element): string | null {
    // Get text content excluding child elements' text
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      }
    }
    text = text.trim();
    return text.length > 0 ? text : null;
  }

  private buildRoleTextSelector(role: string, text: string): string | null {
    const escaped = this.escapeTextForContains(text.substring(0, 30));
    return `[role="${role}"]:contains("${escaped}")`;
  }

  private escapeAttributeValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  private escapeTextForContains(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .trim();
  }
}

export const selectorGenerator = new SelectorGenerator();
