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

    const retailers = ['Amazon', 'Target', 'Walmart', 'Best Buy', 'Bass Pro Shop', 'Steam Games'];
    const prompt = `Suggest one gift idea for each of the following retailers: ${retailers.join(', ')}. The gift is for a ${age} year old, interested in ${interests || 'various things'}, for the occasion: ${occasion || 'general gifting'}. The budget is $${budget}. Format the response as a JSON object with retailer names as keys and gift ideas as values.`;

    const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();
    
    // Parse the generated text as JSON
    const giftIdeasText = data[0].generated_text.trim();
    const giftIdeas = JSON.parse(giftIdeasText);

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
