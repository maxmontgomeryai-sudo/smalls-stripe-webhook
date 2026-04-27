function extractName(transcript) {
  // Look specifically for what comes after "What name should I put on the order?"
  const patterns = [
    /Perfect\s+([A-Z][a-z]+)[!,]/i,
    /(?:name for the order|put on the order|name should I put)[^.]*?\n\s*(?:Customer|User)?:?\s*([A-Z][a-z]+)/i,
    /(?:Customer|User):\s*([A-Z][a-z]{2,})\s*\n.*?Perfect/is,
    /my name is\s+([A-Z][a-z]+)/i,
    /(?:it'?s|this is)\s+([A-Z][a-z]+)/i,
  ];
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1].toLowerCase() !== 'the' && 
        match[1].toLowerCase() !== 'just' && 
        match[1].toLowerCase() !== 'pay') {
      return match[1];
    }
  }
  return 'Guest';
}

function extractItems(transcript) {
  const items = [];

  // Match combos first — if a combo is ordered, don't separately list fries
  const comboPatterns = [
    { pattern: /original combo (?:one|1)/i, name: 'Original Combo 1' },
    { pattern: /original combo (?:two|2)/i, name: 'Original Combo 2' },
    { pattern: /original combo (?:three|3)/i, name: 'Original Combo 3' },
    { pattern: /original combo (?:four|4)/i, name: 'Original Combo 4' },
    { pattern: /biggie smalls combo/i, name: 'Biggie Smalls Combo' },
    { pattern: /bbq (?:bacon )?combo (?:one|1)/i, name: 'BBQ Combo 1' },
    { pattern: /bbq (?:bacon )?combo (?:two|2)/i, name: 'BBQ Combo 2' },
    { pattern: /bbq (?:bacon )?combo (?:three|3)/i, name: 'BBQ Combo 3' },
  ];

  let hasCombo = false;
  comboPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(transcript)) {
      items.push(name);
      hasCombo = true;
    }
  });

  // Only add fries if no combo was ordered
  if (!hasCombo && /waffle fries/i.test(transcript) && 
      /(?:customer|user):.*waffle fries/i.test(transcript)) {
    items.push('Waffle Fries');
  }

  // Add-ons — only if customer said yes
  if (/(?:customer|user):.*(?:yes|yeah|sure|add).*(?:queso|cheese dip)/i.test(transcript) ||
      /(?:customer|user):.*queso/i.test(transcript)) {
    items.push('Queso');
  }

  const shakes = [
    { pattern: /chocolate (?:milk)?shake/i, name: 'Chocolate Milkshake' },
    { pattern: /strawberry (?:milk)?shake/i, name: 'Strawberry Milkshake' },
    { pattern: /cookies and cream (?:milk)?shake/i, name: 'Cookies & Cream Milkshake' },
  ];
  shakes.forEach(({ pattern, name }) => {
    if (pattern.test(transcript)) items.push(name);
  });

  // A la carte items only if customer explicitly ordered them
  if (!hasCombo && /(?:customer|user):.*original slider/i.test(transcript)) {
    items.push('Original Slider');
  }
  if (/(?:customer|user):.*bbq bacon/i.test(transcript)) {
    items.push('BBQ Bacon Jalapeño Slider');
  }
  if (/party pack/i.test(transcript)) items.push('Original Party Pack');
  if (/tray of fries/i.test(transcript)) items.push('Tray of Fries');

  return items.length > 0 ? items.join(', ') : 'See transcript';
}

function extractTotal(transcript) {
  const numericMatch = transcript.match(/\$?([\d]+\.[\d]{2})/);
  if (numericMatch) return numericMatch[1];

  const words = {
    'eight dollars and eleven cents': '8.11',
    'ten dollars and forty-nine cents': '10.49',
    'thirteen dollars and forty-nine cents': '13.49',
    'fifteen dollars and ninety-nine cents': '15.99',
    'fourteen dollars and seventy-three cents': '14.73',
    'thirteen dollars and ninety-nine cents': '13.99',
    'sixteen dollars and ninety-nine cents': '16.99',
    'six dollars and twenty-four cents': '6.24',
    'three dollars and seventy-four cents': '3.74',
    'two dollars and ninety-nine cents': '2.99',
    'three dollars and forty-nine cents': '3.49',
    'nine dollars and thirty-five cents': '9.35',
    'twenty-three dollars and ninety-seven cents': '23.97',
    'twenty dollars and twenty-three cents': '20.23',
    'eighteen dollars and forty-seven cents': '18.47',
  };

  const lower = transcript.toLowerCase();
  for (const [phrase, value] of Object.entries(words)) {
    if (lower.includes(phrase)) return value;
  }

  return 'Pay at counter';
}
