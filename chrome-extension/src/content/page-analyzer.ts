import {
  PageType,
  PageAnalysisResult,
  PageFeatures,
  AssertionTemplate
} from '../types';

export class PageAnalyzer {
  analyze(): PageAnalysisResult {
    const features = this.detectFeatures();
    const pageType = this.classifyPage(features);
    const suggestedAssertions = this.generateAssertions(pageType, features);

    return {
      pageType,
      confidence: this.calculateConfidence(pageType, features),
      features,
      suggestedAssertions
    };
  }

  private detectFeatures(): PageFeatures {
    const forms = document.querySelectorAll('form');
    const inputs = document.querySelectorAll('input');
    const tables = document.querySelectorAll('table');

    // Password field detection
    const passwordFields = document.querySelectorAll('input[type="password"]');
    const hasPasswordField = passwordFields.length > 0;

    // Email field detection
    const emailFields = document.querySelectorAll(
      'input[type="email"], input[name*="email"], input[id*="email"], input[autocomplete="email"]'
    );
    const hasEmailField = emailFields.length > 0;

    // Confirm password detection
    const confirmPasswordPatterns = [
      'input[name*="confirm"]',
      'input[name*="password2"]',
      'input[name*="password_confirm"]',
      'input[id*="confirm"]',
      'input[placeholder*="confirm" i]'
    ];
    const hasConfirmPassword = confirmPasswordPatterns.some(
      pattern => document.querySelector(pattern) !== null
    );

    // Search input detection
    const searchInputs = document.querySelectorAll(
      'input[type="search"], input[name*="search"], input[id*="search"], ' +
      'input[placeholder*="search" i], input[aria-label*="search" i], ' +
      '[role="searchbox"], [role="search"] input'
    );
    const hasSearchInput = searchInputs.length > 0;

    // Results container detection
    const resultsContainers = document.querySelectorAll(
      '[class*="result"], [id*="result"], [class*="search-result"], ' +
      '[aria-label*="result" i], [role="list"]'
    );
    const hasResultsContainer = resultsContainers.length > 0;

    // Table detection
    const hasTable = tables.length > 0 && this.isDataTable(tables[0]);

    // List detection (card grids, item lists)
    const listContainers = document.querySelectorAll(
      '[class*="grid"], [class*="list"], [class*="card"], ' +
      '[role="list"], ul[class], ol[class]'
    );
    const hasList = this.hasRepeatingElements(listContainers);

    // Textarea detection
    const textareas = document.querySelectorAll('textarea');
    const hasTextarea = textareas.length > 0;

    // Single H1 (detail page indicator)
    const h1Elements = document.querySelectorAll('h1');
    const hasSingleH1 = h1Elements.length === 1;

    // Main content detection
    const mainContent = document.querySelector(
      'main, [role="main"], article, .content, #content'
    );
    const hasMainContent = mainContent !== null;

    // Image detection
    const images = document.querySelectorAll('img, picture, [role="img"]');
    const hasImages = images.length > 0;

    // Form field count
    let formFieldCount = 0;
    forms.forEach(form => {
      formFieldCount += form.querySelectorAll('input, select, textarea').length;
    });
    if (formFieldCount === 0) {
      formFieldCount = inputs.length;
    }

    return {
      hasPasswordField,
      hasEmailField,
      hasSearchInput,
      hasTable,
      hasList,
      formFieldCount,
      hasConfirmPassword,
      hasTextarea,
      hasResultsContainer,
      hasSingleH1,
      hasMainContent,
      hasImages
    };
  }

  private classifyPage(features: PageFeatures): PageType {
    // Login Form: password + email/user fields, ≤4 fields
    if (features.hasPasswordField &&
        !features.hasConfirmPassword &&
        features.formFieldCount <= 4) {
      return 'login-form';
    }

    // Registration Form: password + confirm password, >4 fields
    if (features.hasPasswordField &&
        features.hasConfirmPassword &&
        features.formFieldCount > 4) {
      return 'registration-form';
    }

    // Contact Form: email + textarea, no password
    if (features.hasEmailField &&
        features.hasTextarea &&
        !features.hasPasswordField) {
      return 'contact-form';
    }

    // Search Page: search input + results container
    if (features.hasSearchInput && features.hasResultsContainer) {
      return 'search';
    }

    // Table Page: data table with rows
    if (features.hasTable) {
      return 'table';
    }

    // List Page: grid/card containers with repeating elements
    if (features.hasList) {
      return 'list';
    }

    // Detail Page: single h1, description content, images
    if (features.hasSingleH1 && features.hasMainContent) {
      return 'detail';
    }

    return 'generic';
  }

  private calculateConfidence(pageType: PageType, features: PageFeatures): number {
    let confidence = 50; // Base confidence

    switch (pageType) {
      case 'login-form':
        if (features.hasPasswordField) confidence += 25;
        if (features.hasEmailField) confidence += 15;
        if (features.formFieldCount <= 4) confidence += 10;
        break;

      case 'registration-form':
        if (features.hasPasswordField) confidence += 20;
        if (features.hasConfirmPassword) confidence += 25;
        if (features.formFieldCount > 4) confidence += 5;
        break;

      case 'contact-form':
        if (features.hasEmailField) confidence += 20;
        if (features.hasTextarea) confidence += 20;
        if (!features.hasPasswordField) confidence += 10;
        break;

      case 'search':
        if (features.hasSearchInput) confidence += 25;
        if (features.hasResultsContainer) confidence += 25;
        break;

      case 'table':
        if (features.hasTable) confidence += 40;
        break;

      case 'list':
        if (features.hasList) confidence += 35;
        break;

      case 'detail':
        if (features.hasSingleH1) confidence += 20;
        if (features.hasMainContent) confidence += 15;
        if (features.hasImages) confidence += 10;
        break;

      default:
        confidence = 30;
    }

    return Math.min(100, confidence);
  }

  private generateAssertions(pageType: PageType, features: PageFeatures): AssertionTemplate[] {
    const assertions: AssertionTemplate[] = [];

    switch (pageType) {
      case 'login-form':
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify login form fields are visible',
            code: `cy.get('input[type="password"]').should('be.visible');\ncy.get('input[type="email"], input[type="text"]').first().should('be.visible');`
          },
          {
            type: 'form-validation',
            description: 'Test empty submission shows error',
            code: `cy.get('form').submit();\ncy.get('[class*="error"], [role="alert"]').should('be.visible');`
          },
          {
            type: 'form-validation',
            description: 'Test invalid email validation',
            code: `cy.get('input[type="email"]').type('invalid-email');\ncy.get('form').submit();\ncy.get('[class*="error"], [role="alert"]').should('be.visible');`
          }
        );
        break;

      case 'registration-form':
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify registration form fields are visible',
            code: `cy.get('input[type="password"]').should('have.length.at.least', 2);\ncy.get('input[type="email"]').should('be.visible');`
          },
          {
            type: 'form-validation',
            description: 'Test password match validation',
            code: `cy.get('input[type="password"]').first().type('password123');\ncy.get('input[type="password"]').last().type('different456');\ncy.get('form').submit();\ncy.get('[class*="error"], [role="alert"]').should('contain.text', 'match');`
          },
          {
            type: 'form-validation',
            description: 'Test required field validation',
            code: `cy.get('form').submit();\ncy.get(':invalid, [class*="error"]').should('exist');`
          }
        );
        break;

      case 'contact-form':
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify contact form fields are visible',
            code: `cy.get('input[type="email"]').should('be.visible');\ncy.get('textarea').should('be.visible');`
          },
          {
            type: 'form-validation',
            description: 'Test required fields validation',
            code: `cy.get('form').submit();\ncy.get(':invalid, [class*="error"]').should('exist');`
          }
        );
        break;

      case 'search':
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify search input is functional',
            code: `cy.get('input[type="search"], [role="searchbox"]').should('be.visible').type('test query{enter}');`
          },
          {
            type: 'visibility',
            description: 'Verify results appear after search',
            code: `cy.get('[class*="result"], [role="list"]').should('be.visible');`
          },
          {
            type: 'count',
            description: 'Verify result count',
            code: `cy.get('[class*="result"] > *, [role="listitem"]').should('have.length.at.least', 1);`
          }
        );
        break;

      case 'table':
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify table structure',
            code: `cy.get('table').should('be.visible');\ncy.get('thead th, th').should('have.length.at.least', 1);`
          },
          {
            type: 'count',
            description: 'Verify table has data rows',
            code: `cy.get('tbody tr, table tr').should('have.length.at.least', 1);`
          },
          {
            type: 'visibility',
            description: 'Verify pagination or sorting (if present)',
            code: `cy.get('[class*="pagination"], [class*="sort"], button:contains("Next")').should('exist');`
          }
        );
        break;

      case 'list':
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify list container is visible',
            code: `cy.get('[class*="grid"], [class*="list"], [role="list"]').should('be.visible');`
          },
          {
            type: 'count',
            description: 'Verify list has items',
            code: `cy.get('[class*="card"], [class*="item"], [role="listitem"]').should('have.length.at.least', 1);`
          }
        );
        break;

      case 'detail':
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify page heading exists',
            code: `cy.get('h1').should('be.visible').and('not.be.empty');`
          },
          {
            type: 'visibility',
            description: 'Verify main content is loaded',
            code: `cy.get('main, [role="main"], article').should('be.visible');`
          },
          {
            type: 'attribute',
            description: 'Verify images have alt text',
            code: `cy.get('img').each(($img) => {\n  cy.wrap($img).should('have.attr', 'alt');\n});`
          }
        );
        break;

      default:
        assertions.push(
          {
            type: 'visibility',
            description: 'Verify page loaded',
            code: `cy.get('body').should('be.visible');`
          }
        );
    }

    // Always add accessibility check
    assertions.push({
      type: 'accessibility',
      description: 'Run accessibility audit',
      code: `cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });`
    });

    return assertions;
  }

  private isDataTable(table: Element): boolean {
    // Check if table has headers
    const hasHeaders = table.querySelector('thead th, th') !== null;

    // Check if table has multiple rows
    const rows = table.querySelectorAll('tbody tr, tr');
    const hasMultipleRows = rows.length > 1;

    // Check if it's not a layout table
    const role = table.getAttribute('role');
    const isLayoutTable = role === 'presentation' || role === 'none';

    return hasHeaders && hasMultipleRows && !isLayoutTable;
  }

  private hasRepeatingElements(containers: NodeListOf<Element>): boolean {
    for (const container of containers) {
      const children = container.children;
      if (children.length < 3) continue;

      // Check if children have similar structure
      const firstChild = children[0];
      const firstTagName = firstChild.tagName;
      const firstClassCount = firstChild.classList.length;

      let similarCount = 0;
      for (let i = 1; i < children.length; i++) {
        const child = children[i];
        if (child.tagName === firstTagName &&
            Math.abs(child.classList.length - firstClassCount) <= 2) {
          similarCount++;
        }
      }

      // If more than 50% of children are similar, it's likely a list
      if (similarCount / (children.length - 1) > 0.5) {
        return true;
      }
    }

    return false;
  }
}

export const pageAnalyzer = new PageAnalyzer();
