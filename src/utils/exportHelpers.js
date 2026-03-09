const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// --- EXCEL EXPORT ---
export async function exportToExcel(portfolio, filename = 'fx_dashboard_export.xlsx') {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    ['Currency', 'Annual Budget Rate', 'Annual Volume (LC)', 'Rate Direction', 'Source'],
    ...portfolio.map(c => [
      c.code,
      c.annualBudgetRate,
      c.monthlyVolumes.reduce((a, b) => a + b, 0),
      c.rateDirection,
      c.rateSource,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  // Sheet 2: Monthly Volumes
  const volRows = [
    ['Currency', ...MONTHS],
    ...portfolio.map(c => [c.code, ...c.monthlyVolumes]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(volRows), 'Monthly Volumes');

  // Sheet 3: Budget Rates
  const budgetRows = [
    ['Currency', ...MONTHS, 'Annual Avg'],
    ...portfolio.filter(c => c.code !== 'USD').map(c => [
      c.code, ...c.monthlyRates, c.annualBudgetRate,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows), 'Budget Rates');

  // Sheet 4: Actual / Forecast Rates
  const actualRows = [
    ['Currency', ...MONTHS, 'Rate Source'],
    ...portfolio.filter(c => c.code !== 'USD').map(c => [
      c.code, ...c.monthlyActualRates, c.rateSource,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actualRows), 'Actual Rates');

  XLSX.writeFile(wb, filename);
}

// --- PDF EXPORT ---
export async function exportToPdf(filename = 'fx_dashboard.pdf') {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const el = document.getElementById('dashboard-root');
  if (!el) throw new Error('dashboard-root element not found');

  // Scroll to top before capture, restore after
  const prevScroll = window.scrollY;
  window.scrollTo(0, 0);

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#000000',
    logging: false,
    windowHeight: el.scrollHeight,
    height: el.scrollHeight,
  });

  window.scrollTo(0, prevScroll);

  const imgData = canvas.toDataURL('image/png');
  const pdfW = canvas.width / 2;
  const pdfH = canvas.height / 2;

  const pdf = new jsPDF({
    orientation: pdfW > pdfH ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pdfW, pdfH],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  pdf.save(filename);
}
