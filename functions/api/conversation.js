// 影刀智能体 - 创建会话
// POST /api/conversation  body: { title?: string }
export async function onRequestPost({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const token = env.YINGDAO_TOKEN;
    const agentId = env.YINGDAO_AGENT_ID || 'd6d1fd11-82d7-466b-8fde-586744e4ca71';
    if (!token) return jsonResp({ error: 'YINGDAO_TOKEN not configured' }, 500, cors);

    const body = await request.json().catch(() => ({}));
    const resp = await fetch(
      `https://power-api.yingdao.com/oapi/agent/v1/agents/${agentId}/conversations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: body.title || 'Web Chat' }),
      }
    );
    const data = await resp.json();
    return jsonResp(data, resp.status, cors);
  } catch (e) {
    return jsonResp({ error: e.message }, 500, cors);
  }
}

function jsonResp(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
