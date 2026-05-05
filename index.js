const express = require('express');
const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const ASSISTANT_MAP = {
  '5a07b55c-874a-4df7-b3ca-1c5e4a434c9f': 'Smalls Sliders',
  '31f48680-6ab3-4005-8479-c7454eba6f0d': 'Waka House',
};

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
    const assistantId = body.message.assistant && body.message.assistant.id;
    const location = ASSISTANT_MAP[assistantId] || 'Unknown Restaurant';

    console.log('Assistant ID:', assistantId);
    console.log('Location:', location);

    const customerName = extractName(transcript);
    const items = extractItems(transcript, location);
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
        location: location
      })
    });

    console.log('Supabase status:', response.status);
    res.json({ success: true, location: location });

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
    if (nameQuestion && (line.indexOf('sam:') !== -1 || line.indexOf('yuki:') !== -1)) {
      nameQuestion = false;
    }
  }
  return 'Guest';
}

function extractItems(transcript, location) {
  var items = [];
  var lower = transcript.toLowerCase();

  if (location === 'Smalls Sliders') {
    var hasCombo = false;
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
    ];
    combos.forEach(function(combo) {
      if (lower.indexOf(combo.pattern) !== -1) { items.push(combo.name); hasCombo = true; }
    });
    if (/chocolate (?:milk)?shake/i.test(transcript)) items.push('Chocolate Milkshake');
    if (/strawberry (?:milk)?shake/i.test(transcript)) items.push('Strawberry Milkshake');
    if (/cookies and cream (?:milk)?shake/i.test(transcript)) items.push('Cookies & Cream Milkshake');
    if (/queso/i.test(transcript) && /customer:.*queso/i.test(transcript)) items.push('Queso');
    if (!hasCombo && /waffle fries/i.test(transcript)) items.push('Waffle Fries');
    if (/party pack/i.test(transcript)) items.push('Original Party Pack');

  } else if (location === 'Waka House') {
    var wakaItems = [
      'Hayden roll', 'California roll', 'Alex roll', 'Dragon roll', 'Dynamite roll',
      'Spicy tuna roll', 'Salmon roll', 'Rainbow roll', 'Spider roll', 'Philadelphia roll',
      'Osaka roll', 'Johnson roll', 'Cube roll', 'Waka crunchy roll', 'Rock and roll',
      'Salmon avocado roll', 'Salmon dragon roll', 'Tuna avocado roll', 'Shrimp tempura roll',
      'Eel avocado roll', 'Crunchy roll', 'Avocado roll', 'Cucumber roll', 'Cara roll',
      'Miso soup', 'Clear soup', 'Edamame', 'Gyoza', 'Mixed tempura', 'Chicken tempura',
      'Age tofu', 'Tuna tataki', 'Baked mussels', 'Waka shrimp',
      'Escolar sashimi', 'Salmon sashimi', 'Tuna sashimi', 'Yellowtail sashimi',
      'Green tea ice cream', 'Mango sherbet', 'Ginger sherbet',
      'Cucumber salad', 'Seaweed salad', 'House salad',
    ];
    wakaItems.forEach(function(item) {
      if (lower.indexOf(item.toLowerCase()) !== -1) items.push(item);
    });

  } else {
    return 'See transcript';
  }

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
    'twenty-three dollars and ninety-seven cents': '23.97',
  };

  var lower = transcript.toLowerCase();
  for (var phrase in words) {
    if (lower.indexOf(phrase) !== -1) return words[phrase];
  }
  return 'Pay at counter';
}

app.get('/', (req, res) => {
  res.send('Dispatch AI — Multi-Restaurant Order Webhook is running!');
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});
