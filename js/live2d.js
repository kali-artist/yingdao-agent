// Live2D 数字人控制
const Live2DController = {
  app: null,
  model: null,
  canvas: null,
  isLoaded: false,
  isSpeaking: false,
  speakTimer: null,
  blinkTimer: null,

  // 模型列表（多CDN备选，jsdelivr国内可能不稳定）
  modelUrls: [
    // Senko - jsdelivr Fastly
    'https://fastly.jsdelivr.net/gh/Eikanya/Live2d-model@master/Live2D/Senko_Normals/senko.model3.json',
    // Senko - jsdelivr gcore
    'https://gcore.jsdelivr.net/gh/Eikanya/Live2d-model@master/Live2D/Senko_Normals/senko.model3.json',
    // Senko - jsdelivr 默认
    'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model@master/Live2D/Senko_Normals/senko.model3.json',
    // Shizuku - 官方示例（更小更稳定）
    'https://fastly.jsdelivr.net/gh/guansss/pixi-live2d-display@master/test/assets/shizuku/shizuku.model3.json',
    'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display@master/test/assets/shizuku/shizuku.model3.json',
  ],

  async init() {
    this.canvas = document.getElementById('live2d-canvas');
    const wrapper = document.getElementById('live2d-wrapper');
    const rect = wrapper.getBoundingClientRect();

    // 初始化 PIXI Application
    this.app = new PIXI.Application({
      view: this.canvas,
      autoStart: true,
      backgroundAlpha: 0,
      width: rect.width,
      height: rect.height,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // 窗口大小变化
    window.addEventListener('resize', () => this.resize());

    // 加载模型
    await this.loadModel();
  },

  async loadModel() {
    const loading = document.getElementById('live2d-loading');
    
    for (const url of this.modelUrls) {
      try {
        console.log('尝试加载模型:', url);
        // 8秒超时，防止CDN卡住
        const model = await Promise.race([
          PIXI.live2d.Live2DModel.from(url, { autoInteract: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ]);
        
        if (!model) continue;
        this.model = model;
        
        this.app.stage.addChild(this.model);
        this.isLoaded = true;
        loading.style.display = 'none';
        
        // 调整大小和位置
        this.resize();
        
        // 启动自动眨眼（如果模型不自带）
        this.startAutoBlink();
        
        // 启动呼吸
        this.startBreathing();
        
        console.log('Live2D模型加载成功');
        return;
      } catch (e) {
        console.warn('模型加载失败:', url, e.message || e);
      }
    }
    
    // 所有模型都失败
    loading.innerHTML = '<p style="color:var(--text-muted)">模型加载失败<br>聊天功能仍可使用</p>';
    console.error('所有Live2D模型加载失败');
  },

  resize() {
    if (!this.app || !this.canvas) return;
    const wrapper = document.getElementById('live2d-wrapper');
    const rect = wrapper.getBoundingClientRect();
    
    this.app.renderer.resize(rect.width, rect.height);
    
    if (this.model) {
      // 缩放模型适配画布
      const scale = Math.min(
        rect.width / this.model.width,
        rect.height / this.model.height
      ) * 0.9;
      this.model.scale.set(scale);
      
      // 居中
      this.model.x = (rect.width - this.model.width) / 2;
      this.model.y = (rect.height - this.model.height) / 2;
    }
  },

  // === 眼球追踪 ===
  focus(x, y) {
    if (!this.model) return;
    this.model.focus(x, y);
  },

  // === 自动眨眼 ===
  startAutoBlink() {
    if (this.blinkTimer) clearInterval(this.blinkTimer);
    
    const blink = () => {
      if (!this.model || !this.model.internalModel) return;
      const coreModel = this.model.internalModel.coreModel;
      
      // 闭眼
      coreModel.setParameterValueById('ParamEyeLOpen', 0);
      coreModel.setParameterValueById('ParamEyeROpen', 0);
      
      // 100ms后睁眼
      setTimeout(() => {
        if (!this.model) return;
        coreModel.setParameterValueById('ParamEyeLOpen', 1);
        coreModel.setParameterValueById('ParamEyeROpen', 1);
      }, 100);
    };
    
    // 随机间隔眨眼
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 3000;
      this.blinkTimer = setTimeout(() => {
        blink();
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
  },

  // === 呼吸效果 ===
  startBreathing() {
    let time = 0;
    this.app.ticker.add((delta) => {
      if (!this.model || !this.model.internalModel) return;
      time += delta * 0.02;
      const breathe = Math.sin(time) * 0.5 + 0.5;
      const coreModel = this.model.internalModel.coreModel;
      
      // 呼吸参数
      try {
        coreModel.setParameterValueById('ParamBreath', breathe);
      } catch(e) {}
      
      // 身体微动
      try {
        coreModel.setParameterValueById('ParamBodyAngleX', Math.sin(time * 0.3) * 3);
        coreModel.setParameterValueById('ParamBodyAngleY', Math.sin(time * 0.2) * 2);
      } catch(e) {}
    });
  },

  // === 嘴型同步（说话动画）===
  startSpeaking() {
    if (!this.model || !this.model.internalModel) return;
    this.isSpeaking = true;
    
    const animateMouth = () => {
      if (!this.isSpeaking || !this.model || !this.model.internalModel) return;
      const coreModel = this.model.internalModel.coreModel;
      
      // 随机嘴型开合
      const openAmount = Math.random() * 0.8 + 0.2;
      try {
        coreModel.setParameterValueById('ParamMouthOpenY', openAmount);
      } catch(e) {}
      
      // 80ms后下一帧
      this.speakTimer = setTimeout(animateMouth, 80);
    };
    animateMouth();
  },

  stopSpeaking() {
    this.isSpeaking = false;
    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }
    // 闭嘴
    if (this.model && this.model.internalModel) {
      try {
        this.model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0);
      } catch(e) {}
    }
  },

  // === 表情 ===
  expression(name) {
    if (!this.model) return;
    try {
      this.model.expression(name);
    } catch(e) {
      console.warn('表情设置失败:', name, e);
    }
  },

  // === 动作 ===
  motion(group, index) {
    if (!this.model) return;
    try {
      this.model.motion(group || 'Idle', index ?? 0);
    } catch(e) {
      console.warn('动作设置失败:', e);
    }
  }
};
