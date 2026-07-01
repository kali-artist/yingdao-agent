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
});
