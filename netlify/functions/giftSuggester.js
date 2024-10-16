const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { budget, occasion, age, interests } = JSON.parse(event.body || '{}');
    if (!budget || !age) {
      throw new Error('Budget and age are required fields');
    }

    const prompt = `Suggest 5 specific gift ideas for a ${age} year old, interested in ${interests || 'various things'}, for the occasion: ${occasion || 'general gifting'}. The budget is $${budget}. For each suggestion, provide the product name, a brief description, an estimated price, and a popular retailer where it can be purchased.`;

    const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Raw API response:', JSON.stringify(data));

    const generatedText = data[0].generated_text.trim();
    console.log('Generated text:', generatedText);

    // Custom parsing logic
    const giftIdeas = parseGiftIdeas(generatedText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ giftIdeas }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate gift ideas', details: error.message }),
    };
  }
};

function parseGiftIdeas(text) {
  const ideas = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^\d+\./)) {  // Look for lines starting with a number and period
      const idea = {
        product: line.split('.')[1].trim(),
        description: '',
        price: 'N/A',
        retailer: 'N/A'
      };
      
      // Look for description, price, and retailer in the next few lines
      for (let j = i + 1; j < i + 4 && j < lines.length; j++) {
        const subline = lines[j].trim();
        if (subline.includes('$')) {
          idea.price = subline.match(/\$\d+(\.\d{2})?/)[0];
        }
        if (subline.includes('at') || subline.includes('from')) {
          idea.retailer = subline.split(/at|from/).pop().trim();
        }
        if (!subline.includes('$') && !subline.includes('at') && !subline.includes('from')) {
          idea.description += ' ' + subline;
        }
      }
      
      idea.description = idea.description.trim();
      ideas.push(idea);
      
      if (ideas.length === 5) break;  // Stop after finding 5 ideas
    }
  }
  
  return ideas;
}
