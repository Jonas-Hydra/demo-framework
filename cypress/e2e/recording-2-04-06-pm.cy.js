describe('Recorded Test', () => {
  it('Recording 2:04:06 PM - Sample App Login', () => {
    // Navigate directly to Sample App
    cy.visit('http://uitestingplayground.com/sampleapp');
    cy.injectAxe();
    cy.screenshot('step-1-navigate');

    // Enter username and password
    cy.get('input[name="UserName"]').clear().type('qauser1');
    cy.get('input[name="Password"]').clear().type('pwd');

    cy.get('#login').click();
    cy.screenshot('step-2-login');

    // Verify login success
    cy.get('#loginstatus').should('contain.text', 'Welcome, qauser1!');

    // Accessibility audit - log violations but don't fail
    // (UI Testing Playground has known a11y issues)
    cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, (violations) => {
      if (violations.length > 0) {
        cy.log(`Found ${violations.length} accessibility violations`);
        violations.forEach((v) => {
          cy.log(`${v.impact}: ${v.description}`);
        });
      }
    }, true);

    cy.screenshot('recording-2-04-06-pm-final');
  });
});
