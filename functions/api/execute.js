// 影刀智能体 - 流式执行代理
// POST /api/execute
// Body: { conversationUuid, content, attachments: [{url, filename}] }
// Response: SSE stream from 影刀 API (transparently forwarded)
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = env.YINGDAO_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'YINGDAO_TOKEN not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await request.json();
    const { conversationUuid, content, attachments } = body;

    if (!conversationUuid) {
      return new Response(JSON.stringify({ error: 'conversationUuid is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const payload = {
      content: content || '',
      attachments: attachments || [],
    };

    const apiResponse = await fetch(
      `https://power-api.yingdao.com/oapi/agent/v1/conversations/${conversationUuid}/execute/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      return new Response(JSON.stringify({ error: `API error: ${apiResponse.status}`, detail: errText }), {
        status: apiResponse.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (apiResponse.body) {
      return new Response(apiResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders,
        },
      });
    }

    const data = await apiResponse.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
