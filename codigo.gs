const SHEET_NAME = "Inventario";

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === "add") {
    const id = new Date().getTime().toString();
    const date = new Date().toLocaleString("es-MX");
    // Al agregar, el costo inicia en 0 y el estado en Pendiente
    sheet.appendRow([id, data.name, 0, "Pendiente", date]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", 
      id: id,
      message: "Producto agregado a la lista de faltantes"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "update") {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.id.toString()) {
        // Actualiza el estado (Columna D)
        sheet.getRange(i + 1, 4).setValue(data.status); 
        
        // Si viene el costo en la petición, actualiza el costo (Columna C)
        if (data.cost !== undefined) {
          sheet.getRange(i + 1, 3).setValue(data.cost);
        }
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Estado y costo actualizados"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
}

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    items.push({
      id: rows[i][0],
      name: rows[i][1],
      cost: parseFloat(rows[i][2]) || 0,
      status: rows[i][3],
      date: rows[i][4]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(items)).setMimeType(ContentService.MimeType.JSON);
}