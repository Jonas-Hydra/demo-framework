# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a QA automation framework for accessibility testing using Cypress and Axe-core. It provides multiple ways to create tests:
1. **URL Generator** - Analyze a URL and auto-generate tests based on detected page type
2. **Test Scaffolder** - Generate test files from templates based on page type
3. **Chrome Extension** - Record browser interactions and generate tests
4. **Manual** - Write tests following the standard patterns

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

# Generate test from URL (auto-detects page type)
npm run generate:test -- --url <url>

# Scaffold a new test file (manual page type)
npm run scaffold:test -- --name <name> --type <type> --url <url>

# List available page types
npm run scaffold:list
```

## URL-Based Test Generator

Automatically analyze a URL and generate tests based on detected page structure:

```bash
# Basic usage
npm run generate:test -- --url http://example.com/login

# With custom name
npm run generate:test -- --url http://example.com/products -n product-listing

# With verbose output (shows analysis details)
npm run generate:test -- --url http://example.com/search --verbose
```

The generator:
1. Visits the URL in a headless browser (Puppeteer)
2. Analyzes page structure (forms, inputs, tables, etc.)
3. Detects page type with confidence score
4. Generates appropriate test assertions

## Test Scaffolder

Generate test files from templates when you know the page type:

```bash
# List available page types
npm run scaffold:list

# Generate a login form test
npm run scaffold:test -- --name login --type login-form --url http://example.com/login

# Generate a search page test
npm run scaffold:test -- -n search -t search -u http://example.com/search
```

**Available page types:**
- `login-form` - Login form with username/email and password fields
- `registration-form` - Registration/signup form with multiple fields
- `contact-form` - Contact or feedback form with message field
- `search` - Search page with input and results
- `table` - Data table with rows and columns
- `list` - List or card grid layout
- `detail` - Detail/content page with heading and body
- `generic` - Generic page template

## Architecture

- **cypress/e2e/** - Test spec files
- **cypress/support/e2e.js** - Global setup; imports `cypress-axe`
- **cypress/support/commands.js** - Custom Cypress commands
- **cypress.config.js** - Cypress configuration with Mochawesome reporter
- **scripts/generate-test.js** - URL-based test generator (uses Puppeteer)
- **scripts/scaffold-test.js** - Template-based test scaffolder
- **chrome-extension/** - Browser extension for recording tests
- **reports/** - Generated HTML test reports (gitignored)

## Accessibility Testing Pattern

Tests use Axe-core via `cypress-axe`. Standard pattern:

```javascript
beforeEach(() => {
  cy.visit('/page');
  cy.injectAxe();  // Must be called AFTER cy.visit()
});

it('should be accessible', () => {
  cy.checkA11y(null, {
    includedImpacts: ['critical', 'serious'],
    rules: { 'color-contrast': { enabled: true } }
  });
});
```

**Note:** `cy.injectAxe()` must be called after `cy.visit()`, not before.

To log violations without failing (for third-party sites):
```javascript
cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] }, (violations) => {
  violations.forEach(v => cy.log(`${v.impact}: ${v.description}`));
}, true);  // 4th param = skipFailures
```

## Chrome Extension

The `chrome-extension/` directory contains a browser extension for recording tests:
1. Build: `cd chrome-extension && npm install && npm run build`
2. Load unpacked extension from `chrome-extension/dist`
3. Record interactions in the browser
4. Export generated Cypress test code

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to main. Tests run in headless Chrome on Ubuntu. Reports and screenshots are uploaded as artifacts.
