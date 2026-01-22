#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Page type templates with assertions
const pageTemplates = {
  'login-form': {
    description: 'Login form with username/email and password fields',
    assertions: `
    it('should display login form elements', () => {
      cy.get('input[type="password"]').should('be.visible');
      cy.get('input[type="email"], input[type="text"], input[name*="user"]').first().should('be.visible');
      cy.get('button[type="submit"], input[type="submit"], button:contains("Log")').should('be.visible');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should show error for empty submission', () => {
      cy.get('button[type="submit"], input[type="submit"], button:contains("Log")').click();
      cy.get('[class*="error"], [role="alert"], .error, :invalid').should('exist');
    });

    it('should login with valid credentials', () => {
      // TODO: Replace with valid test credentials
      cy.get('input[type="email"], input[type="text"], input[name*="user"]').first().type('testuser@example.com');
      cy.get('input[type="password"]').type('testpassword');
      cy.get('button[type="submit"], input[type="submit"], button:contains("Log")').click();

      // TODO: Add assertion for successful login (e.g., redirect, welcome message)
      // cy.url().should('include', '/dashboard');
      // cy.get('[class*="welcome"], [class*="user"]').should('be.visible');

      cy.screenshot('login-success');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should show error for invalid credentials', () => {
      cy.get('input[type="email"], input[type="text"], input[name*="user"]').first().type('invalid@example.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"], input[type="submit"], button:contains("Log")').click();

      cy.get('[class*="error"], [role="alert"], .error').should('be.visible');
      cy.screenshot('login-error');
    });`
  },

  'registration-form': {
    description: 'Registration/signup form with multiple fields',
    assertions: `
    it('should display registration form fields', () => {
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('have.length.at.least', 1);
      cy.get('button[type="submit"], input[type="submit"]').should('be.visible');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should validate required fields', () => {
      cy.get('button[type="submit"], input[type="submit"]').click();
      cy.get(':invalid, [class*="error"], [role="alert"]').should('exist');
    });

    it('should validate email format', () => {
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('button[type="submit"], input[type="submit"]').click();
      cy.get(':invalid, [class*="error"]').should('exist');
    });

    it('should validate password requirements', () => {
      // TODO: Adjust based on actual password requirements
      cy.get('input[type="password"]').first().type('weak');
      cy.get('button[type="submit"], input[type="submit"]').click();
      cy.get('[class*="error"], [role="alert"]').should('be.visible');
    });

    it('should register successfully with valid data', () => {
      // TODO: Replace with valid test data
      cy.get('input[type="email"]').type('newuser@example.com');
      cy.get('input[type="password"]').first().type('SecurePassword123!');

      // If there's a confirm password field
      cy.get('body').then(($body) => {
        const confirmField = $body.find('input[name*="confirm"], input[placeholder*="confirm" i]');
        if (confirmField.length) {
          cy.wrap(confirmField).type('SecurePassword123!');
        }
      });

      cy.get('button[type="submit"], input[type="submit"]').click();

      // TODO: Add assertion for successful registration
      cy.screenshot('registration-success');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });`
  },

  'contact-form': {
    description: 'Contact or feedback form with message field',
    assertions: `
    it('should display contact form fields', () => {
      cy.get('input[type="email"], input[name*="email"]').should('be.visible');
      cy.get('textarea, input[name*="message"]').should('be.visible');
      cy.get('button[type="submit"], input[type="submit"]').should('be.visible');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should validate required fields', () => {
      cy.get('button[type="submit"], input[type="submit"]').click();
      cy.get(':invalid, [class*="error"], [role="alert"]').should('exist');
    });

    it('should submit contact form successfully', () => {
      cy.get('input[type="email"], input[name*="email"]').type('contact@example.com');

      // Fill name field if present
      cy.get('body').then(($body) => {
        const nameField = $body.find('input[name*="name"], input[placeholder*="name" i]');
        if (nameField.length) {
          cy.wrap(nameField).first().type('Test User');
        }
      });

      cy.get('textarea, input[name*="message"]').type('This is a test message for the contact form.');
      cy.get('button[type="submit"], input[type="submit"]').click();

      // TODO: Add assertion for successful submission
      // cy.get('[class*="success"], [class*="thank"]').should('be.visible');

      cy.screenshot('contact-submitted');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });`
  },

  'search': {
    description: 'Search page with input and results',
    assertions: `
    it('should display search input', () => {
      cy.get('input[type="search"], [role="searchbox"], input[name*="search"], input[placeholder*="search" i]')
        .should('be.visible');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should perform search and display results', () => {
      cy.get('input[type="search"], [role="searchbox"], input[name*="search"], input[placeholder*="search" i]')
        .clear()
        .type('test query{enter}');

      // Wait for results to load
      cy.get('[class*="result"], [role="list"], [class*="search"]', { timeout: 10000 })
        .should('be.visible');

      cy.screenshot('search-results');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should show results count or items', () => {
      cy.get('input[type="search"], [role="searchbox"], input[name*="search"]')
        .clear()
        .type('test{enter}');

      cy.get('[class*="result"] > *, [role="listitem"], [class*="item"]')
        .should('have.length.at.least', 1);
    });

    it('should handle no results gracefully', () => {
      cy.get('input[type="search"], [role="searchbox"], input[name*="search"]')
        .clear()
        .type('xyznonexistentquery12345{enter}');

      // Should show no results message or empty state
      cy.get('[class*="no-result"], [class*="empty"], [class*="not-found"]')
        .should('be.visible');

      cy.screenshot('search-no-results');
    });`
  },

  'table': {
    description: 'Data table with rows and columns',
    assertions: `
    it('should display table with headers', () => {
      cy.get('table, [role="table"]').should('be.visible');
      cy.get('thead th, th, [role="columnheader"]').should('have.length.at.least', 1);

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should have data rows', () => {
      cy.get('tbody tr, [role="row"]').should('have.length.at.least', 1);
      cy.screenshot('table-data');
    });

    it('should support sorting (if available)', () => {
      cy.get('body').then(($body) => {
        const sortableHeader = $body.find('th[class*="sort"], th button, [aria-sort]');
        if (sortableHeader.length) {
          cy.wrap(sortableHeader).first().click();
          cy.get('tbody tr').should('have.length.at.least', 1);
          cy.screenshot('table-sorted');
        } else {
          cy.log('No sortable columns found - skipping sort test');
        }
      });
    });

    it('should support pagination (if available)', () => {
      cy.get('body').then(($body) => {
        const pagination = $body.find('[class*="pagination"], [aria-label*="pagination"], button:contains("Next")');
        if (pagination.length) {
          cy.wrap(pagination).find('button, a').contains(/next|2|›/i).click();
          cy.get('tbody tr').should('have.length.at.least', 1);
          cy.screenshot('table-page-2');
        } else {
          cy.log('No pagination found - skipping pagination test');
        }
      });
    });`
  },

  'list': {
    description: 'List or card grid layout',
    assertions: `
    it('should display list container', () => {
      cy.get('[class*="grid"], [class*="list"], [role="list"], ul, ol')
        .should('be.visible');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should have list items', () => {
      cy.get('[class*="card"], [class*="item"], [role="listitem"], li')
        .should('have.length.at.least', 1);

      cy.screenshot('list-items');
    });

    it('should be able to click on list item', () => {
      cy.get('[class*="card"], [class*="item"], [role="listitem"], li')
        .first()
        .click();

      // TODO: Add assertion for what happens after clicking
      // cy.url().should('include', '/detail');

      cy.screenshot('list-item-clicked');
    });

    it('should support filtering (if available)', () => {
      cy.get('body').then(($body) => {
        const filter = $body.find('[class*="filter"], select, input[type="checkbox"]');
        if (filter.length) {
          cy.wrap(filter).first().click();
          cy.get('[class*="card"], [class*="item"]').should('exist');
          cy.screenshot('list-filtered');
        } else {
          cy.log('No filters found - skipping filter test');
        }
      });
    });`
  },

  'detail': {
    description: 'Detail/content page with heading and body',
    assertions: `
    it('should display page heading', () => {
      cy.get('h1').should('be.visible').and('not.be.empty');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should have main content area', () => {
      cy.get('main, [role="main"], article, .content')
        .should('be.visible');

      cy.screenshot('detail-content');
    });

    it('should have images with alt text (if present)', () => {
      cy.get('body').then(($body) => {
        const images = $body.find('img');
        if (images.length) {
          cy.get('img').each(($img) => {
            cy.wrap($img).should('have.attr', 'alt');
          });
        } else {
          cy.log('No images found on page');
        }
      });
    });

    it('should have working internal links', () => {
      cy.get('main a[href], article a[href]').first().then(($link) => {
        const href = $link.attr('href');
        if (href && !href.startsWith('http') && !href.startsWith('mailto')) {
          cy.wrap($link).click();
          cy.url().should('not.equal', '');
        }
      });
    });`
  },

  'generic': {
    description: 'Generic page template',
    assertions: `
    it('should load page successfully', () => {
      cy.get('body').should('be.visible');
      cy.screenshot('page-loaded');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should have proper page structure', () => {
      // Check for basic semantic structure
      cy.get('header, nav, main, footer, [role="banner"], [role="navigation"], [role="main"]')
        .should('have.length.at.least', 1);
    });

    it('should have accessible heading hierarchy', () => {
      cy.get('h1').should('have.length.at.least', 1);
    });

    // TODO: Add more specific tests based on page functionality`
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    name: null,
    type: 'generic',
    url: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
      case '-n':
        options.name = args[++i];
        break;
      case '--type':
      case '-t':
        options.type = args[++i];
        break;
      case '--url':
      case '-u':
        options.url = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--list':
      case '-l':
        listPageTypes();
        process.exit(0);
    }
  }

  return options;
}

function listPageTypes() {
  console.log('\nAvailable page types:\n');
  Object.entries(pageTemplates).forEach(([type, config]) => {
    console.log(`  ${type.padEnd(20)} - ${config.description}`);
  });
  console.log('');
}

function showHelp() {
  console.log(`
Cypress Test Scaffolder
=======================

Generate Cypress test files from templates based on page type.

Usage:
  npm run scaffold:test -- [options]

Options:
  -n, --name <name>    Test file name (without .cy.js extension)
  -t, --type <type>    Page type (default: generic)
  -u, --url <url>      URL to test against
  -l, --list           List available page types
  -h, --help           Show this help message

Examples:
  npm run scaffold:test -- --name login --type login-form --url http://example.com/login
  npm run scaffold:test -- -n search-page -t search -u http://example.com/search
  npm run scaffold:test -- --list

Page Types:
`);
  listPageTypes();
}

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateTestFile(options) {
  const template = pageTemplates[options.type];
  if (!template) {
    console.error(`Error: Unknown page type "${options.type}"`);
    console.log('Use --list to see available page types');
    process.exit(1);
  }

  const testName = options.name || `${options.type}-test`;
  const filename = sanitizeFilename(testName);
  const url = options.url || 'http://localhost:3000';

  const describeName = testName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const content = `/**
 * ${describeName} Tests
 * Page Type: ${options.type}
 * Generated by: npm run scaffold:test
 *
 * TODO: Review and customize the generated assertions
 */

describe('${describeName}', () => {
  beforeEach(() => {
    cy.visit('${url}');
    cy.injectAxe();
  });
${template.assertions}
});
`;

  return { filename, content };
}

function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.name && !options.url) {
    console.log('\nInteractive mode - please provide options:\n');
    showHelp();
    process.exit(1);
  }

  const { filename, content } = generateTestFile(options);
  const outputPath = path.join(process.cwd(), 'cypress', 'e2e', `${filename}.cy.js`);

  // Check if file already exists
  if (fs.existsSync(outputPath)) {
    console.error(`Error: File already exists: ${outputPath}`);
    console.log('Please choose a different name or delete the existing file.');
    process.exit(1);
  }

  // Write the file
  fs.writeFileSync(outputPath, content);
  console.log(`\nCreated: ${outputPath}`);
  console.log(`\nPage type: ${options.type}`);
  console.log(`URL: ${options.url || 'http://localhost:3000 (default)'}`);
  console.log('\nNext steps:');
  console.log('  1. Review and customize the generated test file');
  console.log('  2. Update TODO comments with actual values');
  console.log(`  3. Run: npx cypress run --spec "cypress/e2e/${filename}.cy.js"`);
  console.log('');
}

main();
