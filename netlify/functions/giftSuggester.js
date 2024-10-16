const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Parse the incoming request body
  const { budget, occasion, age, interests } = JSON.parse(event.body);

  // Construct the prompt for the Hugging Face API
  const prompt = `Suggest 5 gift ideas for a ${age} year old, interested in ${interests}, for the occasion: ${occasion}. The budget is $${budget}.`;

  try {
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
      body: JSON.stringify({ giftIdeas }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate gift ideas' }),
    };
  }
};
