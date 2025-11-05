// This is the new Cloudflare Pages function
// saved at /functions/api/calculate-risk.js

// Helper function from your original file
function getRiskLevel(score) {
  if (score < 5) return 'Low';
  if (score < 15) return 'Medium';
  if (score < 25) return 'High';
  return 'Very High';
}

// Function to handle POST requests
async function handlePostRequest(context) {
  try {
    const data = await context.request.json();
    const { likelihood, severity, mitigation } = data;

    // Simple validation from your original file
    if (typeof likelihood !== 'number' || typeof severity !== 'number' || typeof mitigation !== 'number') {
      return new Response(JSON.stringify({ error: 'All inputs must be numbers.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (mitigation === 0) {
      return new Response(JSON.stringify({ error: 'Mitigation cannot be zero.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // The risk calculation logic from your original file
    const riskScore = (likelihood * severity) / mitigation;
    const riskLevel = getRiskLevel(riskScore);

    const responseBody = { riskScore: riskScore.toFixed(2), riskLevel };
    
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Add CORS header
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to calculate risk', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Function to handle preflight OPTIONS requests (for CORS)
async function handleOptionsRequest(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Main handler that checks the request method
export async function onRequest(context) {
  if (context.request.method === 'POST') {
    return handlePostRequest(context);
  } else if (context.request.method === 'OPTIONS') {
    return handleOptionsRequest(context);
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST, OPTIONS' // Tell the browser which methods are allowed
      },
    });
  }
}
