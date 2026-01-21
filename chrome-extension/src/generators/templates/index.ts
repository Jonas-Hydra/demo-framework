// Assertion templates for different page types
export const templates = {
  loginForm: {
    visibility: `
    // Verify login form fields are visible
    cy.get('input[type="password"]').should('be.visible');
    cy.get('input[type="email"], input[type="text"]').first().should('be.visible');
    cy.get('button[type="submit"], input[type="submit"]').should('be.visible');`,

    emptySubmission: `
    // Test empty form submission
    cy.get('form').submit();
    cy.get('[class*="error"], [role="alert"], .error').should('be.visible');`,

    invalidEmail: `
    // Test invalid email validation
    cy.get('input[type="email"]').clear().type('invalid-email');
    cy.get('form').submit();
    cy.get('[class*="error"], [role="alert"], :invalid').should('exist');`
  },

  registrationForm: {
    visibility: `
    // Verify registration form fields
    cy.get('input[type="password"]').should('have.length.at.least', 2);
    cy.get('input[type="email"]').should('be.visible');`,

    passwordMatch: `
    // Test password mismatch validation
    cy.get('input[type="password"]').first().clear().type('Password123!');
    cy.get('input[type="password"]').last().clear().type('DifferentPass456!');
    cy.get('form').submit();
    cy.get('[class*="error"], [role="alert"]').should('be.visible');`,

    requiredFields: `
    // Test required field validation
    cy.get('form').submit();
    cy.get(':invalid, [class*="error"]').should('exist');`
  },

  contactForm: {
    visibility: `
    // Verify contact form fields
    cy.get('input[type="email"]').should('be.visible');
    cy.get('textarea').should('be.visible');`,

    submission: `
    // Test contact form submission
    cy.get('input[type="email"]').clear().type('test@example.com');
    cy.get('textarea').clear().type('This is a test message.');
    cy.get('form').submit();
    cy.get('[class*="success"], [class*="thank"]').should('be.visible');`
  },

  search: {
    functionality: `
    // Test search functionality
    cy.get('input[type="search"], [role="searchbox"]').should('be.visible');
    cy.get('input[type="search"], [role="searchbox"]').clear().type('test query{enter}');`,

    results: `
    // Verify search results appear
    cy.get('[class*="result"], [role="list"]').should('be.visible');
    cy.get('[class*="result"] > *, [role="listitem"]').should('have.length.at.least', 1);`,

    noResults: `
    // Test no results state
    cy.get('input[type="search"], [role="searchbox"]').clear().type('xyznonexistent123{enter}');
    cy.get('[class*="no-result"], [class*="empty"]').should('be.visible');`
  },

  table: {
    structure: `
    // Verify table structure
    cy.get('table').should('be.visible');
    cy.get('thead th, th').should('have.length.at.least', 1);`,

    dataRows: `
    // Verify table has data rows
    cy.get('tbody tr').should('have.length.at.least', 1);`,

    sorting: `
    // Test table sorting (if available)
    cy.get('th[class*="sort"], th button, th[role="columnheader"]').first().click();
    cy.get('tbody tr').first().should('exist');`,

    pagination: `
    // Test pagination (if available)
    cy.get('[class*="pagination"] button, [class*="page"] button').contains(/next|2|>/i).click();
    cy.get('tbody tr').should('have.length.at.least', 1);`
  },

  list: {
    visibility: `
    // Verify list is visible and populated
    cy.get('[class*="list"], [class*="grid"], [role="list"]').should('be.visible');`,

    items: `
    // Verify list has items
    cy.get('[class*="item"], [class*="card"], [role="listitem"]').should('have.length.at.least', 1);`,

    itemClick: `
    // Test clicking on list item
    cy.get('[class*="item"], [class*="card"], [role="listitem"]').first().click();`
  },

  detail: {
    heading: `
    // Verify page heading exists
    cy.get('h1').should('be.visible').and('not.be.empty');`,

    content: `
    // Verify main content is loaded
    cy.get('main, [role="main"], article').should('be.visible');`,

    images: `
    // Verify images have alt text
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt').and('not.be.empty');
    });`
  },

  accessibility: {
    full: `
    // Run full accessibility audit
    cy.checkA11y();`,

    critical: `
    // Check for critical and serious accessibility issues
    cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });`,

    specific: `
    // Check specific accessibility rules
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
        'image-alt': { enabled: true },
        'label': { enabled: true }
      }
    });`
  }
};

export type TemplateCategory = keyof typeof templates;
export type TemplateKey<T extends TemplateCategory> = keyof typeof templates[T];
