# Setup SharePoint Integration

## Pilihan 1: Menggunakan Microsoft Graph API (Lebih Mudah untuk Development)

Jika Anda sudah punya akun Microsoft 365, Anda bisa langsung akses SharePoint dengan:

### 1. Gunakan Personal Access Token atau OAuth Token

Cara termudah untuk testing:

1. Buka [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in dengan akun Microsoft 365 Anda
3. Beri consent untuk permissions yang dibutuhkan
4. Gunakan token dari Graph Explorer untuk testing

### 2. Atau Gunakan SharePoint REST API Directly

SharePoint juga punya REST API sendiri yang bisa diakses dengan credentials:

```typescript
// Akses langsung ke SharePoint REST API
const siteUrl = 'https://yourcompany.sharepoint.com/sites/yoursite';
const listName = 'Documents';

// Endpoint untuk get items
const endpoint = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`;
```

### 3. Update Service untuk Gunakan SharePoint REST API

Tidak perlu Azure AD setup, cukup gunakan SharePoint credentials langsung.

---

## Pilihan 2: Setup Azure AD (Untuk Production)

### 1. Azure AD App Registration

1. Pergi ke [Azure Portal](https://portal.azure.com)
2. Pilih **Azure Active Directory** > **App registrations** > **New registration**
3. Isi form:
   - **Name**: LMS Sales App
   - **Supported account types**: Pilih sesuai kebutuhan
   - **Redirect URI**: 
     - Platform: Public client/native
     - URI: `msauth://com.yourcompany.lmssales/auth`
4. Klik **Register**
5. Catat **Application (client) ID** dan **Directory (tenant) ID**

### 2. Configure API Permissions

1. Di App Registration yang baru dibuat, pilih **API permissions**
2. Klik **Add a permission** > **Microsoft Graph**
3. Pilih **Delegated permissions** dan tambahkan:
   - `Files.Read`
   - `Files.Read.All`
   - `Sites.Read.All`
4. Klik **Add permissions**
5. Klik **Grant admin consent** (jika Anda admin)

### 3. Update Konfigurasi

Edit file `config/sharepoint.config.ts`:

```typescript
export const SHAREPOINT_CONFIG = {
  tenantId: 'YOUR_TENANT_ID_FROM_AZURE',
  clientId: 'YOUR_CLIENT_ID_FROM_AZURE',
  siteUrl: 'https://yourcompany.sharepoint.com/sites/yoursite',
  libraryName: 'Documents',
  videoFolder: 'Videos',
  pdfFolder: 'PDFs',
  redirectUri: 'msauth://com.yourcompany.lmssales/auth',
  scopes: [
    'Files.Read',
    'Files.Read.All',
    'Sites.Read.All',
  ],
};
```

### 4. Install Dependencies

```bash
npm install @azure/msal-react-native react-native-inappbrowser-reborn
```

Atau dengan Expo:

```bash
npx expo install @azure/msal-react-native react-native-inappbrowser-reborn
```

### 5. Update Auth Service

Ganti implementasi di `services/auth.service.ts` dengan MSAL library yang sebenarnya.

### 6. Struktur Folder SharePoint

Di SharePoint, buat struktur folder seperti ini:

```
Documents/
├── Videos/
│   ├── video1.mp4
│   ├── video2.mp4
│   └── ...
└── PDFs/
    ├── document1.pdf
    ├── document2.pdf
    └── ...
```

### 7. Test Connection

```typescript
import sharepointService from './services/sharepoint.service';
import authService from './services/auth.service';

// Login
const { accessToken } = await authService.login();
sharepointService.setAccessToken(accessToken);

// Get videos
const videos = await sharepointService.getVideos();
console.log('Videos:', videos);

// Get PDFs
const pdfs = await sharepointService.getPDFs();
console.log('PDFs:', pdfs);
```

## Cara Penggunaan di Component

```typescript
import { useState, useEffect } from 'react';
import sharepointService, { SharePointFile } from '../services/sharepoint.service';
import authService from '../services/auth.service';

function MyComponent() {
  const [videos, setVideos] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      // Login jika belum
      if (!authService.isAuthenticated()) {
        const { accessToken } = await authService.login();
        sharepointService.setAccessToken(accessToken);
      }
      
      // Ambil videos
      const data = await sharepointService.getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your UI here
  );
}
```

## Alternative: Gunakan Microsoft Graph SDK

Untuk implementasi yang lebih robust:

```bash
npm install @microsoft/microsoft-graph-client
```

## Troubleshooting

### Error: "Access token not set"
- Pastikan sudah login dan set access token

### Error: "403 Forbidden"
- Periksa API permissions di Azure AD
- Pastikan admin sudah grant consent

### Error: "Site not found"
- Periksa `siteUrl` di config
- Pastikan user punya akses ke SharePoint site

## Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [MSAL React Native](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react-native)
- [SharePoint REST API](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
