# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a QA automation framework for accessibility testing using Cypress and Axe-core. It tests against https://www.usa.gov for WCAG 2.1 AA compliance.

## Commands

```bash
# Install dependencies
npm install

# Open Cypress interactive test runner
npm run cy:open

# Run all tests headless
npm run cy:run

# Run accessibility tests only
npm run test:accessibility

# Run tests and generate HTML report
npm run test:report
```

## Architecture

- **cypress/e2e/** - Test spec files. Tests use `cy.injectAxe()` in `beforeEach` and `cy.checkA11y()` to run accessibility checks.
- **cypress/support/e2e.js** - Global setup; imports `@axe-core/cypress` for accessibility commands.
- **cypress/support/commands.js** - Custom Cypress commands (add new commands here).
- **cypress.config.js** - Cypress configuration with Mochawesome reporter settings.
- **reports/** - Generated HTML test reports (gitignored).

## Accessibility Testing Pattern

Tests use Axe-core via `@axe-core/cypress`. Standard pattern:

```javascript
beforeEach(() => {
  cy.injectAxe();
});

it('should be accessible', () => {
  cy.visit('/');
  cy.checkA11y(null, {
    includedImpacts: ['critical', 'serious'],
    rules: { 'color-contrast': { enabled: true } }
  });
});
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to main. Tests run in headless Chrome on Ubuntu. Reports and screenshots are uploaded as artifacts.
