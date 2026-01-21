import { PageType, RecordedAction, AssertionTemplate } from '../types';

export class AssertionGenerator {
  generateForPageType(pageType: PageType): string[] {
    const assertions: string[] = [];

    switch (pageType) {
      case 'login-form':
        assertions.push(...this.generateLoginAssertions());
        break;

      case 'registration-form':
        assertions.push(...this.generateRegistrationAssertions());
        break;

      case 'contact-form':
        assertions.push(...this.generateContactFormAssertions());
        break;

      case 'search':
        assertions.push(...this.generateSearchAssertions());
        break;

      case 'table':
        assertions.push(...this.generateTableAssertions());
        break;

      case 'list':
        assertions.push(...this.generateListAssertions());
        break;

      case 'detail':
        assertions.push(...this.generateDetailAssertions());
        break;

      default:
        assertions.push(...this.generateGenericAssertions());
    }

    return assertions;
  }

  generateForAction(action: RecordedAction): string | null {
    switch (action.type) {
      case 'click':
        return this.generateClickAssertion(action);

      case 'type':
        return this.generateTypeAssertion(action);

      case 'select':
        return this.generateSelectAssertion(action);

      case 'navigate':
        return this.generateNavigationAssertion(action);

      default:
        return null;
    }
  }

  private generateLoginAssertions(): string[] {
    return [
      `    // Verify login form is visible`,
      `    cy.get('input[type="password"]').should('be.visible');`,
      `    cy.get('input[type="email"], input[name*="user"], input[name*="email"]').first().should('be.visible');`,
      `    cy.get('button[type="submit"], input[type="submit"]').should('be.visible');`
    ];
  }

  private generateRegistrationAssertions(): string[] {
    return [
      `    // Verify registration form fields`,
      `    cy.get('input[type="password"]').should('have.length.at.least', 2);`,
      `    cy.get('input[type="email"]').should('be.visible');`
    ];
  }

  private generateContactFormAssertions(): string[] {
    return [
      `    // Verify contact form fields`,
      `    cy.get('input[type="email"]').should('be.visible');`,
      `    cy.get('textarea').should('be.visible');`
    ];
  }

  private generateSearchAssertions(): string[] {
    return [
      `    // Verify search functionality`,
      `    cy.get('input[type="search"], [role="searchbox"], input[name*="search"]').should('be.visible');`
    ];
  }

  private generateTableAssertions(): string[] {
    return [
      `    // Verify table structure`,
      `    cy.get('table').should('be.visible');`,
      `    cy.get('thead th, th').should('have.length.at.least', 1);`,
      `    cy.get('tbody tr').should('have.length.at.least', 1);`
    ];
  }

  private generateListAssertions(): string[] {
    return [
      `    // Verify list is populated`,
      `    cy.get('[class*="list"], [class*="grid"], [role="list"]').should('be.visible');`,
      `    cy.get('[class*="item"], [class*="card"], [role="listitem"]').should('have.length.at.least', 1);`
    ];
  }

  private generateDetailAssertions(): string[] {
    return [
      `    // Verify detail page content`,
      `    cy.get('h1').should('be.visible').and('not.be.empty');`,
      `    cy.get('main, [role="main"], article').should('be.visible');`
    ];
  }

  private generateGenericAssertions(): string[] {
    return [
      `    // Verify page loaded successfully`,
      `    cy.get('body').should('be.visible');`
    ];
  }

  private generateClickAssertion(action: RecordedAction): string | null {
    const { element, selector } = action;

    // Generate assertion based on what was clicked
    if (element.tagName === 'button' || element.role === 'button') {
      return `    // Verify button is clickable\n    cy.get('${selector.selector}').should('be.visible').and('not.be.disabled');`;
    }

    if (element.tagName === 'a') {
      return `    // Verify link is visible\n    cy.get('${selector.selector}').should('be.visible');`;
    }

    return null;
  }

  private generateTypeAssertion(action: RecordedAction): string | null {
    const { selector, value } = action;

    if (value) {
      return `    // Verify input has correct value\n    cy.get('${selector.selector}').should('have.value', '${this.escapeString(value.replace('{enter}', ''))}');`;
    }

    return null;
  }

  private generateSelectAssertion(action: RecordedAction): string | null {
    const { selector, value } = action;

    if (value) {
      return `    // Verify select has correct value\n    cy.get('${selector.selector}').should('have.value', '${this.escapeString(value)}');`;
    }

    return null;
  }

  private generateNavigationAssertion(action: RecordedAction): string | null {
    if (action.url) {
      const url = new URL(action.url);
      return `    // Verify navigation\n    cy.url().should('include', '${url.pathname}');`;
    }

    return null;
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');
  }
}

export const assertionGenerator = new AssertionGenerator();
