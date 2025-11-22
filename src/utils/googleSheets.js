const { google } = require("googleapis");
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const path = require("path");
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile:  path.join(__dirname, "../../config/googleService.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// -------------------------
// Get full sheet values
// -------------------------
async function getSheetData() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Sheet1",
  });

  return res.data.values || [];
}

// -------------------------
// Write a single cell
// -------------------------
async function updateCell(row, col, value) {
  const sheets = await getSheetsClient();

  const range = `Sheet1!${col}${row}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

module.exports = {
  getSheetData,
  updateCell,
};
