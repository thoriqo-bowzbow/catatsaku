import { Transaction, Category, BankAccount } from '../types';

/**
 * Searches for a spreadsheet named 'CatatSaku: Keuangan Spreadsheet' in the user's Drive.
 */
export async function findSpreadsheet(token: string): Promise<string | null> {
  try {
    const q = encodeURIComponent("name = 'CatatSaku: Keuangan Spreadsheet' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error('findSpreadsheet Error:', errorMsg);
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error finding spreadsheet:', error);
    return null;
  }
}

/**
 * Creates a brand new spreadsheet styled for CatatSaku.
 */
export async function createSpreadsheet(token: string): Promise<{ id: string; url: string } | null> {
  try {
    const url = 'https://sheets.googleapis.com/v4/spreadsheets';
    const body = {
      properties: {
        title: 'CatatSaku: Keuangan Spreadsheet'
      },
      sheets: [
        {
          properties: {
            title: 'Transaksi',
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 7
            }
          }
        },
        {
          properties: {
            title: 'Kategori Anggaran',
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 4
            }
          }
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error('createSpreadsheet Error:', errorMsg);
      return null;
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl;

    // Create Headers in sheets
    await initializeSpreadsheetHeaders(token, spreadsheetId);

    return { id: spreadsheetId, url: spreadsheetUrl };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    return null;
  }
}

/**
 * Initializes the header row for Transaksi & Kategori sheets inside the spreadsheet.
 */
async function initializeSpreadsheetHeaders(token: string, spreadsheetId: string): Promise<boolean> {
  try {
    // 1. Transaksi sheet headers
    const txHeadersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A1:G1?valueInputOption=RAW`;
    const trxBody = {
      range: 'Transaksi!A1:G1',
      majorDimension: 'ROWS',
      values: [
        ['ID Transaksi', 'Tanggal', 'Tipe Aliran', 'Kategori Pengeluaran/Pemasukan', 'Jumlah Uang (Rupiah)', 'Catatan / Deskripsi', 'Metode Pembayaran (Bank)']
      ]
    };

    const txRes = await fetch(txHeadersUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trxBody)
    });

    // 2. Kategori sheet headers
    const catHeadersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kategori Anggaran!A1:D1?valueInputOption=RAW`;
    const catBody = {
      range: 'Kategori Anggaran!A1:D1',
      majorDimension: 'ROWS',
      values: [
        ['ID Kategori', 'Nama Kategori', 'Format Aliran', 'Limit Anggaran Bulanan (Rupiah)']
      ]
    };

    const catRes = await fetch(catHeadersUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(catBody)
    });

    return txRes.ok && catRes.ok;
  } catch (e) {
    console.error('Failed to initialize sheet headers:', e);
    return false;
  }
}

/**
 * Synchronizes entire transactions list to Google Sheets.
 * Overwrites everything below headers for true sync.
 */
export async function syncAllToSheets(
  token: string,
  spreadsheetId: string,
  transactions: Transaction[],
  categories: Category[]
): Promise<boolean> {
  try {
    // Sync Transaksi
    const txUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A2:G1000?valueInputOption=USER_ENTERED`;
    
    // Sort transactions oldest to newest so they appear chronologically inside spreadsheet
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const txValues = sortedTx.map(tx => [
      tx.id,
      tx.date,
      tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      tx.category,
      tx.amount,
      tx.note || '',
      tx.bankName || 'Dompet Manual'
    ]);

    // Fill with empty strings to clear out deleted items in the sheet
    const maxFillLength = Math.max(100, txValues.length + 10);
    const paddedTxValues = [...txValues];
    while (paddedTxValues.length < maxFillLength) {
      paddedTxValues.push(['', '', '', '', '', '', '']);
    }

    const txBody = {
      range: 'Transaksi!A2:G1000',
      majorDimension: 'ROWS',
      values: paddedTxValues
    };

    const txResponse = await fetch(txUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(txBody)
    });

    // Sync Categories
    const catUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kategori Anggaran!A2:D100?valueInputOption=USER_ENTERED`;
    const catValues = categories.map(cat => [
      cat.id,
      cat.name,
      cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      cat.budget || 'Tidak ada limit'
    ]);

    const maxCatLength = Math.max(20, catValues.length + 5);
    const paddedCatValues = [...catValues];
    while (paddedCatValues.length < maxCatLength) {
      paddedCatValues.push(['', '', '', '']);
    }

    const catBody = {
      range: 'Kategori Anggaran!A2:D100',
      majorDimension: 'ROWS',
      values: paddedCatValues
    };

    const catResponse = await fetch(catUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(catBody)
    });

    return txResponse.ok && catResponse.ok;
  } catch (error) {
    console.error('Error syncing all data to sheets:', error);
    return false;
  }
}

/**
 * Creates/Updates JSON data snapshot as backup in Google Drive.
 */
export async function backupDataToDrive(
  token: string,
  payload: {
    transactions: Transaction[];
    categories: Category[];
    bankAccounts: BankAccount[];
  }
): Promise<{ fileId: string; webViewLink?: string } | null> {
  try {
    // 1. Search if an existing backup file exists
    const q = encodeURIComponent("name = 'catatsaku_backup.json' and mimeType = 'application/json' and trashed = false");
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,webViewLink)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    let fileId: string | null = null;
    let webViewLink = '';

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
        webViewLink = searchData.files[0].webViewLink;
      }
    }

    const metadata = {
      name: 'catatsaku_backup.json',
      mimeType: 'application/json'
    };

    const fileContent = JSON.stringify({
      ...payload,
      backupDate: new Date().toISOString()
    }, null, 2);

    if (fileId) {
      // 2a. Overwrite existing file content (Media upload PATCH)
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const updateRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: fileContent
      });

      if (updateRes.ok) {
        return { fileId, webViewLink };
      }
    } else {
      // 2b. Create new file metadata
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (createRes.ok) {
        const createdFile = await createRes.json();
        const newFileId = createdFile.id;

        // Upload properties to body
        const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`;
        const contentRes = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: fileContent
        });

        if (contentRes.ok) {
          // Fetch webViewLink of new file
          const detailRes = await fetch(`https://www.googleapis.com/drive/v3/files/${newFileId}?fields=webViewLink`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const detailData = await detailRes.json();
          return { fileId: newFileId, webViewLink: detailData.webViewLink };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error backing up data to Drive:', error);
    return null;
  }
}
