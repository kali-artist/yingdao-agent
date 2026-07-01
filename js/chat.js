// 聊天逻辑 - 影刀智能体API + 双向文件交互
const ChatController = {
  messages: [],
  isStreaming: false,
  conversationUuid: null,
  pendingFiles: [], // 待上传文件列表

  // 文件大小限制（20MB）
  MAX_FILE_SIZE: 20 * 1024 * 1024,

  // 支持的文件类型
  ACCEPTED_TYPES: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword', 'application/vnd.ms-excel',
    'application/zip', 'application/x-zip-compressed',
    'application/json', 'application/xml',
    'audio/mpeg', 'audio/wav', 'video/mp4',
  ],

  init() {
    this.messages = [{
      role: 'assistant',
      content: '你好！我是你的AI数字人助手，有什么可以帮你的吗？😊'
    }];
  },

  // === 文件处理 ===
  addFiles(fileList) {
    for (const file of fileList) {
      if (file.size > this.MAX_FILE_SIZE) {
        UIController.showToast(`文件 "${file.name}" 超过20MB限制`);
        continue;
      }
      this.pendingFiles.push(file);
    }
    UIController.renderFilePreview();
  },

  removeFile(index) {
    this.pendingFiles.splice(index, 1);
    UIController.renderFilePreview();
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    const data = await response.json();
    // 影刀API返回格式: { code: 0, data: { url, filename, ... } }
    if (data.code !== 0 && data.code !== undefined) {
      throw new Error(data.msg || '上传失败');
    }

    return {
      url: data.data?.url || data.url || '',
      filename: data.data?.filename || data.data?.name || file.name,
    };
  },

  // === 发送消息 ===
  async sendMessage(text) {
    if (this.isStreaming) return;
    if (!text.trim() && this.pendingFiles.length === 0) return;

    // 如果还没有会话，先创建
    if (!this.conversationUuid) {
      UIController.setStatus('connecting');
      const ok = await this.createConversation();
      if (!ok) return;
    }

    // 上传待发文件
    let attachments = [];
    if (this.pendingFiles.length > 0) {
      UIController.setStatus('uploading');
      for (const file of this.pendingFiles) {
        try {
          const result = await this.uploadFile(file);
          attachments.push(result);
        } catch (e) {
          UIController.showToast(`文件 "${file.name}" 上传失败: ${e.message}`);
        }
      }
      this.pendingFiles = [];
      UIController.renderFilePreview();
    }

    // 添加用户消息（含文件展示）
    const userMsg = { role: 'user', content: text, attachments };
    this.messages.push(userMsg);
    UIController.addMessage('user', text, attachments);

    // 创建助手消息占位
    const msgEl = UIController.addMessage('assistant', '');
    const contentEl = msgEl.querySelector('.message-content');
    contentEl.classList.add('stream-cursor');

    this.isStreaming = true;
    UIController.setStatus('thinking');
    UIController.setTyping(true);
    UIController.setInputEnabled(false);
    Live2DController.startSpeaking();

    let fullResponse = '';

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationUuid: this.conversationUuid,
          content: text,
          attachments,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API错误 (${response.status}): ${errText}`);
      }

      // 处理流式响应
      fullResponse = await this.handleStream(response.body, contentEl);

      contentEl.classList.remove('stream-cursor');
      
      // 解析回复中的文件信息
      const parsed = this.parseResponse(fullResponse);
      this.messages.push({ role: 'assistant', content: parsed.text, attachments: parsed.attachments });

      // 如果有文件，追加渲染
      if (parsed.attachments.length > 0) {
        UIController.appendAttachments(msgEl, parsed.attachments);
      }

      UIController.setStatus('online');

    } catch (error) {
      console.error('聊天错误:', error);
      contentEl.classList.remove('stream-cursor');
      contentEl.textContent = '抱歉，出错了：' + error.message;
      contentEl.style.color = 'var(--danger)';
      UIController.setStatus('error');
    } finally {
      this.isStreaming = false;
      UIController.setTyping(false);
      UIController.setInputEnabled(true);
      Live2DController.stopSpeaking();
    }
  },

  // 创建会话
  async createConversation() {
    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Web Chat' }),
      });

      if (!response.ok) throw new Error(`创建会话失败: ${response.status}`);

      const data = await response.json();
      // 影刀返回: { code: 0, data: { conversationUuid: "xxx" } }
      this.conversationUuid = data.data?.conversationUuid || data.conversationUuid;

      if (!this.conversationUuid) {
        throw new Error('未获取到会话ID');
      }

      return true;
    } catch (error) {
      UIController.showToast('创建会话失败: ' + error.message);
      UIController.setStatus('error');
      return false;
    }
  },

  // 处理SSE流
  async handleStream(body, contentEl) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 尝试按行处理（SSE格式）
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // SSE: data: xxx
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          fullText += this.extractContent(data) + '\n';
        } else if (trimmed.startsWith('event:')) {
          continue; // 跳过event行
        } else {
          // 非SSE格式，直接当文本
          fullText += this.extractContent(trimmed);
        }

        contentEl.innerHTML = this.formatText(fullText);
        UIController.scrollToBottom();
      }
    }

    // 处理buffer中剩余数据
    if (buffer.trim()) {
      fullText += this.extractContent(buffer.trim());
      contentEl.innerHTML = this.formatText(fullText);
      UIController.scrollToBottom();
    }

    return fullText.trim();
  },

  // 从SSE data中提取文本内容
  extractContent(data) {
    // 尝试JSON解析
    try {
      const parsed = JSON.parse(data);
      // 兼容多种格式
      if (parsed.content) return parsed.content;
      if (parsed.text) return parsed.text;
      if (parsed.delta) return parsed.delta;
      if (parsed.data?.content) return parsed.data.content;
      if (parsed.data?.text) return parsed.data.text;
      if (parsed.message) return parsed.message;
      // 影刀可能用的格式
      if (parsed.answer) return parsed.answer;
      if (parsed.reply) return parsed.reply;
      if (parsed.output) return parsed.output;
      // chunk格式
      if (parsed.choices?.[0]?.delta?.content) return parsed.choices[0].delta.content;
      return '';
    } catch (e) {
      // 非JSON，直接返回文本
      return data;
    }
  },

  // 解析回复（提取文本和文件链接）
  parseResponse(text) {
    const attachments = [];
    let cleanText = text;

    // 匹配Markdown链接 [text](url)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    const seenUrls = new Set();

    while ((match = linkRegex.exec(text)) !== null) {
      const linkText = match[1];
      const url = match[2];

      // 判断是否是文件链接（常见文件扩展名）
      const fileExt = url.match(/\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|csv|txt|json|xml|png|jpg|jpeg|gif|webp|mp4|mp3|wav|m4a|bmp|svg|md)(\?|$)/i);

      if (fileExt && !seenUrls.has(url)) {
        seenUrls.add(url);
        attachments.push({
          url: url,
          filename: linkText,
          type: fileExt[1].toLowerCase(),
        });
      }
    }

    // 匹配裸URL（非Markdown格式的文件链接）
    const bareUrlRegex = /(https?:\/\/[^\s<>"]+\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z|csv|txt|json|xml|png|jpg|jpeg|gif|webp|mp4|mp3|wav|m4a|bmp|svg|md)(?:\?[^\s<>"]*)?)/gi;

    while ((match = bareUrlRegex.exec(text)) !== null) {
      const url = match[1];
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        const ext = url.match(/\.(\w+)(?:\?|$)/);
        attachments.push({
          url: url,
          filename: url.split('/').pop().split('?')[0],
          type: ext ? ext[1].toLowerCase() : 'file',
        });
      }
    }

    return { text: cleanText, attachments };
  },

  // 文本格式化
  formatText(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="msg-link">$1</a>')
      .replace(/\n/g, '<br>');
  },

  clear() {
    this.messages = [{
      role: 'assistant',
      content: '你好！我是你的AI数字人助手，有什么可以帮你的吗？😊'
    }];
    this.conversationUuid = null;
    this.pendingFiles = [];
    document.getElementById('chat-messages').innerHTML = '';
    UIController.addMessage('assistant', this.messages[0].content);
    UIController.renderFilePreview();
  }
};

// === UI 控制 ===
const UIController = {
  init() {
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    this.fileBtn = document.getElementById('file-btn');
    this.fileInput = document.getElementById('file-input');
    this.filePreviewArea = document.getElementById('file-preview-area');
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.typingIndicator = document.getElementById('typing-indicator');
  },

  addMessage(role, text, attachments) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.innerHTML = text ? ChatController.formatText(text) : '';
    msgEl.appendChild(contentEl);

    // 用户消息附带文件展示
    if (role === 'user' && attachments && attachments.length > 0) {
      this.appendAttachments(msgEl, attachments);
    }

    this.messagesEl.appendChild(msgEl);
    this.scrollToBottom();
    return msgEl;
  },

  // 追加文件附件展示
  appendAttachments(msgEl, attachments) {
    if (!attachments || attachments.length === 0) return;

    const attContainer = document.createElement('div');
    attContainer.className = 'message-attachments';

    for (const att of attachments) {
      const attEl = document.createElement('div');
      attEl.className = 'attachment-item';

      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(att.type);
      const downloadUrl = att.url.startsWith('http') ? att.url : `/api/proxy?url=${encodeURIComponent(att.url)}`;

      if (isImage) {
        // 图片预览
        attEl.classList.add('attachment-image');
        attEl.innerHTML = `
          <a href="${downloadUrl}" target="_blank">
            <img src="${downloadUrl}" alt="${att.filename}" loading="lazy">
          </a>
          <span class="attachment-name">${att.filename}</span>
        `;
      } else {
        // 文件图标 + 下载链接
        const icon = this.getFileIcon(att.type);
        attEl.innerHTML = `
          <a href="${downloadUrl}" target="_blank" class="attachment-download">
            <span class="attachment-icon">${icon}</span>
            <span class="attachment-name">${att.filename}</span>
            <span class="attachment-action">下载</span>
          </a>
        `;
      }

      attContainer.appendChild(attEl);
    }

    msgEl.appendChild(attContainer);
    this.scrollToBottom();
  },

  getFileIcon(ext) {
    const icons = {
      pdf: '📄', doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊', csv: '📊',
      ppt: '📽️', pptx: '📽️',
      zip: '🗜️', rar: '🗜️', '7z': '🗜️',
      txt: '📃', json: '🔧', xml: '🔧', md: '📃',
      mp4: '🎬', mp3: '🎵', wav: '🎵', m4a: '🎵',
    };
    return icons[ext] || '📎';
  },

  renderFilePreview() {
    const area = this.filePreviewArea;
    area.innerHTML = '';

    if (ChatController.pendingFiles.length === 0) {
      area.style.display = 'none';
      return;
    }

    area.style.display = 'flex';
    ChatController.pendingFiles.forEach((file, index) => {
      const preview = document.createElement('div');
      preview.className = 'file-preview-item';

      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'file-preview-thumb';
        preview.appendChild(img);
      } else {
        const icon = document.createElement('span');
        icon.className = 'file-preview-icon';
        icon.textContent = this.getFileIcon(file.name.split('.').pop().toLowerCase());
        preview.appendChild(icon);
      }

      const name = document.createElement('span');
      name.className = 'file-preview-name';
      name.textContent = file.name;
      preview.appendChild(name);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'file-preview-remove';
      removeBtn.textContent = '✕';
      removeBtn.onclick = () => ChatController.removeFile(index);
      preview.appendChild(removeBtn);

      area.appendChild(preview);
    });
  },

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  },

  setStatus(status) {
    const statuses = {
      online: { text: '就绪', class: 'online' },
      connecting: { text: '连接中...', class: 'connecting' },
      uploading: { text: '上传文件中...', class: 'uploading' },
      thinking: { text: '思考中...', class: 'thinking' },
      error: { text: '错误', class: 'error' },
    };
    const s = statuses[status] || statuses.online;
    this.statusText.textContent = s.text;
    this.statusDot.className = `status-dot ${s.class}`;
  },

  setTyping(show) {
    this.typingIndicator.style.display = show ? 'flex' : 'none';
  },

  setInputEnabled(enabled) {
    this.inputEl.disabled = !enabled;
    this.sendBtn.disabled = !enabled;
    this.fileBtn.disabled = !enabled;
    if (enabled) this.inputEl.focus();
  },

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};

// === 文件拖拽支持 ===
const FileDropController = {
  init() {
    const panel = document.getElementById('chat-panel');
    
    panel.addEventListener('dragover', (e) => {
      e.preventDefault();
      panel.classList.add('drag-over');
    });

    panel.addEventListener('dragleave', (e) => {
      if (!panel.contains(e.relatedTarget)) {
        panel.classList.remove('drag-over');
      }
    });

    panel.addEventListener('drop', (e) => {
      e.preventDefault();
      panel.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        ChatController.addFiles(e.dataTransfer.files);
      }
    });
  }
};
