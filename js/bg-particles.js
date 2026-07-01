// 背景粒子效果 - 暗色精调版
(function(){
  const canvas=document.getElementById('bg-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let particles=[],W,H;
  
  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
  }
  resize();
  window.addEventListener('resize',resize);
  
  const count=Math.min(40,Math.floor(W*H/35000));
  for(let i=0;i<count;i++){
    particles.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-0.5)*0.15,vy:(Math.random()-0.5)*0.15,
      r:Math.random()*1.5+0.3,
      alpha:Math.random()*0.3+0.05
    });
  }
  
  function draw(){
    ctx.clearRect(0,0,W,H);
    // 连线
    for(let i=0;i<particles.length;i++){
      const p1=particles[i];
      for(let j=i+1;j<particles.length;j++){
        const p2=particles[j];
        const dx=p1.x-p2.x,dy=p1.y-p2.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<100){
          ctx.strokeStyle='rgba(168,85,247,'+(0.04*(1-dist/100))+')';
          ctx.lineWidth=0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x,p1.y);
          ctx.lineTo(p2.x,p2.y);
          ctx.stroke();
        }
      }
    }
    // 粒子
    for(const p of particles){
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.fillStyle='rgba(168,85,247,'+p.alpha+')';
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
