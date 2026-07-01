// 影刀智能体 - 文件上传代理
// POST /api/upload
// Body: FormData with 'file' field
// Response: { success, data: { url, filename, ... } }
export async function onRequest({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });

  try {
    const token = env.YINGDAO_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'YINGDAO_TOKEN not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    // 转发FormData到影刀上传接口
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    // 构建转发用的FormData
    const forwardFormData = new FormData();
    forwardFormData.append('file', file, file.name);

    const apiResponse = await fetch(
      'https://power-api.yingdao.com/oapi/power/v1/file/upload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: forwardFormData,
      }
    );

    const data = await apiResponse.json();

    return new Response(JSON.stringify(data), {
      status: apiResponse.status,
      headers: { 'Content-Type': 'application/json', ...cors },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }
}
