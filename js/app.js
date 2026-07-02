// 主应用入口
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-btn');
  const fileBtn = document.getElementById('file-btn');
  const fileInput = document.getElementById('file-input');

  // 初始化各控制器
  UIController.init();
  ChatController.init();
  FileDropController.init();

  // 初始化 Live2D
  Live2DController.init();

  // 启用输入
  input.disabled = false;
  sendBtn.disabled = false;
  fileBtn.disabled = false;

  // 发送消息
  const handleSend = () => {
    const text = input.value.trim();
    if ((text || ChatController.pendingFiles.length > 0) && !ChatController.isStreaming) {
      ChatController.sendMessage(text);
      input.value = '';
    }
  };

  sendBtn.addEventListener('click', handleSend);

  // 回车发送
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // 文件上传按钮
  fileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      ChatController.addFiles(e.target.files);
      e.target.value = ''; // 重置以支持重复选择同一文件
    }
  });

  // 清空对话
  clearBtn.addEventListener('click', () => {
    if (confirm('确定清空所有对话吗？')) {
      ChatController.clear();
    }
  });

  // 窗口大小变化时重新调整 Live2D
  window.addEventListener('resize', () => {
    if (Live2DController.isLoaded) {
      Live2DController.resize();
    }
  });

  // 自动聚焦输入框
  input.focus();

  // === 可拖拽分隔条 ===
  const splitter = document.getElementById('panel-splitter');
  const chatPanel = document.getElementById('chat-panel');
  const STORAGE_KEY = 'yingdao-chat-width';
  const MIN_W = 280, MAX_W = 600;

  // 读取上次保存的宽度
  const savedW = parseFloat(localStorage.getItem(STORAGE_KEY));
  if (savedW && savedW >= MIN_W && savedW <= MAX_W) {
    document.documentElement.style.setProperty('--chat-width', savedW + 'px');
  }

  let dragging = false;

  splitter.addEventListener('mousedown', (e) => {
    dragging = true;
    splitter.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = window.innerWidth - e.clientX;
    const clamped = Math.max(MIN_W, Math.min(MAX_W, w));
    document.documentElement.style.setProperty('--chat-width', clamped + 'px');
    if (Live2DController.isLoaded) Live2DController.resize();
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const cur = getComputedStyle(chatPanel).width;
    localStorage.setItem(STORAGE_KEY, cur);
  });

  // 触屏支持
  splitter.addEventListener('touchstart', (e) => {
    dragging = true;
    splitter.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const touch = e.touches[0];
    const w = window.innerWidth - touch.clientX;
    const clamped = Math.max(MIN_W, Math.min(MAX_W, w));
    document.documentElement.style.setProperty('--chat-width', clamped + 'px');
    if (Live2DController.isLoaded) Live2DController.resize();
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    splitter.classList.remove('dragging');
    const cur = getComputedStyle(chatPanel).width;
    localStorage.setItem(STORAGE_KEY, cur);
  });
});
