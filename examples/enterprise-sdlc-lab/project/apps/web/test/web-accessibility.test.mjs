import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const htmlPath = join(import.meta.dirname, '../public/index.html');
const htmlContent = readFileSync(htmlPath, 'utf8');

test('Web Accessibility: validates semantic structure and WCAG 2.1 AA landmarks', () => {
  // Document language
  assert.match(htmlContent, /<html\s+lang="en">/i, 'HTML element must declare lang attribute');

  // Skip link
  assert.match(htmlContent, /<a\s+href="#main-content"\s+class="skip-link"/i, 'Must provide accessible skip link');

  // Landmark roles
  assert.match(htmlContent, /<header\s+role="banner"/i, 'Header must declare banner role');
  assert.match(htmlContent, /<main\s+id="main-content"\s+role="main"/i, 'Main container must declare main role');
  assert.match(htmlContent, /<footer\s+role="contentinfo"/i, 'Footer must declare contentinfo role');

  // Screen reader live announcements
  assert.match(htmlContent, /aria-live="polite"/i, 'Must provide live announcer region for screen readers');

  // Accessible data table headers
  assert.match(htmlContent, /<th\s+scope="col">/i, 'Table headers must define scope attribute');

  // Form label associations
  assert.match(htmlContent, /<label\s+for="tenant-select">/i);
  assert.match(htmlContent, /<select\s+id="tenant-select"/i);
  assert.match(htmlContent, /<label\s+for="user-role-select">/i);
  assert.match(htmlContent, /<select\s+id="user-role-select"/i);
});
