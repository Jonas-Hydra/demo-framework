import {
  RecordingSession,
  RecordedAction,
  CodeGenerationOptions,
  PageType
} from '../types';
import { assertionGenerator } from './assertion-generator';

export class CypressGenerator {
  private defaultOptions: CodeGenerationOptions = {
    includeAccessibilityChecks: true,
    includeScreenshots: true,
    includeAssertions: true,
    testName: 'recorded test scenario',
    describeName: 'Recorded Test'
  };

  generate(session: RecordingSession, options?: Partial<CodeGenerationOptions>): string {
    const opts = { ...this.defaultOptions, ...options };
    const lines: string[] = [];

    // Generate describe block
    lines.push(`describe('${this.escapeString(opts.describeName)}', () => {`);

    // Generate beforeEach hook
    lines.push(`  beforeEach(() => {`);
    if (opts.includeAccessibilityChecks) {
      lines.push(`    cy.injectAxe();`);
    }
    lines.push(`  });`);
    lines.push('');

    // Generate test
    lines.push(`  it('${this.escapeString(opts.testName)}', () => {`);

    // Generate visit command
    if (session.url) {
      const url = this.normalizeUrl(session.url, opts.baseUrl);
      lines.push(`    cy.visit('${url}');`);
      lines.push('');
    }

    // Generate action commands
    const actionCode = this.generateActions(session.actions, opts);
    lines.push(actionCode);

    // Add page-type specific assertions
    if (opts.includeAssertions && session.pageType) {
      const assertions = assertionGenerator.generateForPageType(session.pageType);
      if (assertions.length > 0) {
        lines.push('');
        lines.push(`    // Page-type assertions (${session.pageType})`);
        lines.push(...assertions);
      }
    }

    // Add accessibility check at the end
    if (opts.includeAccessibilityChecks) {
      lines.push('');
      lines.push(`    // Accessibility audit`);
      lines.push(`    cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });`);
    }

    // Add final screenshot
    if (opts.includeScreenshots) {
      lines.push('');
      lines.push(`    cy.screenshot('${this.sanitizeFilename(opts.testName)}-final');`);
    }

    lines.push(`  });`);
    lines.push(`});`);

    return lines.join('\n');
  }

  generateActions(actions: RecordedAction[], options: CodeGenerationOptions): string {
    const lines: string[] = [];
    let lastUrl = '';
    let stepCount = 0;

    for (const action of actions) {
      const actionLines = this.generateActionCommand(action);

      if (actionLines) {
        // Add comment for navigation
        if (action.type === 'navigate' && action.url && action.url !== lastUrl) {
          lines.push(`    // Navigate to ${this.truncateUrl(action.url)}`);
          lastUrl = action.url;
        }

        lines.push(...actionLines.map(line => `    ${line}`));

        // Add screenshot after certain actions
        if (options.includeScreenshots && this.shouldScreenshot(action)) {
          stepCount++;
          lines.push(`    cy.screenshot('step-${stepCount}-${action.type}');`);
        }

        lines.push('');
      }
    }

    return lines.join('\n').trim();
  }

  private generateActionCommand(action: RecordedAction): string[] | null {
    const selector = action.selector.selector;

    switch (action.type) {
      case 'click':
        return [
          `cy.get('${this.escapeSelector(selector)}').click();`
        ];

      case 'type':
        if (action.value) {
          const value = this.escapeString(action.value);
          // Handle special keys
          if (value.includes('{enter}')) {
            return [
              `cy.get('${this.escapeSelector(selector)}').type('${value}');`
            ];
          }
          return [
            `cy.get('${this.escapeSelector(selector)}').clear().type('${value}');`
          ];
        }
        return null;

      case 'select':
        if (action.value) {
          return [
            `cy.get('${this.escapeSelector(selector)}').select('${this.escapeString(action.value)}');`
          ];
        }
        return null;

      case 'check':
        if (action.value === 'true') {
          return [
            `cy.get('${this.escapeSelector(selector)}').check();`
          ];
        } else {
          return [
            `cy.get('${this.escapeSelector(selector)}').uncheck();`
          ];
        }

      case 'submit':
        return [
          `cy.get('${this.escapeSelector(selector)}').submit();`
        ];

      case 'navigate':
        if (action.url) {
          const path = new URL(action.url).pathname;
          return [
            `cy.visit('${path}');`
          ];
        }
        return null;

      case 'scroll':
        return [
          `cy.get('${this.escapeSelector(selector)}').scrollIntoView();`
        ];

      case 'hover':
        return [
          `cy.get('${this.escapeSelector(selector)}').trigger('mouseover');`
        ];

      default:
        return null;
    }
  }

  private shouldScreenshot(action: RecordedAction): boolean {
    // Screenshot after form submissions, navigations, and significant clicks
    return ['submit', 'navigate'].includes(action.type) ||
           (action.type === 'click' && action.element.tagName === 'button');
  }

  private normalizeUrl(url: string, baseUrl?: string): string {
    if (!baseUrl) {
      try {
        const parsed = new URL(url);
        return parsed.pathname + parsed.search;
      } catch {
        return url;
      }
    }

    try {
      const parsed = new URL(url);
      const base = new URL(baseUrl);

      if (parsed.origin === base.origin) {
        return parsed.pathname + parsed.search;
      }
      return url;
    } catch {
      return url;
    }
  }

  private truncateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      return path.length > 50 ? path.substring(0, 47) + '...' : path;
    } catch {
      return url.substring(0, 50);
    }
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  private escapeSelector(selector: string): string {
    // Escape single quotes in selectors
    return selector.replace(/'/g, "\\'");
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  // Generate multiple tests for different scenarios
  generateMultipleTests(
    sessions: RecordingSession[],
    describeName: string,
    options?: Partial<CodeGenerationOptions>
  ): string {
    const opts = { ...this.defaultOptions, ...options, describeName };
    const lines: string[] = [];

    lines.push(`describe('${this.escapeString(describeName)}', () => {`);

    // beforeEach hook
    lines.push(`  beforeEach(() => {`);
    if (opts.includeAccessibilityChecks) {
      lines.push(`    cy.injectAxe();`);
    }
    lines.push(`  });`);
    lines.push('');

    // Generate each test
    for (const session of sessions) {
      lines.push(`  it('${this.escapeString(session.name)}', () => {`);

      if (session.url) {
        const url = this.normalizeUrl(session.url, opts.baseUrl);
        lines.push(`    cy.visit('${url}');`);
        lines.push('');
      }

      const actionCode = this.generateActions(session.actions, opts);
      if (actionCode) {
        lines.push(actionCode);
      }

      if (opts.includeAccessibilityChecks) {
        lines.push('');
        lines.push(`    cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });`);
      }

      lines.push(`  });`);
      lines.push('');
    }

    lines.push(`});`);

    return lines.join('\n');
  }
}

export const cypressGenerator = new CypressGenerator();
