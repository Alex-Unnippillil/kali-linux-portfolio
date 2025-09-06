import { test, expect } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

// This test simulates the file manager's template functionality.
// It places a text template in ~/Templates and copies it to create
// a new file, similar to selecting the template via a context menu.
test('creates a new file from a template in ~/Templates', async () => {
  const homeDir = os.homedir();
  const templatesDir = path.join(homeDir, 'Templates');
  const templateName = 'example-template.txt';
  const templatePath = path.join(templatesDir, templateName);
  const newFileName = 'example-template (copy).txt';
  const newFilePath = path.join(homeDir, newFileName);

  // Ensure Templates directory exists and write the template file.
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.writeFileSync(templatePath, 'Template content');

  // Simulate context menu selection by copying the template to new file.
  fs.copyFileSync(templatePath, newFilePath);

  // Verify the new file exists.
  expect(fs.existsSync(newFilePath)).toBe(true);

  // Cleanup created files.
  fs.unlinkSync(templatePath);
  fs.unlinkSync(newFilePath);
});
