// Cloudflare Pages Functions - /api/chat 代理
// 将前端请求转发到实际的 AI API（OpenAI兼容格式）
// 环境变量：API_BASE_URL（AI API地址）、API_KEY（密钥）

export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { messages, stream = true } = body;

    // 从环境变量读取API配置
    const apiBaseUrl = env.API_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 转发到AI API（OpenAI兼容格式）
    const apiResponse = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || env.API_MODEL || 'gpt-4o-mini',
        messages,
        stream,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 2048,
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      return new Response(JSON.stringify({ error: `API error: ${apiResponse.status}`, detail: errText }), {
        status: apiResponse.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 流式响应直接透传
    if (stream && apiResponse.body) {
      return new Response(apiResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders,
        },
      });
    }

    // 非流式响应
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
