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

    const prompt = `Suggest 5 specific gift ideas for a ${age} year old, interested in ${interests}, for the occasion: ${occasion}. The budget is $${budget}. For each suggestion, provide the product name, a brief description, an estimated price, and a popular retailer where it can be purchased. Format the response as a list of 5 items, each on a new line, with the format: Product Name - Description - Price - Retailer`;

    const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
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

    let generatedText = '';
    if (Array.isArray(data) && data.length > 0) {
      generatedText = data[0].summary_text || data[0].generated_text || '';
    }
    console.log('Generated text:', generatedText);

    if (!generatedText) {
      throw new Error('No gift ideas generated. Please try again.');
    }

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
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const parts = line.split(' - ');
    return {
      product: parts[0] || 'Unknown Product',
      description: parts[1] || 'No description available',
      price: parts[2] || 'Price not specified',
      retailer: parts[3] || 'Retailer not specified'
    };
  });
}
