// Version 2 - updated backend actions
var PO_PDF_FOLDER_ID = "1Hzz1nxg1A_rDaigFZ6ZMxpB2-AzSmIhM";
var CACHE_EXPIRY_SEC = 60; // seconds for CacheService TTL

// ── Single spreadsheet handle per execution ──────────────────
let _ss = null;
function getSpreadsheet() {
    if (!_ss) {
        var id = "1DYTq5KGS-lDGFbKqXB8xpLy0I6VM0YeUsuW5CvCd_n0";
        try {
            if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID) {
                id = SPREADSHEET_ID;
            }
        } catch (e) { }
        _ss = SpreadsheetApp.openById(id);
    }
    return _ss;
}

// ── In-execution sheet-data cache (avoids double reads & trailing empty cells) ──────
const _sheetDataCache = {};
function getSheetData(sheet) {
    const name = sheet.getName();
    if (!_sheetDataCache[name]) {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow < 1 || lastCol < 1) {
            _sheetDataCache[name] = [];
        } else {
            _sheetDataCache[name] = sheet.getRange(1, 1, lastRow, lastCol).getValues();
        }
    }
    return _sheetDataCache[name];
}
function invalidateSheetData(sheetName) {
    delete _sheetDataCache[sheetName];
}

// ── CacheService layer for read requests ─────────────────────
const _appCache = CacheService.getScriptCache();

function getCached(key) {
    try {
        const raw = _appCache.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function putCached(key, data) {
    try {
        const s = JSON.stringify(data);
        if (s.length < 95000) _appCache.put(key, s, CACHE_EXPIRY_SEC);
    } catch (e) { /* silent */ }
}

function bustedCacheKey(sheetName) {
    return 'sheet_' + sheetName;
}

function bustCache(sheetName) {
    try { _appCache.remove(bustedCacheKey(sheetName)); } catch (e) { }
}

// ─────────────────────────────────────────────────────────────
//  Schema definitions
// ─────────────────────────────────────────────────────────────
const SHEET_CONFIGS = {
    'FMS': {
        headerRow: 6,
        columnMap: {
            'Timestamp': 'timestamp',
            'Serial No': 'serialNo',
            'PO Number': 'poNumber',
            'Vendor Name': 'vendorName',
            'Total Quantity': 'totalQuantity',
            'Location': 'location',
            'Address': 'address',
            'Created By': 'createdBy',
            'PO Received Date': 'poReceivedDate',
            'PO Expired Date': 'poExpiredDate',
            'PO PDF': 'poPdfName',
            'Planned 1': 'planned1',
            'Actual 1': 'actual1',
            'Delay 1': 'delay1',
            'Bill Number': 'billNumber',
            'Bill Amount': 'billAmount',
            'Bill Date': 'billDate',
            'Bill PDF': 'billPdf',
            'Planned 2': 'planned2',
            'Actual 2': 'actual2',
            'Delay 2': 'delay2',
            'Actual Date': 'actualDate',
            'Planned 3': 'planned3',
            'Actual 3': 'actual3',
            'Delay 3': 'delay3',
            'Transporter name': 'transporterName',
            'Transporter Name': 'transporterName',
            'Transporter': 'transporterName',
            'Vehicle Number': 'vehicleNumber',
            'Vehicle number': 'vehicleNumber',
            'Vehicle_number': 'vehicleNumber',
            'Quantity': 'quantity',
            'Delivery location': 'deliveryLocation',
            'Delivery Location': 'deliveryLocation',
            'Delivery address': 'deliveryAddress',
            'Delivery Address': 'deliveryAddress',
            'Planned 4': 'planned4',
            'Actual 4': 'actual4',
            'Delay 4': 'delay4',
            'Planned 5': 'planned5',
            'Actual 5': 'actual5',
            'Delay 5': 'delay5',
            'Planned 6': 'planned6',
            'Actual 6': 'actual6',
            'Delay 6': 'delay6',
            'Planned 7': 'planned7',
            'Actual 7': 'actual7',
            'Delay 7': 'delay7',
            'Total Paid': 'totalPaid',
            'Balance Due': 'balanceDue',
            'Payment Status': 'paymentStatus',
            'Delete Status': 'deleteStatus',
            'Delivered Qty': 'deliveredQty',
            'Pending Qty': 'pendingQty',
            'Cancel Qty': 'cancelQty',
            'Status': 'status',
            'Narration': 'narration',
            'Supply Quantity 1': 'supplyQuantity1',
            'Received Amount': 'receivedAmount',
            'Supply Quantity 2': 'supplyQuantity2',
            'Damage Qty': 'damageQty',
            'Supply Check': 'supplyCheck',
            'Extra Qty': 'extraQty',
            'Return Qty': 'returnQty',
            'Supply Check Return Qty': 'returnQty',
            'Return Quantity': 'returnQty',
            'Payment History': 'paymentHistory',
        }
    },
    'fms-2': {
        headerRow: 6,
        columnMap: {
            'Timestamp': 'timestamp',
            'Serial No': 'serialNo',
            'PO Number': 'poNumber',
            'Vendor Name': 'vendorName',
            'Total Quantity': 'totalQuantity',
            'Location': 'location',
            'Address': 'address',
            'Created By': 'createdBy',
            'PO Received Date': 'poReceivedDate',
            'PO Expired Date': 'poExpiredDate',
            'PO PDF': 'poPdfName',
            'Planned 1': 'planned1',
            'Actual 1': 'actual1',
            'Delay 1': 'delay1',
            'Bill Number': 'billNumber',
            'Bill Amount': 'billAmount',
            'Per Unit Price': 'perUnitPrice',
            'Bill Date': 'billDate',
            'Bill PDF': 'billPdf',
            'Planned 2': 'planned2',
            'Actual 2': 'actual2',
            'Delay 2': 'delay2',
            'Extra Qty': 'extraQty',
            'Transporter name': 'transporterName',
            'Quantity': 'quantity',
            'Delivery location': 'deliveryLocation',
            'Delivery address': 'deliveryAddress',
            'Planned 3': 'planned3',
            'Actual 3': 'actual3',
            'Delay 3': 'delay3',
            'Damage Qty': 'damageQty',
            'Return Qty': 'returnQty',
            'Planned 4': 'planned4',
            'Actual 4': 'actual4',
            'Delay 4': 'delay4',
            'Approve Po Price': 'approvePoPrice',
            'Approve Po Qty': 'approvePoQty',
            'Planned 5': 'planned5',
            'Actual 5': 'actual5',
            'Delay 5': 'delay5',
            'Total Paid': 'totalPaid',
            'Balance Due': 'balanceDue',
            'Payment Status': 'paymentStatus',
            'Delete Status': 'deleteStatus',
            'Delivered Qty': 'deliveredQty',
            'Pending Qty': 'pendingQty',
            'Cancel Qty': 'cancelQty',
            'Status': 'status',
            'Narration': 'narration',
            'Supply Quantity 1': 'supplyQuantity1',
            'Received Amount': 'receivedAmount',
            'Supply Quantity 2': 'supplyQuantity2',
            'Vehicle Number': 'vehicleNumber',
            'Extra Qty': 'extraQty',
            'Return Qty': 'returnQty',
            'Supply Check Return Qty': 'returnQty',
            'Return Quantity': 'returnQty',
            'Payment History': 'paymentHistory',
        }
    },
    'Login': {
        headerRow: 1,
        columnMap: {
            'ID': 'id',
            'Username': 'username',
            'Password': 'password',
            'Name': 'name',
            'Email': 'email',
            'Phone': 'phone',
            'Role': 'role',
            'Status': 'status',
            'Page Access': 'pageAccess',
            'Date Joined': 'dateJoined',
        }
    }
};

const VIRTUAL_SHEETS = {
    'Vendors': {
        masterSheet: 'Master',
        typeValue: 'Vendor',
        exposeColumns: [0, 2, 3],
        exposeHeaders: ['id', 'name', 'phone']
    },
    'Locations': {
        masterSheet: 'Master',
        typeValue: 'Location',
        exposeColumns: [2],
        exposeHeaders: ['name']
    },
    'Transporters': {
        masterSheet: 'Master',
        typeValue: 'Transporter',
        exposeColumns: [0, 2, 3],
        exposeHeaders: ['id', 'name', 'phone']
    }
};

const MASTER_TOTAL_COLS = 4;

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function jsonError(msg) {
    return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: msg }))
        .setMimeType(ContentService.MimeType.JSON);
}

function jsonSuccess(msg, extra) {
    return ContentService
        .createTextOutput(JSON.stringify({ success: true, message: msg, ...(extra || {}) }))
        .setMimeType(ContentService.MimeType.JSON);
}

function jsonData(payload) {
    return ContentService
        .createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
}

function buildMasterRow(vCfg, exposedRowData) {
    const fullRow = new Array(MASTER_TOTAL_COLS).fill('');
    fullRow[1] = vCfg.typeValue;
    vCfg.exposeColumns.forEach((col, i) => {
        fullRow[col] = exposedRowData[i] !== undefined ? exposedRowData[i] : '';
    });
    return fullRow;
}

function parseParameters(e) {
    const params = {};
    if (e && e.parameter) {
        Object.assign(params, e.parameter);
    }
    if (e && e.postData && e.postData.contents) {
        const raw = e.postData.contents.trim();
        const type = e.postData.type || '';
        if (type.includes('application/json') || (raw[0] === '{' && raw[raw.length - 1] === '}')) {
            try { Object.assign(params, JSON.parse(raw)); } catch (_) { }
        } else if (type.includes('application/x-www-form-urlencoded')) {
            raw.split('&').forEach(pair => {
                const [k, v] = pair.split('=');
                if (k) params[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent((v || '').replace(/\+/g, ' '));
            });
        }
    }
    return params;
}

// ─────────────────────────────────────────────────────────────
//  READ handler
// ─────────────────────────────────────────────────────────────
function handleRead(sheetName, ss) {
    const cKey = bustedCacheKey(sheetName);
    const cached = getCached(cKey);
    if (cached) return jsonData(cached);

    if (VIRTUAL_SHEETS[sheetName]) return handleVirtualSheetGet(sheetName, ss);

    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return jsonError("Sheet '" + sheetName + "' not found");

    const cfg = SHEET_CONFIGS[sheetName] || {};
    const headerRow = cfg.headerRow || 1;
    const colMap = cfg.columnMap || {};

    const allData = getSheetData(sheet);

    if (allData.length < headerRow) {
        const payload = { success: true, updated: new Date().toISOString(), data: [], headerRow };
        putCached(cKey, payload);
        return jsonData(payload);
    }

    const headers = allData[headerRow - 1].map(h => colMap[String(h)] || String(h));
    const dataRows = allData.slice(headerRow);
    const payload = {
        success: true,
        updated: new Date().toISOString(),
        data: [headers, ...dataRows],
        headerRow
    };
    putCached(cKey, payload);
    return jsonData(payload);
}

// ─────────────────────────────────────────────────────────────
//  WRITE handlers — optimized (no explicit flush overhead)
// ─────────────────────────────────────────────────────────────
function handleInsert(sheet, params) {
    const rowData = JSON.parse(params.rowData);
    sheet.appendRow(rowData);
    bustCache(sheet.getName());
    return jsonSuccess("Data inserted successfully");
}

function handleUpdate(sheet, params) {
    const rowIndex = parseInt(params.rowIndex);
    if (isNaN(rowIndex) || rowIndex < 2) return jsonError("Invalid row index for update");

    const rowData = JSON.parse(params.rowData);
    const numCols = rowData.length;

    const existingRange = sheet.getRange(rowIndex, 1, 1, numCols);
    const existing = existingRange.getValues()[0];

    for (let i = 0; i < numCols; i++) {
        if (rowData[i] !== '' && rowData[i] !== undefined) {
            existing[i] = rowData[i];
        }
    }
    existingRange.setValues([existing]);
    bustCache(sheet.getName());
    return jsonSuccess("Data updated successfully");
}

function handleUpdateCell(sheet, params) {
    const rowIndex = parseInt(params.rowIndex);
    const columnIndex = parseInt(params.columnIndex);
    if (isNaN(rowIndex) || rowIndex < 1 || isNaN(columnIndex) || columnIndex < 1)
        return jsonError("Invalid row or column index");
    sheet.getRange(rowIndex, columnIndex).setValue(params.value);
    bustCache(sheet.getName());
    return jsonSuccess("Cell updated successfully");
}

function handleDelete(sheet, params) {
    const rowIndex = parseInt(params.rowIndex);
    if (isNaN(rowIndex) || rowIndex < 2) return jsonError("Invalid row index for delete");
    sheet.deleteRow(rowIndex);
    bustCache(sheet.getName());
    return jsonSuccess("Row deleted successfully");
}

function handleMarkDeleted(sheet, params) {
    const rowIndex = parseInt(params.rowIndex);
    const columnIndex = parseInt(params.columnIndex);
    if (isNaN(rowIndex) || rowIndex < 2) return jsonError("Invalid row index");
    if (isNaN(columnIndex) || columnIndex < 1) return jsonError("Invalid column index");
    sheet.getRange(rowIndex, columnIndex).setValue(params.value || 'Yes');
    bustCache(sheet.getName());
    return jsonSuccess("Row marked as deleted successfully");
}

function handleBatchInsert(sheet, params) {
    const rowsData = JSON.parse(params.rowsData);
    if (!Array.isArray(rowsData) || rowsData.length === 0)
        return jsonError("Invalid rows data for batch insert");
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rowsData.length, rowsData[0].length).setValues(rowsData);
    bustCache(sheet.getName());
    return jsonSuccess("Batch insert successful", { rowsInserted: rowsData.length });
}

// ── batchDelete (High Performance & Row ID Based) ─────────────
function handleBatchDelete(sheet, params) {
    let rowIndices = [];
    try {
        rowIndices = JSON.parse(params.rowIndices);
    } catch (e) {
        return jsonError("Invalid JSON for rowIndices: " + e.message);
    }
    if (!Array.isArray(rowIndices) || rowIndices.length === 0)
        return jsonError("Invalid row indices for batch delete");

    const sorted = [...rowIndices].map(Number).sort((a, b) => b - a);
    let deletedCount = 0;
    for (let i = 0; i < sorted.length; i++) {
        const rIdx = sorted[i];
        if (!isNaN(rIdx) && rIdx >= 2 && rIdx <= sheet.getLastRow()) {
            sheet.deleteRow(rIdx);
            deletedCount++;
        }
    }
    bustCache(sheet.getName());
    return jsonSuccess("Batch delete successful", { rowsDeleted: deletedCount });
}

// ── batchUpdateCells (High Performance) ──────────────────────
function handleBatchUpdateCells(sheet, params) {
    let updates = [];
    try {
        updates = JSON.parse(params.updates);
    } catch (e) {
        return jsonError("Invalid JSON for updates: " + e.message);
    }
    if (!Array.isArray(updates) || updates.length === 0)
        return jsonError("Invalid updates array for batch update cells");
    updates.forEach(u => {
        const rIdx = parseInt(u.rowIndex);
        const cIdx = parseInt(u.columnIndex);
        if (!isNaN(rIdx) && rIdx >= 1 && !isNaN(cIdx) && cIdx >= 1) {
            sheet.getRange(rIdx, cIdx).setValue(u.value);
        }
    });
    bustCache(sheet.getName());
    return jsonSuccess("Batch cell updates successful", { cellsUpdated: updates.length });
}

const WRITE_ACTIONS = {
    insert: handleInsert,
    update: handleUpdate,
    updateCell: handleUpdateCell,
    delete: handleDelete,
    markDeleted: handleMarkDeleted,
    batchInsert: handleBatchInsert,
    batchDelete: handleBatchDelete,
    batchUpdateCells: handleBatchUpdateCells
};

// ─────────────────────────────────────────────────────────────
//  Virtual sheet handlers
// ─────────────────────────────────────────────────────────────
function handleVirtualSheetGet(virtualSheetName, ss) {
    const vCfg = VIRTUAL_SHEETS[virtualSheetName];
    const masterSheet = ss.getSheetByName(vCfg.masterSheet);
    if (!masterSheet) return jsonError(`Master sheet '${vCfg.masterSheet}' not found`);

    const allData = getSheetData(masterSheet);
    if (allData.length < 2) {
        return jsonData({
            success: true, updated: new Date().toISOString(),
            data: [vCfg.exposeHeaders], headerRow: 1, rowIndices: []
        });
    }

    const masterHeaders = allData[0].map(h => String(h).toLowerCase().trim());
    const typeColIdx = masterHeaders.indexOf('type');
    const typeValueLc = vCfg.typeValue.toLowerCase();
    const rowIndices = [];
    const filteredRows = [];

    for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        if (String(row[typeColIdx] || '').trim().toLowerCase() === typeValueLc) {
            rowIndices.push(i + 1);
            filteredRows.push(vCfg.exposeColumns.map(col => row[col] !== undefined ? row[col] : ''));
        }
    }

    return jsonData({
        success: true,
        updated: new Date().toISOString(),
        data: [vCfg.exposeHeaders, ...filteredRows],
        headerRow: 1,
        rowIndices
    });
}

function handleVirtualSheetPost(virtualSheetName, action, params, ss) {
    try {
        const vCfg = VIRTUAL_SHEETS[virtualSheetName];
        const masterSheet = ss.getSheetByName(vCfg.masterSheet);
        if (!masterSheet) return jsonError(`Master sheet '${vCfg.masterSheet}' not found`);

        if (action === 'insert') {
            const fullRow = buildMasterRow(vCfg, JSON.parse(params.rowData));
            masterSheet.appendRow(fullRow);
            bustCache(vCfg.masterSheet);
            bustCache(virtualSheetName);
            return jsonSuccess("Data inserted successfully");
        }
        if (action === 'update') {
            const rowIndex = parseInt(params.rowIndex);
            if (isNaN(rowIndex) || rowIndex < 2) return jsonError("Invalid row index");
            const fullRow = buildMasterRow(vCfg, JSON.parse(params.rowData));
            masterSheet.getRange(rowIndex, 1, 1, fullRow.length).setValues([fullRow]);
            bustCache(vCfg.masterSheet);
            bustCache(virtualSheetName);
            return jsonSuccess("Data updated successfully");
        }
        if (action === 'delete') {
            const rowIndex = parseInt(params.rowIndex);
            if (isNaN(rowIndex) || rowIndex < 2) return jsonError("Invalid row index");
            masterSheet.deleteRow(rowIndex);
            bustCache(vCfg.masterSheet);
            bustCache(virtualSheetName);
            return jsonSuccess("Row deleted successfully");
        }
        return jsonError("Unsupported action for virtual sheet: " + action);
    } catch (err) {
        return jsonError(err.toString());
    }
}

// ─────────────────────────────────────────────────────────────
//  File upload
// ─────────────────────────────────────────────────────────────
function handleFileUpload(params) {
    try {
        if (!params.base64Data || !params.fileName || !params.mimeType)
            throw new Error("Missing required parameters for file upload");
        const folderId = params.folderId || PO_PDF_FOLDER_ID;
        const fileUrl = uploadFileToDrive(params.base64Data, params.fileName, params.mimeType, folderId);
        if (!fileUrl) throw new Error("Failed to upload file to Google Drive");
        return jsonData({ success: true, fileUrl, message: "File uploaded successfully" });
    } catch (err) {
        return jsonError(err.toString());
    }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
    try {
        let fileData = base64Data.includes('base64,')
            ? base64Data.split('base64,')[1]
            : base64Data;
        fileData = fileData.replace(/ /g, '+');
        const blob = Utilities.newBlob(Utilities.base64Decode(fileData), mimeType, fileName);
        const folder = DriveApp.getFolderById(folderId);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return "https://drive.google.com/file/d/" + file.getId() + "/view";
    } catch (err) {
        console.error("uploadFileToDrive:", err);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
//  doGet — entry point for GET requests
// ─────────────────────────────────────────────────────────────
function doGet(e) {
    try {
        const action = e.parameter.action;
        const sheetName = e.parameter.sheet || e.parameter.sheetName || "Data";
        const ss = getSpreadsheet();

        if (action === 'readFormulas') {
            const sheet = ss.getSheetByName(sheetName);
            if (!sheet) return jsonError("Sheet '" + sheetName + "' not found");
            const lastCol = Math.max(1, sheet.getLastColumn());
            const range = sheet.getRange(2, 1, 5, lastCol);
            return jsonData({
                success: true,
                formulas: range.getFormulas(),
                values: range.getValues(),
                backgrounds: range.getBackgrounds(),
                textColors: range.getFontColors(),
                numberFormats: range.getNumberFormats(),
                headers: sheet.getRange(5, 1, 1, lastCol).getValues()[0]
            });
        }

        if (action === 'copyFormat') {
            const fms = ss.getSheetByName("FMS");
            const fms2 = ss.getSheetByName("fms-2");
            if (!fms || !fms2) return jsonError("Original FMS or fms-2 tab not found");
            const lastCol = Math.max(fms.getLastColumn(), fms2.getLastColumn());
            const srcRange = fms.getRange(1, 1, 6, lastCol);
            const destRange = fms2.getRange(1, 1, 6, lastCol);
            
            // Clear all values in rows 1 to 5 of fms-2 to remove old super headings
            fms2.getRange(1, 1, 5, lastCol).clearContent();
            
            // Unmerge destination
            destRange.breakApart();
            
            // Copy format
            srcRange.copyTo(destRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
            return jsonSuccess("Formatting copied successfully");
        }

        if (action === 'restoreDesign') {
            const fms = ss.getSheetByName("FMS");
            const fms2 = ss.getSheetByName("fms-2");
            if (!fms || !fms2) return jsonError("Original FMS or fms-2 tab not found");

            const lastCol = Math.max(fms.getLastColumn(), fms2.getLastColumn());
            
            // Set frozen rows and columns to match original FMS sheet
            fms2.setFrozenRows(fms.getFrozenRows());
            fms2.setFrozenColumns(fms.getFrozenColumns());
            
            // 1. Unmerge rows 1-6 entirely in fms-2 to clean up
            fms2.getRange(1, 1, 6, lastCol).breakApart();
            fms2.getRange(1, 1, 5, lastCol).clearContent();

            // 2. Copy format AND values from FMS for columns A-K (1-11) and AT-BG (46-59) in rows 1-6
            fms.getRange(1, 1, 6, 11).copyTo(fms2.getRange(1, 1, 6, 11), SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
            fms.getRange(1, 46, 6, 14).copyTo(fms2.getRange(1, 46, 6, 14), SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);

            // Copy format for data rows 7 onwards
            const fmsLastRow = Math.max(7, fms.getLastRow());
            fms.getRange(7, 1, fmsLastRow - 6, lastCol).copyTo(fms2.getRange(7, 1, fmsLastRow - 6, lastCol), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);

            // 3. Define and format rows 2-5 for consolidated stages (L to AS / Col 12 to 45)
            const stages = [
                { start: 12, end: 19, text: "Create Bill", bg: "#fce5cd" },
                { start: 20, end: 27, text: "Ready Product & Transport", bg: "#fff2cc" },
                { start: 28, end: 32, text: "Supply Check", bg: "#cfe2f3" },
                { start: 33, end: 37, text: "Approve Product", bg: "#ead1dc" },
                { start: 38, end: 45, text: "Payment Processing", bg: "#d9d2e9" }
            ];

            stages.forEach(stg => {
                // Format Row 2 (Stage Name)
                const r2 = fms2.getRange(2, stg.start, 1, stg.end - stg.start + 1);
                r2.merge().setValue(stg.text).setBackground(stg.bg).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold").setFontSize(11).setBorder(true, true, true, true, true, true);
                
                // Format Row 3 (Purchase Order Site) - Leave blank as in FMS 1
                const r3 = fms2.getRange(3, stg.start, 1, stg.end - stg.start + 1);
                r3.merge().setValue("").setBackground(stg.bg).setBorder(true, true, true, true, true, true);
                
                // Format Row 4 (Purchase Order Site)
                const r4 = fms2.getRange(4, stg.start, 1, stg.end - stg.start + 1);
                r4.merge().setValue("Purchase Order Site").setBackground(stg.bg).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(9).setBorder(true, true, true, true, true, true);
                
                // Format Row 5 (Buffer / Timings - Merge horizontally!)
                const r5 = fms2.getRange(5, stg.start, 1, stg.end - stg.start + 1);
                r5.merge().setBackground(stg.bg).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(10).setBorder(true, true, true, true, true, true);
            });

            // Set Row 5 values and formats manually to align with consolidated columns
            // Stage 1 (Create Bill) starts at Column 12 (L)
            const cellL5 = fms2.getRange("L5");
            cellL5.setValue(new Date(1899, 11, 30, 18, 38, 50));
            cellL5.setNumberFormat("M/d/yyyy H:mm:ss");

            // Stage 2 (Ready Product & Transport) starts at Column 20 (T)
            const cellT5 = fms2.getRange("T5");
            cellT5.setValue(new Date(1899, 11, 29, 19, 38, 50));
            cellT5.setNumberFormat("h:mm:ss");

            // Stage 3 (Supply Check) starts at Column 28 (AB)
            fms2.getRange("AB5").setValue("");

            // Stage 4 (Approve Product) starts at Column 33 (AG)
            fms2.getRange("AG5").setValue("");

            // Stage 5 (Payment Processing) starts at Column 38 (AL) - Set to 4 for Planned 5 formula reference
            fms2.getRange("AL5").setValue(4);

            // 4. Format row 6 headers for columns L-BG (12-59)
            const row6Headers = fms2.getRange(6, 12, 1, 48);
            row6Headers.setBackground("#f3f3f3");
            row6Headers.setFontColor("#000000");
            row6Headers.setFontWeight("bold");
            row6Headers.setHorizontalAlignment("center");
            row6Headers.setVerticalAlignment("middle");
            row6Headers.setBorder(true, true, true, true, true, true);

            return jsonSuccess("Design and super headings restored successfully!");
        }

        if (action === 'fixWidthsAndLabels') {
            const fms2 = ss.getSheetByName("fms-2");
            if (!fms2) return jsonError("fms-2 tab not found");

            const widths = {
                1: 150,  // A: Timestamp
                3: 180,  // C: PO Number
                4: 200,  // D: Vendor Name
                5: 100,  // E: Total Quantity
                6: 100,  // F: Location
                7: 300,  // G: Address
                8: 120,  // H: Created By
                9: 150,  // I: PO Received Date
                10: 150, // J: PO Expired Date
                11: 250, // K: PO PDF
                13: 150, // M: Actual 1
                15: 180, // O: Bill Number
                16: 100, // P: Bill Amount
                17: 100, // Q: Per Unit Price
                18: 150, // R: Bill Date
                19: 250, // S: Bill PDF
                21: 150, // U: Actual 2
                24: 150, // X: Transporter name
                25: 100, // Y: Quantity
                26: 150, // Z: Delivery location
                27: 300, // AA: Delivery address
                29: 150, // AC: Actual 3
                34: 150, // AH: Actual 4
                38: 120, // AL: Planned 5
                39: 150, // AM: Actual 5
                48: 120, // AV: Status
                49: 250, // AW: Narration
                51: 200, // AY: Supply Quantity 1
                53: 250, // BA: Narration (Stage 1 / Create Bill)
                55: 200, // BC: Vehicle Number
                57: 150  // BE: Return Qty
            };

            for (const col in widths) {
                fms2.setColumnWidth(parseInt(col), widths[col]);
            }

            const poLabels = ["What", "Who", "How", "When"];
            for (let i = 0; i < 4; i++) {
                const rng = fms2.getRange(i + 2, 1);
                rng.setValue(poLabels[i]);
                rng.setFontColor("#000000");
                rng.setFontWeight("bold");
                rng.setFontSize(11);
                rng.setHorizontalAlignment("left");
                rng.setVerticalAlignment("middle");
            }

            return jsonSuccess("Widths and PO labels fixed successfully!");
        }

        if (WRITE_ACTIONS[action]) {
            if (VIRTUAL_SHEETS[sheetName]) {
                return handleVirtualSheetPost(sheetName, action, e.parameter, ss);
            }
            const sheet = ss.getSheetByName(sheetName);
            if (!sheet) return jsonError("Sheet '" + sheetName + "' not found");
            return WRITE_ACTIONS[action](sheet, e.parameter);
        }

        return handleRead(sheetName, ss);

    } catch (err) {
        return jsonError(err.message || "Server error");
    }
}

// ─────────────────────────────────────────────────────────────
//  doPost — entry point for POST requests (with LockService)
// ─────────────────────────────────────────────────────────────
function doPost(e) {
    try {
        const params = parseParameters(e);
        const action = params.action || 'insert';
        const sheetName = params.sheetName;
        const ss = getSpreadsheet();

        if (action === 'uploadFile') return handleFileUpload(params);

        if (VIRTUAL_SHEETS[sheetName]) {
            return handleVirtualSheetPost(sheetName, action, params, ss);
        }

        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) return jsonError("Sheet '" + sheetName + "' not found");

        const handler = WRITE_ACTIONS[action];
        if (!handler) return jsonError("Unknown action: " + action);

        const lock = LockService.getScriptLock();
        try {
            lock.tryLock(5000);
            return handler(sheet, params);
        } finally {
            try { lock.releaseLock(); } catch (_) { }
        }

    } catch (err) {
        console.error("doPost error:", err);
        return jsonError(err.toString());
    }
}
