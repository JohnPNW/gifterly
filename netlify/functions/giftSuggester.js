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

    const prompt = `Suggest 5 specific gift ideas for a ${age} year old, interested in ${interests}, for the occasion: ${occasion}. The budget is $${budget}. It's crucial that each suggestion stays within this budget. For each suggestion, provide the product name, a brief description, an estimated price (which must be less than or equal to $${budget}), and a popular retailer where it can be purchased.`;

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
    const generatedText = data.generations[0].text.trim();

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
  const giftIdeas = [];
  const lines = text.split('\n');
  let currentIdea = {};

  for (const line of lines) {
    if (line.startsWith('Product:')) {
      if (Object.keys(currentIdea).length > 0) {
        giftIdeas.push(currentIdea);
        currentIdea = {};
      }
      currentIdea.product = line.replace('Product:', '').trim();
    } else if (line.startsWith('Description:')) {
      currentIdea.description = line.replace('Description:', '').trim();
    } else if (line.startsWith('Price:')) {
      currentIdea.price = line.replace('Price:', '').trim();
    } else if (line.startsWith('Retailer:')) {
      currentIdea.retailer = line.replace('Retailer:', '').trim();
    }
  }

  if (Object.keys(currentIdea).length > 0) {
    giftIdeas.push(currentIdea);
  }

  return giftIdeas.length > 0 ? giftIdeas : [{ product: 'Parsing Error', description: text, price: 'N/A', retailer: 'N/A' }];
}
