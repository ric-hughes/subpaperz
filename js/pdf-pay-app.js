// pdf-pay-app.js — jsPDF generator for Pay Application (AIA G702-style)

function generatePayAppPDF(formData, lineItems, signatureDataURL) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  const M = 36;
  const PW = 792 - M * 2;
  let y = M;

  const fmt = (n) => {
    const num = parseFloat(n) || 0;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const pct = (n) => (parseFloat(n) || 0).toFixed(1) + '%';

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 792, 58, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('APPLICATION AND CERTIFICATE FOR PAYMENT', M, 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Subcontractor Pay Application  |  SubPaperz  |  subpaperz.com', M, 36);
  doc.text(`App #: ${formData.appNumber || '1'}   Period: ${formData.periodFrom || ''} – ${formData.periodTo || ''}   Date: ${formData.appDate || new Date().toLocaleDateString()}`, M, 48);
  y = 68;
  doc.setTextColor(0);

  // Project info
  doc.setFontSize(8);
  const info = [
    ['Project', formData.projectName], ['Address', formData.projectAddress],
    ['Owner', formData.ownerName], ['Subcontractor', formData.subName],
    ['Contract Date', formData.contractDate], ['Original Contract Amt', fmt(formData.originalContract)],
  ];
  const colW = PW / 3;
  info.forEach(([label, val], i) => {
    const cx = M + (i % 3) * colW;
    const cy = y + Math.floor(i / 3) * 18;
    doc.setFont('helvetica', 'bold'); doc.text(label + ':', cx, cy);
    doc.setFont('helvetica', 'normal'); doc.text(String(val || '—'), cx + 72, cy);
  });
  y += Math.ceil(info.length / 3) * 18 + 8;

  // Table header
  const cols = [
    { h: '#', w: 24 }, { h: 'Description of Work', w: 158 },
    { h: 'Scheduled Value', w: 80 }, { h: 'Prev. Completed', w: 82 },
    { h: 'This Period', w: 74 }, { h: 'Stored Materials', w: 78 },
    { h: 'Total Completed', w: 82 }, { h: '%', w: 36 }, { h: 'Balance to Finish', w: 82 },
  ];
  doc.setFillColor(29, 78, 216);
  doc.rect(M, y, PW, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  let cx = M;
  cols.forEach(c => { doc.text(c.h, cx + 2, y + 11); cx += c.w; });
  y += 17;

  // Rows
  let totSched = 0, totPrev = 0, totThis = 0, totStored = 0, totDone = 0, totBal = 0;
  (lineItems || []).forEach((row, idx) => {
    const sv = parseFloat(row.scheduledValue) || 0;
    const prev = parseFloat(row.previousCompleted) || 0;
    const curr = parseFloat(row.thisPeriod) || 0;
    const stored = parseFloat(row.stored) || 0;
    const done = prev + curr + stored;
    const perc = sv > 0 ? done / sv * 100 : 0;
    const bal = sv - done;
    totSched += sv; totPrev += prev; totThis += curr;
    totStored += stored; totDone += done; totBal += bal;

    doc.setFillColor(idx % 2 === 0 ? 246 : 255, idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 255 : 255);
    doc.rect(M, y, PW, 14, 'F');
    doc.setTextColor(0); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    const vals = [String(idx+1), row.description||'', fmt(sv), fmt(prev), fmt(curr), fmt(stored), fmt(done), pct(perc), fmt(bal)];
    let rx = M;
    cols.forEach((c, ci) => { doc.text(String(vals[ci]).substring(0,22), rx+2, y+10); rx += c.w; });
    doc.setDrawColor(220); doc.line(M, y+14, M+PW, y+14);
    y += 14;
  });

  // Totals row
  doc.setFillColor(15, 23, 42); doc.rect(M, y, PW, 16, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(7);
  const totVals = ['', 'TOTALS', fmt(totSched), fmt(totPrev), fmt(totThis), fmt(totStored), fmt(totDone), pct(totSched>0?totDone/totSched*100:0), fmt(totBal)];
  let tr = M;
  cols.forEach((c,ci) => { doc.text(totVals[ci], tr+2, y+11); tr += c.w; });
  y += 22;

  // Summary
  if (y + 160 > 530) { doc.addPage(); y = M; }
  doc.setTextColor(0);
  doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text('PAYMENT SUMMARY', M, y+12); y += 20;

  const ret = parseFloat(formData.retainage) || 10;
  const retAmt = totDone * (ret/100);
  const earned = totDone - retAmt;
  const prevCerts = parseFloat(formData.previousCertificates) || 0;
  const due = earned - prevCerts;
  const co = parseFloat(formData.changeOrders) || 0;
  const contractToDate = (parseFloat(formData.originalContract)||0) + co;
  const summW = 300;

  const rows = [
    ['Original Contract Sum', fmt(formData.originalContract)],
    ['Net Change by Change Orders', fmt(co)],
    ['Contract Sum to Date', fmt(contractToDate)],
    ['Total Completed & Stored to Date', fmt(totDone)],
    [`Retainage (${ret}%)`, fmt(retAmt)],
    ['Total Earned Less Retainage', fmt(earned)],
    ['Less Previous Certificates for Payment', fmt(prevCerts)],
  ];
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(label, M, y); doc.text(val, M+summW-70, y);
    doc.setDrawColor(210); doc.line(M, y+3, M+summW, y+3);
    y += 16;
  });

  // Current payment due box
  doc.setFillColor(29,78,216); doc.rect(M, y, summW, 22, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('CURRENT PAYMENT DUE', M+4, y+15);
  doc.text(fmt(due), M+summW-80, y+15);
  y += 30; doc.setTextColor(0);

  // Certification
  y += 10;
  if (y + 90 > 530) { doc.addPage(); y = M; }
  doc.setFontSize(8); doc.setFont('helvetica','italic');
  const cert = 'The undersigned Subcontractor certifies that to the best of the Subcontractor\'s knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Subcontractor for Work for which previous Certificates for Payment were issued and payments received from the Contractor, and that current payment shown herein is now due.';
  const certLines = doc.splitTextToSize(cert, PW * 0.65);
  doc.text(certLines, M, y);
  y += certLines.length * 11 + 12;
  doc.setFont('helvetica','normal');

  if (signatureDataURL) {
    doc.addImage(signatureDataURL, 'PNG', M, y, 150, 45); y += 54;
  } else {
    doc.setDrawColor(100); doc.line(M, y+44, M+200, y+44); y += 52;
  }
  doc.setFontSize(8);
  doc.text('Authorized Signature & Title', M, y);
  doc.text('Date: ' + (formData.signDate || new Date().toLocaleDateString()), M+220, y);

  doc.setFontSize(7); doc.setTextColor(120); doc.setFont('helvetica','italic');
  doc.text(`Generated by SubPaperz on ${new Date().toLocaleDateString()} | subpaperz.com | This document does not constitute legal advice.`, M, 555);

  return doc;
}

window.generatePayAppPDF = generatePayAppPDF;
