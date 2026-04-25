const express = require('express');
const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.post('/order', async (req, res) => {
  try {
    const body = req.body;
    
    // Extract order details from Vapi webhook
    const transcript = body?.message?.artifact?.transcript || '';
    const customerName = extractName(transcript);
    const items = extractItems(transcript);
    const total = extractTotal(transcript);

    // Save to Supabase
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

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: error.message });
  }
});

function extractName(transcript) {
  const match = transcript.match(/name[^\w]*([A-Z][a-z]+)/i);
  return match ? match[1] : 'Unknown';
}

function extractItems(transcript) {
  const items = [];
  const menuItems = [
    'Original Combo 1', 'Original Combo 2', 'Original Combo 3', 'Original Combo 4',
    'Biggie Smalls Combo', 'BBQ Combo 1', 'BBQ Combo 2', 'BBQ Combo 3',
    'Original Slider', 'BBQ Bacon Jalapeno Slider', 'Waffle Fries',
    'Queso', 'Chocolate Milkshake', 'Strawberry Milkshake', 
    'Cookies and Cream Milkshake', 'Smauce', 'Party Pack', 'Tray of Fries'
  ];
  menuItems.forEach(item => {
    if (transcript.toLowerCase().includes(item.toLowerCase())) {
      items.push(item);
    }
  });
  return items.length > 0 ? items.join(', ') : 'See transcript';
}

function extractTotal(transcript) {
  const match = transcript.match(/total[^\d]*(\$?[\d]+\.[\d]{2})/i);
  return match ? match[1] : 'Unknown';
}

app.get('/', (req, res) => {
  res.send('Smalls Sliders order webhook is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
