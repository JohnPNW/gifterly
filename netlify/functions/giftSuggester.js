const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Parse the incoming request body
    const { budget, occasion, age, interests } = JSON.parse(event.body || '{}');

    // Validate input
    if (!budget || !age) {
      throw new Error('Budget and age are required fields');
    }

    // Construct the prompt for the Hugging Face API
    const prompt = `Suggest 5 gift ideas for a ${age} year old, interested in ${interests || 'various things'}, for the occasion: ${occasion || 'general gifting'}. The budget is $${budget}.`;

    const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();
    
    // Extract gift ideas from the response
    const giftIdeas = data[0].generated_text
      .split('\n')
      .filter(idea => idea.trim().length > 0)
      .slice(0, 5);

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
