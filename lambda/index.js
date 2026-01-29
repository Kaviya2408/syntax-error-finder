export const handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Only POST allowed' })
    };
  }

  try {
    const { code } = JSON.parse(event.body);
    
    if (!code || code.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          errors: [{
            line: 0,
            msg: 'No code detected',
            desc: 'Please paste your source code before checking.'
          }]
        })
      };
    }

    let result = [];
    let lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line !== '' && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}')) {
        result.push({
          line: i + 1,
          msg: 'Missing semicolon',
          desc: 'You forgot to add a semicolon at the end of this statement. Many languages require semicolons to separate instructions.'
        });
      }
    }

    if (result.length === 0) {
      result.push({
        line: 0,
        msg: 'No syntax error found',
        desc: 'Your code passed basic syntax checks.'
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ errors: result })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};