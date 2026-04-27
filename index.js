const express = require('express');
const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use((req, res, next) => {
  console.log('=== INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  next();
});

app.post('/order', async (req, res) => {
  try {
    const body = req.body;
    const messageType = body?.message?.type;
    console.log('Message type:', messageType);

    // Only process end of call report
    if (messageType !== 'end-of-call-report') {
      console.log('Skipping non end-of-call event');
      return res.json({ success: true, skipped: true });
    }

    const transcript = body?.message?.artifact?.transcript || '';
    const customerName = extractName(transcript);
    const items = extractItems(transcript);
    const total = extractTotal(transcript);

    console.log('Customer:', customerName);
    console.log('Items:', items);
    console.log('Total:', total);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        customer_name: customerName,
        items: items,
        total: total,
        location: 'Smalls Sliders'
      })
    });

    console.log('Supabase response status:', response.status);
    res.json({ success: true });

  } catch (error) {
    console.error('Error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

function extractName(transcript) {
  // Look for name patterns like "name is Max" or "put it under Max" or "it's Max"
  const patterns = [
    /(?:name\s+(?:is|should be|under|for)\s+)([A-Z][a-z]+)/i,
    /(?:put it under|under the name|name for the order)\s+([A-Z][a-z]+)/i,
    /(?:it'?s|this is|my name is)\s+([A-Z][a-z]+)/i,
    /AI:\s*Perfect\s+([A-Z][a-z]+)/i,
    /Perfect\s+([A-Z][a-z]+)!/i,
  ];
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) return match[1];
  }
  return 'Guest';
}

function extractItems(transcript) {
  const items = [];
  const menuItems = [
    'Original Combo 1', 'Original Combo 2', 'Original Combo 3', 'Original Combo 4',
    'Biggie Smalls Combo', 'BBQ Combo 1', 'BBQ Combo 2', 'BBQ Combo 3',
    'BBQ Kids Combo', 'Original Slider', 'BBQ Bacon Jalapeno Slider',
    'Waffle Fries', 'Queso', 'Chocolate Milkshake', 'Strawberry Milkshake',
    'Cookies and Cream Milkshake', 'Smauce', 'Original Party Pack', 'Tray of Fries'
  ];
  menuItems.forEach(item => {
    if (transcript.toLowerCase().includes(item.toLowerCase())) {
      items.push(item);
    }
  });
  return items.length > 0 ? items.join(', ') : 'See transcript';
}

function extractTotal(transcript) {
  // Match spoken totals like "thirteen dollars and forty-nine cents" or "$13.49"
  const numericMatch = transcript.match(/\$?([\d]+\.[\d]{2})/);
  if (numericMatch) return numericMatch[1];

  // Word to number map for common amounts
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
  };

  const lower = transcript.toLowerCase();
  for (const [phrase, value] of Object.entries(words)) {
    if (lower.includes(phrase)) return value;
  }

  return 'Pay at counter';
}

app.get('/', (req, res) => {
  res.send('Smalls Sliders order webhook is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
