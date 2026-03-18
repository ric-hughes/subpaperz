// pdf-sub-agreement.js — jsPDF generator for Subcontractor Agreement

function generateSubAgreementPDF(formData, gcSignatureDataURL, subSignatureDataURL) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const M = 50;
  const PW = 612 - M * 2;
  let y = M;

  const checkPage = (needed = 60) => {
    if (y + needed > 750) { doc.addPage(); y = M; }
  };

  const heading = (text) => {
    checkPage(30);
    doc.setFillColor(15, 23, 42);
    doc.rect(M, y, PW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(text.toUpperCase(), M + 6, y + 14);
    doc.setTextColor(0);
    y += 26;
  };

  const field = (label, value, indent = 0) => {
    checkPage(18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', M + indent, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(value || '—'), PW - 130 - indent);
    doc.text(lines, M + 130 + indent, y);
    y += Math.max(lines.length * 13, 14);
  };

  const para = (text, size = 9) => {
    checkPage(40);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, PW);
    doc.text(lines, M, y);
    y += lines.length * (size * 1.4);
    y += 8;
    doc.setTextColor(0);
  };

  const gap = (n = 10) => { y += n; };

  // Cover header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 612, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBCONTRACTOR AGREEMENT', M, 36);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('SubPaperz | subpaperz.com', M, 52);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, M, 64);
  y = 96;
  doc.setTextColor(0);

  // 1. Parties
  heading('1. Parties');
  field('General Contractor', formData.gcCompany);
  field('GC Address', formData.gcAddress);
  field('GC License #', formData.gcLicense);
  field('Subcontractor', formData.subCompany);
  field('Sub Address', formData.subAddress);
  field('Sub License #', formData.subLicense);
  field('Governing State', formData.state);
  gap();

  // 2. Project
  heading('2. Project Information');
  field('Project Name', formData.projectName);
  field('Project Address', formData.projectAddress);
  field('Project Owner', formData.projectOwner);
  gap();

  // 3. Scope
  heading('3. Scope of Work');
  para(formData.scopeOfWork || 'As described in attached exhibit.');
  gap();

  // 4. Contract Price
  heading('4. Contract Price & Payment');
  field('Total Contract Price', '$' + (formData.contractPrice || '0'));
  field('Payment Terms', formData.paymentTerms || 'Net 30');
  field('Retainage', (formData.retainage || '10') + '%');
  para('Payments shall be made within the payment terms specified above following receipt of a properly submitted Pay Application. Retainage shall be held until Substantial Completion and release of all required lien waivers.');
  gap();

  // 5. Schedule
  heading('5. Schedule');
  field('Start Date', formData.startDate);
  field('Substantial Completion', formData.substantialCompletion);
  field('Final Completion', formData.finalCompletion);
  para('Time is of the essence. Delays caused by the Subcontractor that impact the project schedule may result in liquidated damages as agreed in writing by both parties.');
  gap();

  // 6. Insurance
  heading('6. Insurance Requirements');
  para('Subcontractor shall maintain the following insurance coverage throughout the term of this Agreement and provide a Certificate of Insurance (COI) naming General Contractor as additional insured before commencing work:');
  const insuranceItems = [
    'Commercial General Liability: $1,000,000 per occurrence / $2,000,000 aggregate',
    "Workers' Compensation: Statutory limits per applicable state law",
    'Commercial Auto Liability: $1,000,000 combined single limit',
    'Umbrella/Excess Liability: As required by project specifications',
  ];
  insuranceItems.forEach(item => {
    checkPage(14);
    doc.setFontSize(9);
    doc.text('• ' + item, M + 10, y);
    y += 14;
  });
  gap();

  // 7. Change Orders
  heading('7. Change Orders');
  para('All changes to the Scope of Work, Contract Price, or Schedule must be authorized by a written Change Order signed by both parties before the changed work proceeds. Verbal authorizations are not binding. Subcontractor proceeds with unauthorized changes at its own risk.');
  gap();

  // 8. Lien Waivers
  heading('8. Lien Waivers');
  para('As a condition of each progress payment, Subcontractor shall execute and deliver a Conditional Waiver and Release on Progress Payment in a form acceptable to General Contractor. As a condition of final payment, Subcontractor shall execute and deliver an Unconditional Waiver and Release on Final Payment covering all labor, materials, and equipment furnished under this Agreement.');
  gap();

  // 9. Termination
  heading('9. Termination');
  para('Either party may terminate this Agreement for cause upon seven (7) days written notice if the other party materially breaches this Agreement and fails to cure such breach within the notice period. General Contractor may terminate for convenience upon fourteen (14) days written notice, in which case Subcontractor shall be paid for all work satisfactorily completed through the termination date.');
  gap();

  // 10. Dispute Resolution
  heading('10. Dispute Resolution');
  if (formData.disputeResolution === 'arbitration') {
    para('Any dispute, claim, or controversy arising out of or relating to this Agreement shall be resolved by binding arbitration administered by the American Arbitration Association under its Construction Industry Arbitration Rules. The arbitration shall take place in the county where the Project is located. The decision of the arbitrator shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.');
  } else {
    para(`Any dispute arising out of or relating to this Agreement shall be resolved in the state courts of ${formData.state || 'the governing state'}, and both parties consent to the exclusive jurisdiction of such courts.`);
  }
  gap();

  // 11. Governing Law
  heading('11. Governing Law');
  para(`This Agreement shall be governed by and construed in accordance with the laws of the State of ${formData.state || 'Idaho'}, without regard to its conflict of law provisions.`);
  gap();

  // 12. Special Conditions
  if (formData.specialConditions) {
    heading('12. Special Conditions');
    para(formData.specialConditions);
    gap();
  }

  // 13. General provisions
  heading('13. General Provisions');
  para('This Agreement constitutes the entire agreement between the parties with respect to its subject matter and supersedes all prior negotiations, representations, warranties, and understandings. This Agreement may not be modified except by a written instrument signed by both parties. If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.');
  gap();

  // Signature page
  doc.addPage();
  y = M;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNATURES', M, y);
  y += 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('By signing below, both parties agree to the terms and conditions of this Subcontractor Agreement.', M, y);
  y += 30;

  // Side-by-side signatures
  const halfW = PW / 2 - 20;

  // GC side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GENERAL CONTRACTOR', M, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(formData.gcCompany || '', M, y);
  y += 20;

  if (gcSignatureDataURL) {
    doc.addImage(gcSignatureDataURL, 'PNG', M, y, 160, 50);
  } else {
    doc.setDrawColor(100);
    doc.line(M, y + 50, M + 200, y + 50);
  }

  // Sub side
  const subX = M + halfW + 20;
  let sy = y - 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SUBCONTRACTOR', subX, sy);
  sy += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(formData.subCompany || '', subX, sy);
  sy += 20;

  if (subSignatureDataURL) {
    doc.addImage(subSignatureDataURL, 'PNG', subX, sy, 160, 50);
  } else {
    doc.setDrawColor(100);
    doc.line(subX, sy + 50, subX + 200, sy + 50);
  }

  y += 60;
  doc.setFontSize(8);
  doc.text('Authorized Signature', M, y);
  doc.text('Authorized Signature', subX, y);
  y += 18;
  doc.line(M, y, M + 200, y);
  doc.line(subX, y, subX + 200, y);
  doc.text('Printed Name & Title', M, y + 10);
  doc.text('Printed Name & Title', subX, y + 10);
  y += 26;
  doc.line(M, y, M + 120, y);
  doc.line(subX, y, subX + 120, y);
  doc.text('Date', M, y + 10);
  doc.text('Date', subX, y + 10);
  y += 40;

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated by SubPaperz on ${new Date().toLocaleDateString()} | subpaperz.com | This document does not constitute legal advice. Consult a licensed attorney for review before execution.`, M, 780, { maxWidth: PW });

  return doc;
}

window.generateSubAgreementPDF = generateSubAgreementPDF;
