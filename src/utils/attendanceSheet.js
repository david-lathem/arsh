const { getSheetData, updateCell } = require("./googleSheets");

// Convert column index to letter (1 → A, 27 → AA)
function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    let mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - mod) / 26);
  }
  return letter;
}

module.exports.updateAttendanceSheet = async (user, action) => {
  const data = await getSheetData();

  const today = new Date().toISOString().slice(0, 10); // 2025-01-16

  const headers = data[0] || [];
  let rows = data;

  // ---------------------------------------
  // 1. Check if date column exists
  // ---------------------------------------
  let dateCol = headers.indexOf(today);

  // If not -> create new column
  if (dateCol === -1) {
    dateCol = headers.length;
    headers.push(today);
    rows[0] = headers;
  }

  // ---------------------------------------
  // 2. Find or create user row
  // ---------------------------------------
  let userRowIndex = rows.findIndex((r) => r[0] === user.id);

  if (userRowIndex === -1) {
    // Create new row
    userRowIndex = rows.length;
    rows.push([user.id, user.username]);
  }

  const row = rows[userRowIndex];

  // Ensure row has enough columns
  while (row.length <= dateCol) row.push("");

  // ---------------------------------------
  // 3. Update the value
  // ---------------------------------------
  if (!row[dateCol]) row[dateCol] = action; // first entry
  else row[dateCol] = row[dateCol] + " | " + action;

  // ---------------------------------------
  // 4. Write only the updated cell
  // ---------------------------------------
  const excelColumn = columnToLetter(dateCol + 1); // index → A1
  await updateCell(userRowIndex + 1, excelColumn, row[dateCol]);

  console.log("✔ Google Sheet updated:", user.username, action);
};
