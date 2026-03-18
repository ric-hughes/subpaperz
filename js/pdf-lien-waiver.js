// pdf-lien-waiver.js — jsPDF generator for all 4 lien waiver types

const LIEN_LANG = {
  conditional_progress: (d) => `CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT

Upon receipt by the undersigned of a check from ${d.gcName} in the sum of $${d.amount} payable to ${d.claimantName}, and when the check has been properly endorsed and has been paid by the bank upon which it is drawn, this document shall become effective to release any mechanic's lien, stop payment notice, or bond right the undersigned has on the job of ${d.ownerName} located at ${d.propertyDescription} to the following extent.

This release covers a progress payment for all labor, services, equipment, or materials furnished to the jobsite or to ${d.gcName} through the date of ${d.throughDate} only and does not cover any retentions retained before or after that date, extras or additional work not reflected in prior pay applications, disputed claims, or items for which you have separately requested payment.

Before any recipient of this document relies on it, said party should verify evidence of payment to the undersigned.

CLAIMANT'S SIGNATURE IS NOT VALID UNLESS THIS DOCUMENT IS PROPERLY COMPLETED.`,

  unconditional_progress: (d) => `UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT

The undersigned has been paid and has received a progress payment in the sum of $${d.amount} for all labor, services, equipment, or materials furnished to ${d.gcName} on the job of ${d.ownerName} located at ${d.propertyDescription} through ${d.throughDate} and does release any mechanic's lien, stop payment notice, or bond right the undersigned has on the above referenced jobsite to the extent of the payment received.

This release does not cover any amount retained before or after ${d.throughDate} or any extras or approved change orders not reflected in prior pay applications.

WARNING: THIS IS AN UNCONDITIONAL RELEASE. BY SIGNING THIS DOCUMENT YOU ARE RELEASING YOUR LIEN RIGHTS WHETHER OR NOT YOU HAVE BEEN PAID.`,

  conditional_final: (d) => `CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT

Upon receipt by the undersigned of a check from ${d.gcName} in the sum of $${d.amount} payable to ${d.claimantName}, and when the check has been properly endorsed and has been paid by the bank upon which it is drawn, this document shall become effective to release any mechanic's lien, stop payment notice, or bond right the undersigned has on the job of ${d.ownerName} located at ${d.propertyDescription}.

This release covers the final payment for all labor, services, equipment, or materials furnished on the jobsite and does not cover any additional items, unpaid extras, or disputed claims listed in the Exceptions section below.

EXCEPTIONS: ${d.exceptions || 'None'}

CLAIMANT'S SIGNATURE IS NOT VALID UNLESS THIS DOCUMENT IS PROPERLY COMPLETED.`,

  unconditional_final: (d) => `UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT

The undersigned has been paid in full for all labor, services, equipment, or materials furnished to ${d.gcName} on the job of ${d.ownerName} located at ${d.propertyDescription} and does hereby release any mechanic's lien, stop payment notice, or bond right the undersigned has on the above referenced jobsite.

THE UNDERSIGNED WARRANTS THAT HE/SHE/IT HAS ALREADY PAID OR WILL PAY ALL CLAIMS FOR LABOR, SERVICES, EQUIPMENT, OR MATERIALS FURNISHED ON THE JOB.

WARNING: THIS IS A FINAL RELEASE — READ CAREFULLY BEFORE SIGNING. BY SIGNING THIS DOCUMENT YOU PERMANENTLY WAIVE ALL REMAINING LIEN RIGHTS ON THIS PROJECT, REGARDLESS OF PAYMENT STATUS.`
};

const TYPE_TITLES = {
  conditional_progress: 'Conditional Waiver and Release on Progress Payment',
  unconditional_progress: 'Unconditional Waiver and Release on Progress Payment',
  conditional_final: 'Conditional Waiver and Release on Final Payment',
  unconditional_final: 'Unconditional Waiver and Release on Final Payment',
};

function generateLienWaiverPDF(formData, signatureDataURL) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const M = 50; // margin
  const PW = 612 - M * 2; // page width minus margins
  let y = M;

  const line = (text, size = 10, style = 'normal', indent = 0) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    const lines = doc.splitTextToSize(text, PW - indent);
    doc.text(lines, M + indent, y);
    y += lines.length * (size * 1.4);
  };

  const gap = (n = 10) => { y += n; };
  const hr = () => { doc.setDrawColor(180); doc.line(M, y, M + PW, y); gap(8); };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 612, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SubPaperz', M, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('subpaperz.com', M, 44);
  y = 90;

  // Title
  doc.setTextColor(0, 0, 0);
  line('LIEN WAIVER AND RELEASE', 14, 'bold');
  gap(4);
  line(TYPE_TITLES[formData.type] || formData.type, 11, 'bold');
  gap(12);
  hr();

  // Property info
  const field = (label, value) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', M, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || ''), M + 140, y);
    y += 16;
  };

  field('Claimant (Subcontractor)', formData.claimantName);
  field('Claimant Address', formData.claimantAddress);
  field('Owner', formData.ownerName);
  field('Property / Project', formData.propertyDescription);
  field('General Contractor', formData.gcName);
  field('Through Date', formData.throughDate);
  if (formData.amount) field('Payment Amount', '$' + formData.amount);
  gap(12);
  hr();

  // Legal language
  line('RELEASE LANGUAGE', 10, 'bold');
  gap(8);
  const legalFn = LIEN_LANG[formData.type];
  const legalText = legalFn ? legalFn(formData) : '';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const legalLines = doc.splitTextToSize(legalText, PW);
  // Check if we need a new page
  if (y + legalLines.length * 13 > 720) { doc.addPage(); y = M; }
  doc.text(legalLines, M, y);
  y += legalLines.length * 13;
  gap(20);
  hr();

  // Signature block
  if (y + 100 > 720) { doc.addPage(); y = M; }
  line('SIGNATURE', 10, 'bold');
  gap(10);

  if (signatureDataURL) {
    doc.addImage(signatureDataURL, 'PNG', M, y, 200, 60);
    y += 70;
  } else {
    doc.setDrawColor(100);
    doc.line(M, y + 50, M + 220, y + 50);
    y += 60;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature', M, y);
  y += 16;

  doc.line(M, y + 16, M + 220, y + 16);
  doc.text('Printed Name', M, y + 26);
  y += 42;

  doc.line(M, y + 16, M + 120, y + 16);
  doc.text('Date: ' + (formData.signDate || new Date().toLocaleDateString()), M, y + 26);
  y += 50;

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'italic');
  const footer = `Generated by SubPaperz on ${new Date().toLocaleDateString()} | subpaperz.com | This document does not constitute legal advice. Consult a licensed attorney for compliance with your state's lien laws.`;
  doc.text(doc.splitTextToSize(footer, PW), M, 780);

  return doc;
}

window.generateLienWaiverPDF = generateLienWaiverPDF;
window.LIEN_LANG = LIEN_LANG;
window.TYPE_TITLES = TYPE_TITLES;
