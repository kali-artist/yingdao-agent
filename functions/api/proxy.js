// 文件下载代理 - 解决影刀返回文件URL的跨域问题
// GET /api/proxy?url=xxx
export async function onRequest({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'url parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 只允许影刀域名
    const target = new URL(targetUrl);
    if (!target.hostname.endsWith('yingdao.com') && !target.hostname.endsWith('power-api.yingdao.com')) {
      return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const apiResponse = await fetch(targetUrl, {
      headers: {
        'Authorization': `Bearer ${env.YINGDAO_TOKEN || ''}`,
      },
    });

    const contentType = apiResponse.headers.get('Content-Type') || 'application/octet-stream';
    const contentDisposition = apiResponse.headers.get('Content-Disposition') || '';
    const data = await apiResponse.arrayBuffer();

    return new Response(data, {
      status: apiResponse.status,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
