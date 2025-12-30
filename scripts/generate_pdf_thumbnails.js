#!/usr/bin/env node
// scripts/generate_pdf_thumbnails.js
// Generate first-page thumbnails for PDF files in a Supabase Storage bucket
// Usage examples:
//   node scripts/generate_pdf_thumbnails.js COMPANY_PROFILE
//   node scripts/generate_pdf_thumbnails.js TACBECON/TECHNICAL_DATA_SHEET/ANTI_SIEZE

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET_NSG || 'NSG-LMS';
const BUCKET_NAME = process.env.SUPABASE_BUCKET_OVERRIDE || DEFAULT_BUCKET;
const THUMBNAIL_PREFIX = '.thumbnails';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment or .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const prefixArg = process.argv[2] || '';

async function listPdfFiles(prefix) {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(cleanPrefix, { limit: 1000, offset: 0 });

  if (error) {
    throw new Error(`Error listing files for prefix "${cleanPrefix}": ${error.message}`);
  }

  const files = (data || [])
    .filter((obj) => obj.name.toLowerCase().endsWith('.pdf'))
    .map((obj) => (cleanPrefix ? `${cleanPrefix}/${obj.name}` : obj.name));

  return files;
}

async function thumbnailExists(pdfPath) {
  const thumbPath = `${THUMBNAIL_PREFIX}/${pdfPath}.jpg`;
  const dir = thumbPath.split('/').slice(0, -1).join('/');
  const name = thumbPath.split('/').slice(-1)[0];

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(dir, { limit: 1000, search: name });

  if (error) {
    return false;
  }

  return (data || []).some((obj) => obj.name === name);
}

async function createSignedUrl(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600);

  if (error) {
    throw new Error(`Error creating signed URL for ${path}: ${error.message}`);
  }

  return data.signedUrl;
}

async function uploadThumbnail(pdfPath, buffer) {
  const thumbPath = `${THUMBNAIL_PREFIX}/${pdfPath}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(thumbPath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Error uploading thumbnail for ${pdfPath}: ${error.message}`);
  }

  return thumbPath;
}

async function generateThumbnailForPdf(browser, pdfPath) {
  console.log(`\n📄 Processing: ${pdfPath}`);

  if (await thumbnailExists(pdfPath)) {
    console.log('   ✅ Thumbnail already exists, skipping.');
    return;
  }

  const signedUrl = await createSignedUrl(pdfPath);

  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1 });

  try {
    console.log('   🌐 Opening PDF in headless Chrome...');
    await page.goto(signedUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Tunggu sebentar supaya PDF viewer render
    await page.waitForTimeout(3000);

    console.log('   📸 Taking screenshot...');
    const buffer = await page.screenshot({ type: 'jpeg', fullPage: false });

    if (!buffer || !buffer.length) {
      throw new Error('Empty screenshot buffer');
    }

    const thumbPath = await uploadThumbnail(pdfPath, buffer);
    console.log(`   ✅ Thumbnail uploaded to: ${thumbPath}`);
  } finally {
    await page.close();
  }
}

async function main() {
  if (!prefixArg) {
    console.error('Usage: node scripts/generate_pdf_thumbnails.js <folder-prefix>');
    console.error('Example: node scripts/generate_pdf_thumbnails.js COMPANY_PROFILE');
    process.exit(1);
  }

  console.log(`📂 Generating PDF thumbnails under prefix: ${prefixArg}`);

  const pdfFiles = await listPdfFiles(prefixArg);

  if (!pdfFiles.length) {
    console.log('No PDF files found for this prefix.');
    return;
  }

  console.log(`Found ${pdfFiles.length} PDF file(s).`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const pdfPath of pdfFiles) {
      try {
        await generateThumbnailForPdf(browser, pdfPath);
      } catch (err) {
        console.error(`   ❌ Failed for ${pdfPath}:`, err.message || err);
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n✨ Done generating PDF thumbnails.');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message || err);
  process.exit(1);
});
