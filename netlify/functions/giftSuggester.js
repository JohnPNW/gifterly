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

    const prompt = `Suggest 5 specific gift ideas for a ${age} year old, interested in ${interests}, for the occasion: ${occasion}. The MAXIMUM budget is $${budget}. It is CRITICAL that each suggestion's price is less than or equal to $${budget}. Do not exceed this budget under any circumstances.

For each suggestion, provide:
1. Product Name
2. Brief Description (max 20 words)
3. Estimated Price (must be less than or equal to $${budget})
4. Popular Retailer where it can be purchased

Format each gift idea exactly as follows:
"Product Name - Description - Price - Retailer"

Ensure that each suggestion is on a new line and follows this exact format. Do not include any additional text or explanations outside of this format.`;

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
        max_tokens: 500,  // Increased to allow for longer responses
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

    // Additional check to filter out any suggestions that exceed the budget
    const filteredGiftIdeas = giftIdeas.filter(idea => {
      const price = parseFloat(idea.price.replace('$', ''));
      return !isNaN(price) && price <= parseFloat(budget);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ giftIdeas: filteredGiftIdeas }),
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
    const [product, description, price, retailer] = line.split(' - ').map(item => item.trim());
    return { product, description, price, retailer };
  });
}
