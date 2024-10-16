document.getElementById('giftSurvey').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const budget = document.getElementById('budget').value;
    const occasion = document.getElementById('occasion').value;
    const age = document.getElementById('age').value;
    const interests = document.getElementById('interests').value;

    const response = await fetch('https://your-netlify-function-url.netlify.app/.netlify/functions/getGiftIdeas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ budget, occasion, age, interests }),
    });

    const data = await response.json();
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h3>Gift Ideas:</h3>';
    data.giftIdeas.forEach(idea => {
        const link = document.createElement('a');
        link.href = `https://www.amazon.com/s?k=${encodeURIComponent(idea)}`;
        link.target = '_blank';
        link.textContent = idea;
        resultsDiv.appendChild(link);
        resultsDiv.appendChild(document.createElement('br'));
    });
});