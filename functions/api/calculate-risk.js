/*
 * FILE: /functions/api/calculate-risk.js
 * This is the NEW, CORRECTED Cloudflare Pages function.
 * It contains all your original ICAO logic.
 */

// --- ICAO Mappings (Copied from your original file) ---
const flockValueMap = { 'Solitary': 1, 'Loose': 2, 'Tight': 4 };

const mapScoreToSeverity = (score) => {
    if (score >= 32) return 'Very High';
    if (score >= 16) return 'High';
    if (score >= 8) return 'Moderate';
    if (score >= 4) return 'Low';
    if (score > 0) return 'Very Low';
    return 'N/A';
};

const icaoLikelihoodMap = {
    "Permanent": "Very High", "Most": "High", "Some": "Moderate", "Few": "Low", "Occasional": "Very Low"
};

const riskMatrix = {
    'Very High': { 'Very High': 'Red', 'High': 'Red', 'Moderate': 'Red', 'Low': 'Red', 'Very Low': 'Yellow' },
    'High':      { 'Very High': 'Red', 'High': 'Red', 'Moderate': 'Red', 'Low': 'Yellow', 'Very Low': 'Yellow' },
    'Moderate':  { 'Very High': 'Red', 'High': 'Red', 'Moderate': 'Yellow', 'Low': 'Green', 'Very Low': 'Green' },
    'Low':       { 'Very High': 'Red', 'High': 'Yellow', 'Moderate': 'Green', 'Low': 'Green', 'Very Low': 'Green' },
    'Very Low':  { 'Very High': 'Yellow', 'High': 'Yellow', 'Moderate': 'Green', 'Low': 'Green', 'Very Low': 'Green' },
    'N/A':       { 'Very High': 'N/A', 'High': 'N/A', 'Moderate': 'N/A', 'Low': 'N/A', 'Very Low': 'N/A' }
};

// --- Helper Function: Create a Unique ID (Copied from your original file) ---
function createUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// --- Helper Function: Calculate Automated Risk (Copied from your original file) ---
function calculateAutomatedRisk(speciesData, likelihoodInput, flockingInput) {
    // ... (All your original logic is identical) ...
    if (speciesData.status === 'Missing') {
        return {
            id: createUniqueId(),
            species_common: speciesData.name, 
            species_scientific: "N/A",
            mode: 'Automated',
            severity: 'N/A',
            likelihood: 'N/A',
            riskLevel: 'N/A',
            status: 'Missing',
            justification: "Species not found in internal database. Please assess manually or check spelling.",
            timestamp: new Date().toISOString()
        };
    }

    const { massValue, massText, guild, name, source, commonName } = speciesData;
    const flockValue = flockValueMap[flockingInput];
    const severityScore = massValue * flockValue;
    const severityCategory = mapScoreToSeverity(severityScore);
    
    const likelihoodCategory = icaoLikelihoodMap[likelihoodInput];
    
    const riskLevel = (severityCategory === 'N/A' || likelihoodCategory === 'N/A') ? 'N/A' : riskMatrix[severityCategory][likelihoodCategory];
    
    const justification = `ICAO-Compliant Rationale (Automated):
---------------------------------
1. SEVERITY: ${severityCategory}
   - Rationale: Based on the species' physical threat profile.
   - Data Source: ${source} (Species: ${name}, Guild: ${guild})
   - ICAO Mass Value (Table 3-4): ${massValue} (from ${massText})
   - ICAO Flock Value (Table 3-5): ${flockValue} (from user-reported "${flockingInput}")
   - Calculation: ${massValue} (Mass) x ${flockValue} (Flock) = ${severityScore}
   - Final (Table 3-6): A score of ${severityScore} maps to a "${severityCategory}" Severity.

2. LIKELIHOOD: ${likelihoodCategory}
   - Rationale (Table 3-1): User-reported presence of "${likelihoodInput}" maps to a "${likelihoodCategory}" Likelihood.

3. FINAL RISK (Table 3-7): ${riskLevel}
   - Rationale: Plotting Severity (${severityCategory}) vs. Likelihood (${likelihoodCategory}) on the ICAO matrix results in a "${riskLevel}" risk.`;

    return {
        id: createUniqueId(),
        species_common: commonName ? commonName.split('|')[0] : 'N/A',
        species_scientific: name,
        mode: 'Automated',
        severity: severityCategory,
        likelihood: likelihoodCategory,
        riskLevel: riskLevel,
        status: source,
        justification: justification,
        timestamp: new Date().toISOString()
    };
}

// --- Helper Function: Calculate Manual Risk (Copied from your original file) ---
function calculateManualRisk(speciesName, severityCategory, likelihoodCategory) {
    const riskLevel = riskMatrix[severityCategory][likelihoodCategory];
    
    const justification = `ICAO-Compliant Rationale (Manual):
---------------------------------
1. SEVERITY: ${severityCategory}
   - Rationale: User manually set Severity to "${severityCategory}".

2. LIKELIHOOD: ${likelihoodCategory}
   - Rationale: User manually set Likelihood to "${likelihoodCategory}".

3. FINAL RISK (Table 3-7): ${riskLevel}
   - Rationale: Plotting Severity (${severityCategory}) vs. Likelihood (${likelihoodCategory}) on the ICAO matrix results in a "${riskLevel}" risk.`;
    
    return {
        id: createUniqueId(),
        species_common: speciesName,
        species_scientific: "N/A (Manual)",
        mode: 'Manual',
        severity: severityCategory,
      _likelihood: likelihoodCategory,
        riskLevel: riskLevel,
        status: 'Manual Assessment',
        justification: justification,
        timestamp: new Date().toISOString()
    };
}

// --- NEW Cloudflare Function Handler ---
// This replaces the "exports.handler" from Netlify

/**
 * Handles all requests (POST, OPTIONS)
 */
export async function onRequest(context) {
  // Handle preflight OPTIONS requests (for CORS)
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Handle POST requests
  if (context.request.method === 'POST') {
    try {
      const data = await context.request.json();
      let assessment;

      if (data.isAutoMode) {
        assessment = calculateAutomatedRisk(data.speciesData, data.autoLikelihoodInput, data.autoFlockingInput);
      } else {
        assessment = calculateManualRisk(data.speciesName, data.manualSeverityInput, data.manualLikelihoodInput);
      }

      // Send the final assessment back to the client
      return new Response(JSON.stringify(assessment), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Allow cross-origin requests
        }
      });

    } catch (error) {
      console.error("Function Error:", error); 
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // Handle other methods
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Allow': 'POST, OPTIONS'
    },
  });
}
