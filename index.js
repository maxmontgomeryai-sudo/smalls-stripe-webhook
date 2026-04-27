const express = require('express');
const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use((req, res, next) => {
  console.log('Method:', req.method, '| Path:', req.path);
  next();
});

app.post('/order', async (req, res) => {
  try {
    const body = req.body;
    const messageType = body && body.message && body.message.type;
    console.log('Message type:', messageType);

    if (messageType !== 'end-of-call-report') {
      console.log('Skipping non end-of-call event');
      return res.json({ success: true, skipped: true });
    }

    const transcript = (body.message.artifact && body.message.artifact.transcript) || '';
    console.log('Transcript length:', transcript.length);

    const customerName = extractName(transcript);
    const items = extractItems(transcript);
    const total = extractTotal(transcript);

    console.log('Customer:', customerName);
    console.log('Items:', items);
    console.log('Total:', total);

    const response = await fetch(SUPABASE_URL + '/rest/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify({
        customer_name: customerName,
        items: items,
        total: total,
        location: 'Smalls Sliders'
      })
    });

    console.log('Supabase status:', response.status);
    res.json({ success: true });

  } catch (error) {
    console.error('Error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

function extractName(transcript) {
  var lines = transcript.split('\n');
  var nameQuestion = false;
  var skip = ['the', 'just', 'pay', 'your', 'all', 'set', 'see', 'you', 'soon', 'it', 'is', 'my', 'choice', 'good', 'yes', 'no', 'okay', 'sure', 'great'];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].toLowerCase();

    if (line.indexOf('name should i put') !== -1 ||
        line.indexOf('name for the order') !== -1 ||
        line.indexOf('what name') !== -1) {
      nameQuestion = true;
      continue;
    }

    if (nameQuestion && (line.indexOf('customer:') !== -1 || line.indexOf('user:') !== -1)) {
      var nameLine = lines[i].replace(/customer:|user:/gi, '').trim();
      var firstName = nameLine.split(' ')[0].trim();
      if (firstName.length > 1 && skip.indexOf(firstName.toLowerCase()) === -1) {
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      }
    }

    if (nameQuestion && line.indexOf('sam:') !== -1) {
      nameQuestion = false;
    }
  }

  return 'Guest';
}

function extractItems(transcript) {
  var items = [];
  var hasCombo = false;
  var lower = transcript.toLowerCase();

  var combos = [
    { pattern: 'original combo one', name: 'Original Combo 1' },
    { pattern: 'original combo two', name: 'Original Combo 2' },
    { pattern: 'original combo three', name: 'Original Combo 3' },
    { pattern: 'original combo four', name: 'Original Combo 4' },
    { pattern: 'original combo 1', name: 'Original Combo 1' },
    { pattern: 'original combo 2', name: 'Original Combo 2' },
    { pattern: 'original combo 3', name: 'Original Combo 3' },
    { pattern: 'original combo 4', name: 'Original Combo 4' },
    { pattern: 'biggie smalls combo', name: 'Biggie Smalls Combo' },
    { pattern: 'bbq combo one', name: 'BBQ Combo 1' },
    { pattern: 'bbq combo two', name: 'BBQ Combo 2' },
    { pattern: 'bbq combo three', name: 'BBQ Combo 3' },
    { pattern: 'bbq combo 1', name: 'BBQ Combo 1' },
    { pattern: 'bbq combo 2', name: 'BBQ Combo 2' },
    { pattern: 'bbq combo 3', name: 'BBQ Combo 3' },
  ];

  combos.forEach(function(combo) {
    if (lower.indexOf(combo.pattern) !== -1) {
      items.push(combo.name);
      hasCombo = true;
    }
  });

  if (/chocolate (?:milk)?shake/i.test(transcript)) items.push('Chocolate Milkshake');
  if (/strawberry (?:milk)?shake/i.test(transcript)) items.push('Strawberry Milkshake');
  if (/cookies and cream (?:milk)?shake/i.test(transcript)) items.push('Cookies & Cream Milkshake');
  if (/queso/i.test(transcript) && /customer:.*queso/i.test(transcript)) items.push('Queso');
  if (!hasCombo && /waffle fries/i.test(transcript)) items.push('Waffle Fries');
  if (/party pack/i.test(transcript)) items.push('Original Party Pack');
  if (/tray of fries/i.test(transcript)) items.push('Tray of Fries');
  if (!hasCombo && /original slider/i.test(transcript)) items.push('Original Slider');

  return items.length > 0 ? items.join(', ') : 'See transcript';
}

function extractTotal(transcript) {
  var numericMatch = transcript.match(/\$?([\d]+\.[\d]{2})/);
  if (numericMatch) return numericMatch[1];

  var words = {
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
    'eighteen dollars and forty-seven cents': '18.47'
  };

  var lower = transcript.toLowerCase();
  for (var phrase in words) {
    if (lower.indexOf(phrase) !== -1) return words[phrase];
  }

  return 'Pay at counter';
}

app.get('/', (req, res) => {
  res.send('Smalls Sliders order webhook is running!');
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});
