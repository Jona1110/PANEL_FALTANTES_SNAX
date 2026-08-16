const SHEET_NAME = "Inventario";

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === "add") {
    const id = new Date().getTime().toString();
    const date = new Date().toLocaleString("es-MX");
    sheet.appendRow([id, data.name, data.cost, "Pendiente", date]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", 
      id: id,
      message: "Producto agregado correctamente"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "update") {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.id.toString()) {
        // Actualiza la columna D (Estado)
        sheet.getRange(i + 1, 4).setValue(data.status); 
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Estado actualizado"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
}

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const items = [];

  // Empezamos en 1 para saltar la fila de encabezados
  for (let i = 1; i < rows.length; i++) {
    items.push({
      id: rows[i][0],
      name: rows[i][1],
      cost: parseFloat(rows[i][2]),
      status: rows[i][3],
      date: rows[i][4]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(items)).setMimeType(ContentService.MimeType.JSON);
}