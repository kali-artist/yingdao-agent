// 主应用入口
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-btn');

  // 初始化 Live2D
  Live2DController.init();

  // 启用输入
  input.disabled = false;
  sendBtn.disabled = false;

  // 发送消息
  const handleSend = () => {
    const text = input.value.trim();
    if (text && !ChatController.isStreaming) {
      ChatController.send(text);
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
