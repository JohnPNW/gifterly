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

    const prompt = `Suggest 5 specific gift ideas for a ${age} year old, interested in ${interests || 'various things'}, for the occasion: ${occasion || 'general gifting'}. The budget is $${budget}. For each suggestion, provide the product name, a brief description, an estimated price, and a popular retailer where it can be purchased. Format the response as a JSON array of objects, each with 'product', 'description', 'price', and 'retailer' keys.`;

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
    
    // Log the raw response for debugging
    console.log('Raw API response:', JSON.stringify(data));

    // Parse the generated text as JSON
    const giftIdeasText = data[0].generated_text.trim();
    console.log('Generated text:', giftIdeasText);

    let giftIdeas;
    try {
      giftIdeas = JSON.parse(giftIdeasText);
    } catch (parseError) {
      console.error('Failed to parse gift ideas:', parseError);
      // If parsing fails, return the raw text
      giftIdeas = [{ product: 'Parsing Error', description: giftIdeasText, price: 'N/A', retailer: 'N/A' }];
    }

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
