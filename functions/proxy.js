

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const incomingUrl = new URL(request.url);

  const rawQuery = incomingUrl.href.split('?')[1] || '';
  const urlMatch = rawQuery.match(/(?:^|&)url=(.*)/s); 
  if (!urlMatch || !urlMatch[1]) {
    return new Response(JSON.stringify({
      error: "Missing target URL. Example usage: /proxy?url=https%3A%2F%2Fexample.com%2Fpath%3Fa%3D1"
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let targetRaw = urlMatch[1];
  let target;
  try {
    target = decodeURIComponent(targetRaw);
  } catch (e) {
    target = targetRaw;
  }

  if (target.includes('/proxy')) {
    return new Response(JSON.stringify({ error: 'Invalid nested proxy path detected.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid target URL.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol) || isLocalAddress(targetUrl.hostname)) {
    return new Response(JSON.stringify({ error: 'Blocked URL (unsupported protocol or local address).' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const redirectCount = parseInt(targetUrl.searchParams.get('redirectCount') || '0', 10);
  if (redirectCount > 5) {
    return new Response(JSON.stringify({ error: 'Too many redirects' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const fetchHeaders = new Headers(request.headers);
  fetchHeaders.set('accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
  fetchHeaders.set('accept-encoding', 'identity');
  fetchHeaders.delete('host');
  fetchHeaders.set('referer', targetUrl.origin);
  if (!fetchHeaders.has('user-agent')) {
    fetchHeaders.set('user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
    );
  }

  const fetchInit = {
    method: request.method,
    headers: fetchHeaders,
    redirect: 'manual'
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    fetchInit.body = request.body;
    fetchInit.duplex = 'half';
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(targetUrl.toString(), fetchInit);

    if (upstreamRes.status >= 300 && upstreamRes.status < 400 && upstreamRes.headers.has('location')) {
      const resolved = new URL(upstreamRes.headers.get('location'), targetUrl);
      resolved.searchParams.set('redirectCount', (redirectCount + 1).toString());
      const redirectTo = `${incomingUrl.origin}/proxy?url=${encodeURIComponent(resolved.toString())}`;
      return Response.redirect(redirectTo, upstreamRes.status);
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream fetch error: ' + (e && e.message ? e.message : String(e)) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const filteredHeaders = filterResponseHeaders(upstreamRes.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    filteredHeaders.set(k, v);
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: filteredHeaders
  });
}

function filterResponseHeaders(h) {
  const headers = new Headers();
  for (const [k, v] of h.entries()) {
    const kLow = k.toLowerCase();
    if (['content-security-policy', 'x-frame-options', 'strict-transport-security', 'clear-site-data', 'content-encoding', 'referer'].includes(kLow)) {
      continue;
    }
    headers.set(k, v);
  }
  return headers;
}

function isLocalAddress(hostname) {
  if (!hostname) return false;
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i.test(hostname)) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) return true;
  return false;
}
