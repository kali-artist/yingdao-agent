// 背景动态效果 v2 — 粒子+扫描线+鼠标光晕
(function(){
  'use strict';

  const canvas=document.getElementById('bg-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let particles=[],W,H,mouseX=-1000,mouseY=-1000;

  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
  }
  resize();
  window.addEventListener('resize',resize);

  // 鼠标位置追踪
  window.addEventListener('mousemove',function(e){
    mouseX=e.clientX;
    mouseY=e.clientY;
    // 更新鼠标光晕
    const glow=document.getElementById('cursor-glow');
    if(glow){
      glow.style.left=e.clientX+'px';
      glow.style.top=e.clientY+'px';
    }
  });
  window.addEventListener('mouseleave',function(){
    mouseX=-1000;mouseY=-1000;
    const glow=document.getElementById('cursor-glow');
    if(glow)glow.style.opacity='0';
  });
  window.addEventListener('mouseenter',function(){
    const glow=document.getElementById('cursor-glow');
    if(glow)glow.style.opacity='1';
  });

  // 粒子系统 — 升级版
  const count=Math.min(90,Math.floor(W*H/18000));
  for(let i=0;i<count;i++){
    particles.push({
      x:Math.random()*W,
      y:Math.random()*H,
      vx:(Math.random()-0.5)*0.3,
      vy:(Math.random()-0.5)*0.3,
      r:Math.random()*2.5+1,
      alpha:Math.random()*0.4+0.4,
      hue:Math.random()>0.6?'cyan':'purple',
      pulse:Math.random()*Math.PI*2
    });
  }

  // 扫描线Y坐标
  let scanY=0;
  let scanSpeed=1.5;

  function draw(){
    ctx.clearRect(0,0,W,H);

    // === 粒子连线 ===
    for(let i=0;i<particles.length;i++){
      const p1=particles[i];
      for(let j=i+1;j<particles.length;j++){
        const p2=particles[j];
        const dx=p1.x-p2.x,dy=p1.y-p2.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<120){
          const opacity=0.15*(1-dist/120);
          // 混合颜色
          if(p1.hue==='cyan'||p2.hue==='cyan'){
            ctx.strokeStyle='rgba(0,229,255,'+opacity+')';
          }else{
            ctx.strokeStyle='rgba(168,85,247,'+opacity+')';
          }
          ctx.lineWidth=0.6;
          ctx.beginPath();
          ctx.moveTo(p1.x,p1.y);
          ctx.lineTo(p2.x,p2.y);
          ctx.stroke();
        }
      }
    }

    // === 鼠标连线 ===
    for(const p of particles){
      const dx=p.x-mouseX,dy=p.y-mouseY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<180){
        const opacity=0.35*(1-dist/180);
        ctx.strokeStyle='rgba(0,229,255,'+opacity+')';
        ctx.lineWidth=0.8;
        ctx.beginPath();
        ctx.moveTo(p.x,p.y);
        ctx.lineTo(mouseX,mouseY);
        ctx.stroke();
      }
    }

    // === 粒子绘制 ===
    for(const p of particles){
      p.x+=p.vx;
      p.y+=p.vy;
      p.pulse+=0.02;

      // 鼠标排斥效果
      const dx=p.x-mouseX,dy=p.y-mouseY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<100&&dist>0){
        const force=(1-dist/100)*0.5;
        p.x+=(dx/dist)*force;
        p.y+=(dy/dist)*force;
      }

      // 边界环绕
      if(p.x<-10)p.x=W+10;
      if(p.x>W+10)p.x=-10;
      if(p.y<-10)p.y=H+10;
      if(p.y>H+10)p.y=-10;

      // 脉冲透明度
      const pulseAlpha=p.alpha*(0.7+0.3*Math.sin(p.pulse));

      // 发光粒子
      const color=p.hue==='cyan'?'0,229,255':'168,85,247';
      const glowR=p.r*4;

      // 外发光
      const gradient=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glowR);
      gradient.addColorStop(0,'rgba('+color+','+pulseAlpha+')');
      gradient.addColorStop(0.5,'rgba('+color+','+(pulseAlpha*0.3)+')');
      gradient.addColorStop(1,'rgba('+color+',0)');
      ctx.fillStyle=gradient;
      ctx.beginPath();
      ctx.arc(p.x,p.y,glowR,0,Math.PI*2);
      ctx.fill();

      // 核心
      ctx.fillStyle='rgba('+color+','+Math.min(1,pulseAlpha*1.5)+')';
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }

    // === 扫描线效果 ===
    scanY+=scanSpeed;
    if(scanY>H+50)scanY=-50;

    // 扫描线主体
    const scanGradient=ctx.createLinearGradient(0,scanY-30,0,scanY+30);
    scanGradient.addColorStop(0,'rgba(0,229,255,0)');
    scanGradient.addColorStop(0.45,'rgba(0,229,255,0.05)');
    scanGradient.addColorStop(0.5,'rgba(0,229,255,0.12)');
    scanGradient.addColorStop(0.55,'rgba(0,229,255,0.05)');
    scanGradient.addColorStop(1,'rgba(0,229,255,0)');
    ctx.fillStyle=scanGradient;
    ctx.fillRect(0,scanY-30,W,60);

    // 扫描线亮线
    ctx.strokeStyle='rgba(0,229,255,0.15)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(0,scanY);
    ctx.lineTo(W,scanY);
    ctx.stroke();

    requestAnimationFrame(draw);
  }

  draw();

  // === 数据流文字动画 ===
  function initDataStreams(){
    const streams=document.querySelectorAll('.data-stream');
    const chars='01ABCDEF<>{}[]/\\|+-*=#$@%';
    streams.forEach(function(stream,idx){
      let interval=setInterval(function(){
        let text='';
        for(let i=0;i<12;i++){
          text+=chars[Math.floor(Math.random()*chars.length)];
        }
        stream.textContent=text;
      },200+idx*100);
    });
  }
  initDataStreams();

  // === 背景视差 ===
  const bgImage=document.querySelector('.bg-image');
  if(bgImage){
    window.addEventListener('mousemove',function(e){
      const x=(e.clientX/W-0.5)*15;
      const y=(e.clientY/H-0.5)*15;
      bgImage.style.transform='scale(1.08) translate('+x+'px,'+y+'px)';
    });
  }

})();