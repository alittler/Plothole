// Google Drive API helper for uploading files/images directly to user's Google Drive
export interface GoogleDriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Uploads a file (File object or Data URL blob) to Google Drive using the user's OAuth access token.
 */
export async function uploadImageToGoogleDrive(
  accessToken: string,
  fileOrBlob: File | Blob,
  fileName: string,
  mimeType: string = 'image/png'
): Promise<GoogleDriveUploadResult> {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: 'Fantasy Atlas Map image uploaded from PlotHole Fantasy Cartographer'
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', fileOrBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink
  };
}
