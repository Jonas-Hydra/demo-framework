describe('USA.gov Accessibility Test', () => {
  beforeEach(() => {
    // Inject Axe into the page before each test
    cy.injectAxe();
  });

  it('should visit usa.gov and perform accessibility check on homepage', () => {
    // Visit the homepage
    cy.visit('/');
    
    // Wait for page to load
    cy.get('body').should('be.visible');
    
    // Run accessibility check on the homepage
    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious'],
      rules: {
        // Configure specific rules if needed
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'aria-required-attr': { enabled: true },
        'landmark-one-main': { enabled: true },
        'page-has-heading-one': { enabled: true },
        'region': { enabled: true }
      }
    }, (violations) => {
      // Log violations for debugging
      if (violations.length > 0) {
        cy.log(`${violations.length} accessibility violation(s) found`);
        violations.forEach((violation) => {
          cy.log(`Violation: ${violation.id} - ${violation.description}`);
        });
      }
    });
    
    // Capture screenshot for documentation
    cy.screenshot('usa-gov-homepage');
  });

  it('should perform search and check accessibility on results page', () => {
    // Visit the homepage
    cy.visit('/');
    
    // Wait for page to load
    cy.get('body').should('be.visible');
    
    // Find and interact with search functionality
    // USA.gov typically has a search box - we'll look for common selectors
    cy.get('body').then(($body) => {
      // Try to find search input - USA.gov may have different search implementations
      const searchInput = $body.find('input[type="search"], input[name*="search"], input[id*="search"], input[placeholder*="search" i]');
      
      if (searchInput.length > 0) {
        // If search input found, perform search
        cy.get('input[type="search"], input[name*="search"], input[id*="search"], input[placeholder*="search" i]')
          .first()
          .type('passport{enter}');
        
        // Wait for search results to load
        cy.wait(2000);
        cy.get('body').should('be.visible');
        
        // Run accessibility check on search results page
        cy.checkA11y(null, {
          includedImpacts: ['critical', 'serious'],
          rules: {
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'aria-required-attr': { enabled: true },
            'landmark-one-main': { enabled: true },
            'page-has-heading-one': { enabled: true },
            'region': { enabled: true }
          }
        }, (violations) => {
          if (violations.length > 0) {
            cy.log(`${violations.length} accessibility violation(s) found on search results`);
            violations.forEach((violation) => {
              cy.log(`Violation: ${violation.id} - ${violation.description}`);
            });
          }
        });
        
        // Capture screenshot of search results
        cy.screenshot('usa-gov-search-results');
      } else {
        // If no search found, just check accessibility of homepage
        cy.log('Search functionality not found, checking homepage accessibility only');
        cy.checkA11y(null, {
          includedImpacts: ['critical', 'serious']
        });
        cy.screenshot('usa-gov-homepage-no-search');
      }
    });
  });

  it('should check accessibility with detailed WCAG compliance', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    
    // Run comprehensive accessibility check
    cy.checkA11y(null, {
      // Check all WCAG levels
      includedImpacts: ['critical', 'serious', 'moderate'],
      // Run all rules
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
      }
    }, undefined, {
      // Skip certain elements that might have false positives
      skipFailures: false
    });
    
    cy.screenshot('usa-gov-wcag-compliance');
  });
});

