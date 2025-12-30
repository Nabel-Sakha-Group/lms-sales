// SharePoint Configuration
export const SHAREPOINT_CONFIG = {
  // OPSI 1: Untuk testing langsung (tanpa Azure AD)
  // Cukup isi site URL dan credentials Anda
  siteUrl: 'https://yourcompany.sharepoint.com/sites/yoursite',
  
  // Username dan password (untuk dev/testing only)
  // JANGAN commit credentials ke git!
  username: 'your.email@company.com',
  password: 'your-password',
  
  // Document Library name di SharePoint
  libraryName: 'Documents',
  
  // Folder paths untuk video dan PDF
  videoFolder: 'Videos',
  pdfFolder: 'PDFs',
  
  // OPSI 2: Untuk production dengan Azure AD (optional)
  // Uncomment jika mau pakai Azure AD authentication
  /*
  tenantId: 'YOUR_TENANT_ID',
  clientId: 'YOUR_CLIENT_ID',
  redirectUri: 'msauth://com.yourcompany.lmssales/auth',
  scopes: [
    'Files.Read',
    'Files.Read.All',
    'Sites.Read.All',
  ],
  */
};
