document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  let jsonData = null;

  // Eventos para drag & drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropZone.classList.add('drag-over');
  }

  function unhighlight() {
    dropZone.classList.remove('drag-over');
  }

  dropZone.addEventListener('drop', handleDrop, false);
  fileInput.addEventListener('change', handleFileSelect, false);
  convertBtn.addEventListener('click', convertToExcel);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
  }

  function handleFile(file) {
    if (file.type !== 'application/json') {
      alert('Por favor, selecciona un archivo JSON válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        jsonData = JSON.parse(e.target.result);
        convertBtn.disabled = false;
      } catch (error) {
        alert('Error al leer el archivo JSON');
        console.error(error);
      }
    };
    reader.readAsText(file);
  }

  function convertToExcel() {
    if (!jsonData) return;

    // Crear hoja de cálculo principal con resumen
    const summaryData = jsonData.records.map(record => ({
      'Fecha Apertura': new Date(record.openDate).toLocaleString(),
      'Fecha Cierre': new Date(record.closeDate).toLocaleString(),
      'Base Inicial': record.initialBase,
      'Ingresos Mesa': record.tableRevenue,
      'Pagos Efectivo': record.cashPayments,
      'Pagos Tarjeta': record.cardPayments,
      'Otros Pagos': record.otherPayments,
      'Otros Ingresos': record.otherRevenue,
      'Gastos': record.expenses,
      'Pagos Cortesía': record.courtesyPayments,
      'Total': record.total
    }));

    // Crear hojas de cálculo para transacciones
    const incomeData = [];
    const expenseData = [];

    jsonData.records.forEach(record => {
      record.incomeTransactions.forEach(trans => {
        incomeData.push({
          'Fecha': trans.date,
          'Descripción': trans.description,
          'Monto': trans.amount
        });
      });

      record.expenseTransactions.forEach(trans => {
        expenseData.push({
          'Fecha': trans.date,
          'Descripción': trans.description,
          'Monto': trans.amount
        });
      });
    });

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Agregar hojas
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(incomeData);
    const ws3 = XLSX.utils.json_to_sheet(expenseData);

    // Establecer anchos de columna
    const wscols = [
      {wch: 20}, // Fecha
      {wch: 50}, // Descripción
      {wch: 15}, // Monto
    ];
    
    ws1['!cols'] = wscols;
    ws2['!cols'] = wscols;
    ws3['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
    XLSX.utils.book_append_sheet(wb, ws2, 'Ingresos');
    XLSX.utils.book_append_sheet(wb, ws3, 'Gastos');

    // Generar archivo Excel
    XLSX.writeFile(wb, 'registros_caja.xlsx');
  }
});