// Helper to log a11y violations without failing (for third-party test sites)
const logA11yViolations = (violations) => {
  if (violations.length > 0) {
    cy.log(`Found ${violations.length} accessibility violation(s)`);
    violations.forEach((v) => {
      cy.log(`${v.impact}: ${v.description}`);
    });
  }
};

describe('UI Testing Playground', () => {
  describe('Sample App - Login Form', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/sampleapp');
      cy.injectAxe();
    });

    it('should display login form elements', () => {
      cy.get('input[name="UserName"]').should('be.visible');
      cy.get('input[name="Password"]').should('be.visible');
      cy.get('#login').should('be.visible');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });

    it('should login successfully with valid credentials', () => {
      cy.get('input[name="UserName"]').type('testuser');
      cy.get('input[name="Password"]').type('pwd');
      cy.get('#login').click();

      cy.get('#loginstatus').should('contain.text', 'Welcome, testuser!');
      cy.screenshot('login-success');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });

    it('should show error for invalid credentials', () => {
      cy.get('input[name="UserName"]').type('wronguser');
      cy.get('input[name="Password"]').type('wrongpwd');
      cy.get('#login').click();

      cy.get('#loginstatus').should('contain.text', 'Invalid username/password');
      cy.screenshot('login-failure');
    });
  });

  describe('Dynamic Table', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/dynamictable');
      cy.injectAxe();
    });

    it('should display table with data', () => {
      cy.get('[role="table"]').should('be.visible');
      cy.get('[role="rowgroup"]').should('exist');
      cy.get('[role="row"]').should('have.length.at.least', 2);

      cy.screenshot('dynamic-table');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });

    it('should have Chrome process in table', () => {
      cy.get('[role="cell"]').contains('Chrome').should('exist');
    });
  });

  describe('Click Button', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/click');
      cy.injectAxe();
    });

    it('should change button class after click', () => {
      cy.get('#badButton').should('have.class', 'btn-primary');
      cy.get('#badButton').click();
      cy.get('#badButton').should('have.class', 'btn-success');

      cy.screenshot('button-clicked');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });
  });

  describe('Text Input', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/textinput');
      cy.injectAxe();
    });

    it('should update button text based on input', () => {
      const newButtonName = 'My Custom Button';

      cy.get('#newButtonName').type(newButtonName);
      cy.get('#updatingButton').click();
      cy.get('#updatingButton').should('have.text', newButtonName);

      cy.screenshot('text-input-updated');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });
  });

  describe('AJAX Data', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/ajax');
      cy.injectAxe();
    });

    it('should load data after AJAX request', () => {
      cy.get('#ajaxButton').click();

      // Wait for AJAX response (up to 20 seconds as per site documentation)
      cy.get('.bg-success', { timeout: 20000 }).should('be.visible');
      cy.get('.bg-success').should('contain.text', 'Data loaded with AJAX get request.');

      cy.screenshot('ajax-data-loaded');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });
  });

  describe('Progress Bar', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/progressbar');
      cy.injectAxe();
    });

    it('should start and stop progress bar', () => {
      cy.get('#startButton').click();

      // Wait for progress to reach at least 75%
      cy.get('#progressBar', { timeout: 30000 }).should(($bar) => {
        const value = parseInt($bar.attr('aria-valuenow'));
        expect(value).to.be.at.least(75);
      });

      cy.get('#stopButton').click();
      cy.screenshot('progress-bar-stopped');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });
  });

  describe('Scrollbars', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/scrollbars');
      cy.injectAxe();
    });

    it('should scroll to and click hidden button', () => {
      cy.get('#hidingButton').scrollIntoView();
      cy.get('#hidingButton').should('be.visible');
      cy.get('#hidingButton').click();

      cy.screenshot('scrolled-button');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });
  });

  describe('Verify Input', () => {
    beforeEach(() => {
      cy.visit('http://uitestingplayground.com/verifytext');
      cy.injectAxe();
    });

    it('should find element with specific text', () => {
      cy.contains('Welcome UserName!').should('be.visible');

      cy.screenshot('verify-text');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, logA11yViolations, true);
    });
  });
});
