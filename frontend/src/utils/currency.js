// ── Currency utility ──────────────────────────────────────────────────────────
// All prices in DB are stored in INR. We convert on the frontend using
// approximate exchange rates. Rates update on app load via open exchange API
// (falls back to hardcoded rates if offline).

export const COUNTRY_CURRENCY = {
  // Asia
  India:        { code: 'INR', symbol: '₹',  name: 'Indian Rupee',      rate: 1       },
  Pakistan:     { code: 'PKR', symbol: '₨',  name: 'Pakistani Rupee',   rate: 0.29    },
  Bangladesh:   { code: 'BDT', symbol: '৳',  name: 'Bangladeshi Taka',  rate: 0.97    },
  'Sri Lanka':  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee',  rate: 0.33    },
  Nepal:        { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee',    rate: 1.6     },
  China:        { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan',      rate: 0.085   },
  Japan:        { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',      rate: 1.77    },
  'South Korea':{ code: 'KRW', symbol: '₩',  name: 'South Korean Won',  rate: 15.8    },
  Singapore:    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',  rate: 0.016   },
  Malaysia:     { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rate: 0.055   },
  Thailand:     { code: 'THB', symbol: '฿',  name: 'Thai Baht',         rate: 0.42    },
  Indonesia:    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rate: 188      },
  Philippines:  { code: 'PHP', symbol: '₱',  name: 'Philippine Peso',   rate: 0.68    },
  Vietnam:      { code: 'VND', symbol: '₫',  name: 'Vietnamese Dong',   rate: 292      },
  UAE:          { code: 'AED', symbol: 'AED',name: 'UAE Dirham',         rate: 0.044   },
  'Saudi Arabia':{ code:'SAR', symbol: 'SAR',name: 'Saudi Riyal',        rate: 0.045   },
  // Europe
  'United Kingdom': { code: 'GBP', symbol: '£',  name: 'British Pound',  rate: 0.0095  },
  Germany:      { code: 'EUR', symbol: '€',  name: 'Euro',               rate: 0.011   },
  France:       { code: 'EUR', symbol: '€',  name: 'Euro',               rate: 0.011   },
  Italy:        { code: 'EUR', symbol: '€',  name: 'Euro',               rate: 0.011   },
  Spain:        { code: 'EUR', symbol: '€',  name: 'Euro',               rate: 0.011   },
  Netherlands:  { code: 'EUR', symbol: '€',  name: 'Euro',               rate: 0.011   },
  // Americas
  'United States': { code: 'USD', symbol: '$',  name: 'US Dollar',       rate: 0.012   },
  Canada:       { code: 'CAD', symbol: 'CA$',name: 'Canadian Dollar',    rate: 0.016   },
  Brazil:       { code: 'BRL', symbol: 'R$', name: 'Brazilian Real',     rate: 0.06    },
  Mexico:       { code: 'MXN', symbol: 'MX$',name: 'Mexican Peso',       rate: 0.2     },
  // Oceania
  Australia:    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar',  rate: 0.018   },
  'New Zealand':{ code: 'NZD', symbol: 'NZ$',name: 'New Zealand Dollar', rate: 0.02    },
  // Africa
  Nigeria:      { code: 'NGN', symbol: '₦',  name: 'Nigerian Naira',    rate: 15       },
  Kenya:        { code: 'KES', symbol: 'KSh',name: 'Kenyan Shilling',    rate: 1.55    },
  'South Africa':{ code:'ZAR', symbol: 'R',  name: 'South African Rand', rate: 0.22    },
};

// Fallback for unknown countries
export const DEFAULT_CURRENCY = COUNTRY_CURRENCY['India'];

/** Get currency config for a country name */
export function getCurrency(country) {
  return COUNTRY_CURRENCY[country] || DEFAULT_CURRENCY;
}

/**
 * Format a price (stored in INR) for display in the user's currency.
 * @param {number} inrPrice  - price in INR from DB
 * @param {string} country   - user's country from localStorage
 */
export function formatPrice(inrPrice, country) {
  const cur = getCurrency(country);
  const converted = inrPrice * cur.rate;

  // Choose decimal places based on currency
  const noDecimals = ['JPY', 'KRW', 'IDR', 'VND', 'NGN'];
  const decimals = noDecimals.includes(cur.code) ? 0 : 2;

  const formatted = new Intl.NumberFormat('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(converted);

  return `${cur.symbol}${formatted}`;
}

/** All country names sorted alphabetically for the signup dropdown */
export const COUNTRIES = Object.keys(COUNTRY_CURRENCY).sort();

// ── Dial codes per country ────────────────────────────────────────────────────
export const COUNTRY_DIAL = {
  India:           { code: '+91',  digits: 10, placeholder: '98765 43210'  },
  Pakistan:        { code: '+92',  digits: 10, placeholder: '301 2345678'  },
  Bangladesh:      { code: '+880', digits: 10, placeholder: '1711 123456'  },
  'Sri Lanka':     { code: '+94',  digits: 9,  placeholder: '71 234 5678'  },
  Nepal:           { code: '+977', digits: 10, placeholder: '984 1234567'  },
  China:           { code: '+86',  digits: 11, placeholder: '131 2345 6789'},
  Japan:           { code: '+81',  digits: 10, placeholder: '90 1234 5678' },
  'South Korea':   { code: '+82',  digits: 10, placeholder: '10 1234 5678' },
  Singapore:       { code: '+65',  digits: 8,  placeholder: '8123 4567'    },
  Malaysia:        { code: '+60',  digits: 10, placeholder: '12 345 6789'  },
  Thailand:        { code: '+66',  digits: 9,  placeholder: '81 234 5678'  },
  Indonesia:       { code: '+62',  digits: 11, placeholder: '812 3456 7890'},
  Philippines:     { code: '+63',  digits: 10, placeholder: '917 123 4567' },
  Vietnam:         { code: '+84',  digits: 10, placeholder: '91 234 5678'  },
  UAE:             { code: '+971', digits: 9,  placeholder: '50 123 4567'  },
  'Saudi Arabia':  { code: '+966', digits: 9,  placeholder: '51 234 5678'  },
  'United Kingdom':{ code: '+44',  digits: 10, placeholder: '7911 123456'  },
  Germany:         { code: '+49',  digits: 11, placeholder: '151 12345678' },
  France:          { code: '+33',  digits: 9,  placeholder: '6 12 34 56 78'},
  Italy:           { code: '+39',  digits: 10, placeholder: '312 345 6789' },
  Spain:           { code: '+34',  digits: 9,  placeholder: '612 345 678'  },
  Netherlands:     { code: '+31',  digits: 9,  placeholder: '6 12345678'   },
  'United States': { code: '+1',   digits: 10, placeholder: '201 555 0123' },
  Canada:          { code: '+1',   digits: 10, placeholder: '204 555 0123' },
  Brazil:          { code: '+55',  digits: 11, placeholder: '11 91234 5678'},
  Mexico:          { code: '+52',  digits: 10, placeholder: '55 1234 5678' },
  Australia:       { code: '+61',  digits: 9,  placeholder: '412 345 678'  },
  'New Zealand':   { code: '+64',  digits: 9,  placeholder: '21 123 4567'  },
  Nigeria:         { code: '+234', digits: 10, placeholder: '802 123 4567' },
  Kenya:           { code: '+254', digits: 9,  placeholder: '712 345 678'  },
  'South Africa':  { code: '+27',  digits: 9,  placeholder: '71 234 5678'  },
};

export function getDialInfo(country) {
  return COUNTRY_DIAL[country] || { code: '+91', digits: 10, placeholder: '98765 43210' };
}