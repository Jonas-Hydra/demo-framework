describe('USA.gov Accessibility Test', () => {
  it('should visit usa.gov and perform accessibility check on homepage', () => {
    cy.visit('/');
    cy.injectAxe();

    cy.get('body').should('be.visible');

    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious']
    }, (violations) => {
      if (violations.length > 0) {
        cy.log(`${violations.length} accessibility violation(s) found`);
        violations.forEach((violation) => {
          cy.log(`Violation: ${violation.id} - ${violation.description}`);
        });
      }
    }, true);

    cy.screenshot('usa-gov-homepage');
  });

  it('should perform search and check accessibility on results page', () => {
    cy.visit('/');
    cy.injectAxe();

    cy.get('body').should('be.visible');

    // Look for search input
    cy.get('input[type="search"], input[name*="search"], input[id*="search"]')
      .first()
      .type('passport{enter}');

    // Wait for results and re-inject axe
    cy.url().should('include', 'search');
    cy.injectAxe();

    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious']
    }, (violations) => {
      if (violations.length > 0) {
        cy.log(`${violations.length} accessibility violation(s) found on search results`);
        violations.forEach((violation) => {
          cy.log(`Violation: ${violation.id} - ${violation.description}`);
        });
      }
    }, true);

    cy.screenshot('usa-gov-search-results');
  });

  it('should check accessibility with detailed WCAG compliance', () => {
    cy.visit('/');
    cy.injectAxe();

    cy.get('body').should('be.visible');

    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious', 'moderate'],
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
      }
    }, (violations) => {
      if (violations.length > 0) {
        cy.log(`${violations.length} WCAG violation(s) found`);
      }
    }, true);

    cy.screenshot('usa-gov-wcag-compliance');
  });
});
