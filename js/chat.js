// 聊天逻辑 - 流式输出
const ChatController = {
  messages: [],
  isStreaming: false,
  abortController: null,

  // 本地设置
  settings: {
    apiUrl: '',
    apiKey: '',
    systemPrompt: '你是一个友好的AI数字人助手，请用简洁自然的语言回答问题。',
  },

  init() {
    // 加载本地设置
    const saved = localStorage.getItem('chat-settings');
    if (saved) {
      try { this.settings = { ...this.settings, ...JSON.parse(saved) }; } catch(e) {}
    }
  },

  // 发送消息
  async send(text) {
    if (!text.trim() || this.isStreaming) return;

    // 添加用户消息
    this.messages.push({ role: 'user', content: text });
    this.appendMessage('user', text);

    // 创建助手消息占位
    const msgEl = this.appendMessage('assistant', '');
    const contentEl = msgEl.querySelector('.message-content');
    contentEl.classList.add('stream-cursor');

    this.isStreaming = true;
    this.updateStatus('thinking');
    Live2DController.startSpeaking();

    // 显示typing indicator
    document.getElementById('typing-indicator').style.display = 'flex';

    try {
      // 构建请求
      const requestBody = {
        message: text,
        messages: this.messages.slice(-10), // 最近10条上下文
        systemPrompt: this.settings.systemPrompt,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 隐藏typing indicator
      document.getElementById('typing-indicator').style.display = 'none';

      // 流式读取
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.content || parsed.text || parsed.delta || '';
              if (chunk) {
                if (firstChunk) {
                  firstChunk = false;
                  this.updateStatus('speaking');
                }
                fullText += chunk;
                contentEl.textContent = fullText;
                this.scrollToBottom();
              }
            } catch(e) {
              // 非JSON，直接当文本
              if (data && data !== '[DONE]') {
                fullText += data;
                contentEl.textContent = fullText;
                this.scrollToBottom();
              }
            }
          }
        }
      }

      // 完成
      contentEl.classList.remove('stream-cursor');
      
      if (!fullText) {
        contentEl.textContent = '（收到空回复）';
      }

      this.messages.push({ role: 'assistant', content: fullText });
      this.updateStatus('ready');

    } catch (e) {
      if (e.name === 'AbortError') {
        contentEl.classList.remove('stream-cursor');
        this.updateStatus('ready');
      } else {
        console.error('Chat error:', e);
        contentEl.classList.remove('stream-cursor');
        contentEl.textContent = '抱歉，出现了错误：' + e.message;
        contentEl.style.color = 'var(--danger)';
        this.updateStatus('error');
      }
    } finally {
      document.getElementById('typing-indicator').style.display = 'none';
      this.isStreaming = false;
      Live2DController.stopSpeaking();
      AppController.updateInputState();
    }
  },

  // 添加消息到UI
  appendMessage(role, content) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message ' + role;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    div.appendChild(contentDiv);
    container.appendChild(div);
    this.scrollToBottom();
    return div;
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
  },

  updateStatus(status) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    
    dot.className = 'status-dot';
    switch(status) {
      case 'thinking':
        dot.classList.add('thinking');
        text.textContent = '思考中...';
        break;
      case 'speaking':
        dot.classList.add('thinking');
        text.textContent = '回复中...';
        break;
      case 'error':
        dot.classList.add('error');
        text.textContent = '错误';
        break;
      default:
        text.textContent = '就绪';
    }
  },

  clear() {
    this.messages = [];
    const container = document.getElementById('chat-messages');
    container.innerHTML = `
      <div class="message assistant">
        <div class="message-content">对话已清空，开始新的对话吧！😊</div>
      </div>
    `;
  },

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('chat-settings', JSON.stringify(this.settings));
  }
};
