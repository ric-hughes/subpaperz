// pdf-w9.js — jsPDF generator for W-9 form

function generateW9PDF(formData, signatureDataURL) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const M = 40;
  const PW = 612 - M * 2;
  let y = M;

  const gap = (n = 8) => { y += n; };
  const hr = (color = 180) => { doc.setDrawColor(color); doc.line(M, y, M + PW, y); gap(8); };

  const box = (label, value, x, bw, h = 28) => {
    doc.setDrawColor(150);
    doc.rect(x, y, bw, h);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(label, x + 4, y + 9);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    if (value) doc.text(String(value), x + 4, y + 22);
  };

  // Header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 612, 58, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Form W-9', M, 18);
  doc.text('(Rev. March 2024)', M, 30);
  doc.text('Department of the Treasury / Internal Revenue Service', M, 42);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Request for Taxpayer Identification and Certification', 200, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Give form to the requester. Do not send to the IRS.', 200, 36);

  y = 70;
  doc.setTextColor(0);

  // Line 1: Name
  box('1  Name (as shown on your income tax return)', formData.name, M, PW);
  y += 32;

  // Line 2: Business name
  box('2  Business name/disregarded entity name (if different from above)', formData.businessName, M, PW);
  y += 32;

  // Line 3: Tax classification
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('3  Check appropriate box for federal tax classification:', M, y + 10);
  y += 18;

  const taxTypes = [
    ['Individual/sole proprietor', 'individual'],
    ['C Corporation', 'c_corp'],
    ['S Corporation', 's_corp'],
    ['Partnership', 'partnership'],
    ['Trust/estate', 'trust'],
    ['LLC', 'llc'],
    ['Other', 'other'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let tx = M;
  taxTypes.forEach(([label, val]) => {
    const checked = formData.taxClassification === val;
    doc.rect(tx, y, 9, 9);
    if (checked) { doc.setFont('helvetica', 'bold'); doc.text('X', tx + 1.5, y + 8); doc.setFont('helvetica', 'normal'); }
    doc.text(label, tx + 12, y + 8);
    tx += label.length * 4.5 + 18;
    if (tx > M + PW - 80) { tx = M; y += 14; }
  });
  if (formData.taxClassification === 'llc' && formData.llcType) {
    doc.text(`  LLC type: ${formData.llcType}`, M, y + 14);
  }
  y += 20;
  hr();

  // Exempt codes
  const halfW = PW / 2 - 4;
  box('4  Exempt payee code (if any)', formData.exemptPayeeCode, M, halfW);
  box('Exemption from FATCA reporting code (if any)', formData.fatcaCode, M + halfW + 8, halfW);
  y += 32;

  // Address
  box('5  Address (number, street, and apt. or suite no.)', formData.address, M, PW);
  y += 32;
  box('6  City, state, and ZIP code', `${formData.city || ''}, ${formData.state || ''} ${formData.zip || ''}`, M, halfW);
  box("Requester's name and address (optional)", formData.requesterInfo, M + halfW + 8, halfW);
  y += 32;
  box('7  List account number(s) here (optional)', formData.accountNumbers, M, PW);
  y += 36;

  // Part I — TIN
  doc.setFillColor(235, 240, 255);
  doc.rect(M, y, PW, 14, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 60, 180);
  doc.text('Part I    Taxpayer Identification Number (TIN)', M + 4, y + 10);
  y += 18;
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // SSN or EIN
  if (formData.tinType === 'ssn' || !formData.tinType) {
    doc.text('Social security number', M, y + 10);
    const ssn = (formData.ssn || '   -  -    ').replace(/\D/g, '');
    const ssnFormatted = ssn.length === 9 ? `${ssn.slice(0,3)}-${ssn.slice(3,5)}-${ssn.slice(5)}` : (formData.ssn || '');
    box('SSN', ssnFormatted, M + 120, 160);
  } else {
    doc.text('Employer identification number', M, y + 10);
    box('EIN', formData.ein, M + 170, 140);
  }
  y += 36;

  // Part II — Certification
  doc.setFillColor(235, 240, 255);
  doc.rect(M, y, PW, 14, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 60, 180);
  doc.text('Part II    Certification', M + 4, y + 10);
  y += 18;

  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const certText = 'Under penalties of perjury, I certify that:\n1. The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and\n2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and\n3. I am a U.S. citizen or other U.S. person (defined below); and\n4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.';
  const certLines = doc.splitTextToSize(certText, PW);
  doc.text(certLines, M, y);
  y += certLines.length * 11 + 14;

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Signature of U.S. person:', M, y);
  y += 6;

  if (signatureDataURL) {
    doc.addImage(signatureDataURL, 'PNG', M, y, 180, 50);
    y += 58;
  } else {
    doc.setDrawColor(100);
    doc.line(M, y + 44, M + 200, y + 44);
    y += 52;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Date: ' + (formData.signDate || new Date().toLocaleDateString()), M + 210, y - 8);

  y += 16;
  hr(200);

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'italic');
  const footer = `Generated by SubPaperz on ${new Date().toLocaleDateString()} | subpaperz.com | This is a functional W-9 equivalent for use between parties. It is not submitted to the IRS. This document does not constitute legal or tax advice.`;
  doc.text(doc.splitTextToSize(footer, PW), M, 775);

  return doc;
}

window.generateW9PDF = generateW9PDF;
