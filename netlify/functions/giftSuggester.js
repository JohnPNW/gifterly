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

    const prompt = `Suggest 5 specific gift ideas for a ${age} year old, interested in ${interests}, for the occasion: ${occasion}. The budget is $${budget}. It's crucial that each suggestion stays within this budget. For each suggestion, provide the product name, a brief description, an estimated price (which must be less than or equal to $${budget}), and a popular retailer where it can be purchased. Format the response as a JSON array of objects, each with 'product', 'description', 'price', and 'retailer' keys.`;

    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
        'Cohere-Version': '2022-12-06'
      },
      body: JSON.stringify({
        model: 'command',
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7,
        k: 0,
        stop_sequences: [],
        return_likelihoods: 'NONE'
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API response:', JSON.stringify(data));

    const generatedText = data.generations[0].text.trim();
    console.log('Generated text:', generatedText);

    let giftIdeas = parseGiftIdeas(generatedText);

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
  try {
    // First, try to parse the entire text as JSON
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse entire text as JSON:', e);
    
    // If that fails, try to extract JSON from the text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e);
      }
    }
    
    // If JSON extraction fails, fall back to regex parsing
    return parseWithRegex(text);
  }
}

function parseWithRegex(text) {
  const giftIdeas = [];
  const regex = /"product"\s*:\s*"([^"]*)"\s*,\s*"description"\s*:\s*"([^"]*)"\s*,\s*"price"\s*:\s*"([^"]*)"\s*,\s*"retailer"\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    giftIdeas.push({
      product: match[1],
      description: match[2],
      price: match[3],
      retailer: match[4]
    });
  }
  return giftIdeas.length > 0 ? giftIdeas : [{ product: 'Parsing Error', description: text, price: 'N/A', retailer: 'N/A' }];
}
