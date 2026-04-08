// src/utils/commission.js

export function calculateCommission(amount) {
    const commission = amount * 0.02;
    const sellerAmount = amount - commission;
  
    return {
      commission,
      sellerAmount,
    };
  }
  