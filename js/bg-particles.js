// 背景粒子效果
(function(){
  const canvas=document.getElementById('bg-canvas');
  const ctx=canvas.getContext('2d');
  let particles=[],W,H;
  
  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
  }
  resize();
  window.addEventListener('resize',resize);
  
  // 创建粒子
  const count=Math.min(60,Math.floor(W*H/25000));
  for(let i=0;i<count;i++){
    particles.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3,
      r:Math.random()*2+0.5,
      color:Math.random()>0.5?'124,108,255':'0,224,255',
      alpha:Math.random()*0.4+0.1
    });
  }
  
  function draw(){
    ctx.clearRect(0,0,W,H);
    // 绘制连线
    for(let i=0;i<particles.length;i++){
      const p1=particles[i];
      for(let j=i+1;j<particles.length;j++){
        const p2=particles[j];
        const dx=p1.x-p2.x,dy=p1.y-p2.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<120){
          ctx.strokeStyle='rgba(124,108,255,'+(0.08*(1-dist/120))+')';
          ctx.lineWidth=0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x,p1.y);
          ctx.lineTo(p2.x,p2.y);
          ctx.stroke();
        }
      }
    }
    // 绘制粒子
    for(const p of particles){
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.fillStyle='rgba('+p.color+','+p.alpha+')';
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();