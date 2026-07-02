/**
 * ProdAbroad — Netlify Function API proxy
 *
 * Same job as the Cloudflare Worker we tried earlier, just living inside
 * your Netlify site instead: the browser calls THIS function (same domain,
 * so no CORS issue at all), the function adds your Anthropic API key
 * server-side and forwards the request to Anthropic, then relays the
 * response back to the browser.
 *
 * SETUP:
 * 1. This file must live at netlify/functions/proxy.js in your site's repo.
 * 2. netlify.toml (in the site root) must point Netlify at that folder.
 * 3. In the Netlify dashboard: Site configuration > Environment variables >
 *    Add a variable named ANTHROPIC_API_KEY with your new Anthropic key as
 *    the value. Do this directly in the dashboard — never put the key in
 *    this source file.
 * 4. Once deployed, the browser calls it at: /.netlify/functions/proxy
 *    (a relative path — same site, same domain, no CORS problem).
 */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server misconfigured: ANTHROPIC_API_KEY environment variable not set in Netlify.',
      }),
    };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(parsedBody),
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Upstream request to Anthropic failed', message: String(err) }),
    };
  }
};
