import Papa from 'papaparse';

export const exportToCsv = (data, filename) => {
  const csv = Papa.unparse(data);
  // Añadir BOM (\uFEFF) para que Excel reconozca correctamente los caracteres UTF-8 como la Ñ o las tildes
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.style.visibility = 'hidden';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
