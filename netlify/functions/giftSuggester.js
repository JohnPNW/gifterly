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
    const { recipientName, budget, occasion, age, interests } = JSON.parse(event.body || '{}');

    if (!recipientName || !budget || !occasion || !age || !interests) {
      throw new Error('All fields are required');
    }

    const prompt = `Suggest 5 specific gift ideas from Amazon.com for ${recipientName}, a ${age} year old, interested in ${interests}, for the occasion: ${occasion}. The budget is $${budget}. For each suggestion, provide the product name, a brief description, an estimated price, and "Amazon" as the retailer. Ensure all suggestions are within budget, appropriate for the occasion and age, and relevant to the interests. Format each gift idea as: "Product Name - Description - Price - Retailer".`;

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
    const [product, description, price, retailer] = line.split(' - ');
    return { product, description, price, retailer: retailer || 'Amazon' };
  });
}
