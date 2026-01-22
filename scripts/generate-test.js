#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Page analysis logic (ported from Chrome extension)
const pageAnalyzer = {
  async analyze(page) {
    const features = await page.evaluate(() => {
      // Password field detection
      const passwordFields = document.querySelectorAll('input[type="password"]');
      const hasPasswordField = passwordFields.length > 0;

      // Email field detection
      const emailFields = document.querySelectorAll(
        'input[type="email"], input[name*="email"], input[id*="email"], input[autocomplete="email"]'
      );
      const hasEmailField = emailFields.length > 0;

      // Username field detection
      const usernameFields = document.querySelectorAll(
        'input[name*="user"], input[id*="user"], input[name*="login"], input[autocomplete="username"]'
      );
      const hasUsernameField = usernameFields.length > 0;

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
      const tables = document.querySelectorAll('table');
      let hasTable = false;
      for (const table of tables) {
        const hasHeaders = table.querySelector('thead th, th') !== null;
        const rows = table.querySelectorAll('tbody tr, tr');
        const hasMultipleRows = rows.length > 1;
        const role = table.getAttribute('role');
        const isLayoutTable = role === 'presentation' || role === 'none';
        if (hasHeaders && hasMultipleRows && !isLayoutTable) {
          hasTable = true;
          break;
        }
      }

      // List detection (card grids, item lists)
      const listContainers = document.querySelectorAll(
        '[class*="grid"], [class*="list"], [class*="card"], ' +
        '[role="list"], ul[class], ol[class]'
      );
      let hasList = false;
      for (const container of listContainers) {
        const children = container.children;
        if (children.length >= 3) {
          const firstChild = children[0];
          const firstTagName = firstChild.tagName;
          let similarCount = 0;
          for (let i = 1; i < children.length; i++) {
            if (children[i].tagName === firstTagName) {
              similarCount++;
            }
          }
          if (similarCount / (children.length - 1) > 0.5) {
            hasList = true;
            break;
          }
        }
      }

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

      // Form field count
      const forms = document.querySelectorAll('form');
      let formFieldCount = 0;
      forms.forEach(form => {
        formFieldCount += form.querySelectorAll('input, select, textarea').length;
      });
      if (formFieldCount === 0) {
        formFieldCount = document.querySelectorAll('input').length;
      }

      // Navigation detection
      const hasNavigation = document.querySelector('nav, [role="navigation"]') !== null;

      // Button detection
      const buttons = document.querySelectorAll('button, input[type="submit"], [role="button"]');
      const buttonCount = buttons.length;

      // Link detection
      const links = document.querySelectorAll('a[href]');
      const linkCount = links.length;

      // Image detection
      const images = document.querySelectorAll('img');
      const imageCount = images.length;

      // Get page title
      const pageTitle = document.title || '';

      // Get visible text for context
      const bodyText = document.body?.innerText?.substring(0, 1000) || '';

      return {
        hasPasswordField,
        hasEmailField,
        hasUsernameField,
        hasSearchInput,
        hasTable,
        hasList,
        formFieldCount,
        hasConfirmPassword,
        hasTextarea,
        hasResultsContainer,
        hasSingleH1,
        hasMainContent,
        hasNavigation,
        buttonCount,
        linkCount,
        imageCount,
        pageTitle,
        bodyText
      };
    });

    const pageType = this.classifyPage(features);
    const confidence = this.calculateConfidence(pageType, features);

    return {
      pageType,
      confidence,
      features
    };
  },

  classifyPage(features) {
    // Login Form: password + email/user fields, ≤4 fields
    if (features.hasPasswordField &&
        !features.hasConfirmPassword &&
        features.formFieldCount <= 4 &&
        (features.hasEmailField || features.hasUsernameField)) {
      return 'login-form';
    }

    // Registration Form: password + confirm password, >4 fields
    if (features.hasPasswordField &&
        features.hasConfirmPassword) {
      return 'registration-form';
    }

    // Contact Form: email + textarea, no password
    if (features.hasEmailField &&
        features.hasTextarea &&
        !features.hasPasswordField) {
      return 'contact-form';
    }

    // Search Page: search input + results container
    if (features.hasSearchInput) {
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

    // Detail Page: single h1, main content
    if (features.hasSingleH1 && features.hasMainContent) {
      return 'detail';
    }

    return 'generic';
  },

  calculateConfidence(pageType, features) {
    let confidence = 50;

    switch (pageType) {
      case 'login-form':
        if (features.hasPasswordField) confidence += 25;
        if (features.hasEmailField || features.hasUsernameField) confidence += 15;
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
        if (features.hasSearchInput) confidence += 30;
        if (features.hasResultsContainer) confidence += 20;
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
        break;

      default:
        confidence = 30;
    }

    return Math.min(100, confidence);
  }
};

// Page type templates (same as scaffold-test.js)
const pageTemplates = {
  'login-form': {
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

      // TODO: Add assertion for successful login
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

    it('should register successfully with valid data', () => {
      // TODO: Replace with valid test data
      cy.get('input[type="email"]').type('newuser@example.com');
      cy.get('input[type="password"]').first().type('SecurePassword123!');

      cy.get('body').then(($body) => {
        const confirmField = $body.find('input[name*="confirm"], input[placeholder*="confirm" i]');
        if (confirmField.length) {
          cy.wrap(confirmField).type('SecurePassword123!');
        }
      });

      cy.get('button[type="submit"], input[type="submit"]').click();
      cy.screenshot('registration-success');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });`
  },

  'contact-form': {
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

      cy.get('body').then(($body) => {
        const nameField = $body.find('input[name*="name"], input[placeholder*="name" i]');
        if (nameField.length) {
          cy.wrap(nameField).first().type('Test User');
        }
      });

      cy.get('textarea, input[name*="message"]').type('This is a test message.');
      cy.get('button[type="submit"], input[type="submit"]').click();

      cy.screenshot('contact-submitted');
      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });`
  },

  'search': {
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
    });`
  },

  'table': {
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
        const pagination = $body.find('[class*="pagination"], [aria-label*="pagination"]');
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

      cy.screenshot('list-item-clicked');
    });`
  },

  'detail': {
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
    });`
  },

  'generic': {
    assertions: `
    it('should load page successfully', () => {
      cy.get('body').should('be.visible');
      cy.screenshot('page-loaded');

      cy.checkA11y(null, { includedImpacts: ['critical', 'serious'] });
    });

    it('should have proper page structure', () => {
      cy.get('header, nav, main, footer, [role="banner"], [role="navigation"], [role="main"]')
        .should('have.length.at.least', 1);
    });

    it('should have accessible heading hierarchy', () => {
      cy.get('h1').should('have.length.at.least', 1);
    });`
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: null,
    name: null,
    help: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
      case '-u':
        options.url = args[++i];
        break;
      case '--name':
      case '-n':
        options.name = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Cypress Test Generator
======================

Analyze a URL and generate Cypress tests based on detected page type.

Usage:
  npm run generate:test -- --url <url> [options]

Options:
  -u, --url <url>      URL to analyze and generate tests for (required)
  -n, --name <name>    Test file name (auto-generated from URL if not provided)
  -v, --verbose        Show detailed analysis information
  -h, --help           Show this help message

Examples:
  npm run generate:test -- --url http://example.com/login
  npm run generate:test -- -u http://example.com/products -n product-listing
  npm run generate:test -- --url http://example.com/search --verbose

The generator will:
  1. Visit the URL in a headless browser
  2. Analyze the page structure
  3. Detect the page type (login, search, table, etc.)
  4. Generate appropriate test assertions
`);
}

function sanitizeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function generateTestName(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/^\/|\/$/g, '');
    if (pathname) {
      return sanitizeFilename(pathname);
    }
    return sanitizeFilename(parsed.hostname.replace('www.', ''));
  } catch {
    return 'generated-test';
  }
}

function generateTestFile(url, name, pageType, features) {
  const template = pageTemplates[pageType];
  const testName = name || generateTestName(url);
  const filename = sanitizeFilename(testName);

  const describeName = testName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const content = `/**
 * ${describeName} Tests
 * URL: ${url}
 * Detected Page Type: ${pageType}
 * Generated by: npm run generate:test
 *
 * Page Analysis:
 * - Password field: ${features.hasPasswordField ? 'Yes' : 'No'}
 * - Email field: ${features.hasEmailField ? 'Yes' : 'No'}
 * - Search input: ${features.hasSearchInput ? 'Yes' : 'No'}
 * - Data table: ${features.hasTable ? 'Yes' : 'No'}
 * - List/Grid: ${features.hasList ? 'Yes' : 'No'}
 * - Form fields: ${features.formFieldCount}
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

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.url) {
    console.error('Error: URL is required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  // Validate URL
  try {
    new URL(options.url);
  } catch {
    console.error(`Error: Invalid URL "${options.url}"`);
    process.exit(1);
  }

  console.log(`\nAnalyzing: ${options.url}\n`);

  let browser;
  try {
    // Launch browser with realistic settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to URL
    console.log('Loading page...');
    await page.goto(options.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Analyze page
    console.log('Analyzing page structure...');
    const analysis = await pageAnalyzer.analyze(page);

    console.log(`\nDetected page type: ${analysis.pageType} (${analysis.confidence}% confidence)`);

    if (options.verbose) {
      console.log('\nPage features:');
      console.log(`  - Password field: ${analysis.features.hasPasswordField}`);
      console.log(`  - Email field: ${analysis.features.hasEmailField}`);
      console.log(`  - Username field: ${analysis.features.hasUsernameField}`);
      console.log(`  - Search input: ${analysis.features.hasSearchInput}`);
      console.log(`  - Data table: ${analysis.features.hasTable}`);
      console.log(`  - List/Grid: ${analysis.features.hasList}`);
      console.log(`  - Textarea: ${analysis.features.hasTextarea}`);
      console.log(`  - Form field count: ${analysis.features.formFieldCount}`);
      console.log(`  - Has main content: ${analysis.features.hasMainContent}`);
      console.log(`  - Single H1: ${analysis.features.hasSingleH1}`);
      console.log(`  - Page title: ${analysis.features.pageTitle}`);
    }

    // Generate test file
    const { filename, content } = generateTestFile(
      options.url,
      options.name,
      analysis.pageType,
      analysis.features
    );

    const outputPath = path.join(process.cwd(), 'cypress', 'e2e', `${filename}.cy.js`);

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      console.error(`\nError: File already exists: ${outputPath}`);
      console.log('Please choose a different name with --name or delete the existing file.');
      process.exit(1);
    }

    // Write the file
    fs.writeFileSync(outputPath, content);

    console.log(`\nCreated: ${outputPath}`);
    console.log(`\nPage type: ${analysis.pageType}`);
    console.log(`Confidence: ${analysis.confidence}%`);
    console.log('\nNext steps:');
    console.log('  1. Review and customize the generated test file');
    console.log('  2. Update TODO comments with actual values');
    console.log(`  3. Run: npx cypress run --spec "cypress/e2e/${filename}.cy.js"`);
    console.log('');

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
