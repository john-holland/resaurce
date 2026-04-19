'use strict';

/**
 * Pure-JS tax document generation (strategy A: port from inventory tax_documents.py formulas).
 * Keeps resaurce self-contained; no subprocess Python for LVM single-writer semantics.
 */

function getUserTaxData(userId, year) {
  const h = [...String(userId)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseWages = 50000 + (h % 20000);
  const baseInvestments = 10000 + (h % 5000);
  return {
    wages: baseWages,
    taxes_withheld: baseWages * 0.22,
    investment_gains: baseInvestments * 0.15,
    investment_losses: baseInvestments * 0.05,
    capital_losses: baseInvestments * 0.1,
    cancelled_debt: baseWages * 0.02,
  };
}

function generateW2Form(userId, year) {
  const userData = getUserTaxData(userId, year);
  const wages = userData.wages;
  const taxesWithheld = userData.taxes_withheld;
  const socialSecurityWages = Math.min(wages, 160200);
  const medicareWages = wages;
  const socialSecurityTax = socialSecurityWages * 0.062;
  const medicareTax = medicareWages * 0.0145;
  return {
    user_id: userId,
    year,
    wages,
    taxes_withheld: taxesWithheld,
    social_security_wages: socialSecurityWages,
    social_security_tax: socialSecurityTax,
    medicare_wages: medicareWages,
    medicare_tax: medicareTax,
    generated_at: new Date().toISOString(),
    document_type: 'W2',
  };
}

function generate1099cForm(userId, year) {
  const userData = getUserTaxData(userId, year);
  const cancelledDebt = userData.cancelled_debt;
  const taxableAmount = Math.max(cancelledDebt, 0);
  return {
    user_id: userId,
    year,
    cancelled_debt: cancelledDebt,
    taxable_amount: taxableAmount,
    generated_at: new Date().toISOString(),
    document_type: '1099-C',
  };
}

function generateInvestmentDocuments(userId, year) {
  const userData = getUserTaxData(userId, year);
  const gains = userData.investment_gains;
  const shortTermTax = gains * 0.22;
  const longTermTax = gains * 0.15;
  return {
    user_id: userId,
    year,
    investment_gains: gains,
    investment_losses: userData.investment_losses,
    short_term_tax: shortTermTax,
    long_term_tax: longTermTax,
    generated_at: new Date().toISOString(),
    document_type: 'investment_gains_losses',
  };
}

/**
 * @param {string} userId
 * @param {number} year
 * @param {string} documentType
 */
function generateTaxDocument(userId, year, documentType) {
  const dt = String(documentType || '').toLowerCase();
  if (dt.includes('1099')) return generate1099cForm(userId, year);
  if (dt.includes('investment')) return generateInvestmentDocuments(userId, year);
  return generateW2Form(userId, year);
}

module.exports = {
  generateTaxDocument,
  getUserTaxData,
};
