/**
 * PDF Thumbnail API
 * 
 * This endpoint returns a thumbnail URL for a PDF file.
 * Since generating PDF thumbnails requires heavy dependencies (GraphicsMagick, etc.),
 * we use a simpler approach: store pre-generated thumbnails or use placeholder.
 * 
 * For production, consider:
 * 1. Supabase Edge Function with Deno PDF library
 * 2. AWS Lambda with pdf-lib
 * 3. Pre-generate thumbnails when PDFs are uploaded
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

const DEFAULT_BUCKET = process.env.SUPABASE_BUCKET_NSG || 'NSG-LMS';
const BUCKET_NAME = process.env.SUPABASE_BUCKET_OVERRIDE || DEFAULT_BUCKET;
const THUMBNAIL_FOLDER = '.thumbnails';

/**
 * Check if a pre-generated thumbnail exists for the PDF
 */
async function getExistingThumbnail(pdfPath) {
  const thumbnailPath = `${THUMBNAIL_FOLDER}/${pdfPath.replace(/\.pdf$/i, '.jpg')}`;
  
  try {
    // Try to get file info
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(THUMBNAIL_FOLDER.replace(/^\//, ''), {
        limit: 1,
        search: pdfPath.replace(/\.pdf$/i, '.jpg').split('/').pop(),
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    // Return signed URL for thumbnail
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(thumbnailPath, 3600);

    return signedData?.signedUrl || null;
  } catch {
    return null;
  }
}

// Express handler
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pdfPath = req.body?.pdfPath || req.query?.pdfPath;

  if (!pdfPath) {
    return res.status(400).json({ error: 'pdfPath is required' });
  }

  try {
    const thumbnailUrl = await getExistingThumbnail(pdfPath);
    
    if (thumbnailUrl) {
      return res.status(200).json({ thumbnailUrl, cached: true });
    }
    
    // No pre-generated thumbnail exists
    // Return null - client will show icon instead
    return res.status(200).json({ thumbnailUrl: null, cached: false });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

