const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];

// Year
$('#year').textContent=new Date().getFullYear();

// Scroll UI
const progress=$('.scroll-progress'), header=$('.site-header');
const updateScroll=()=>{
  const max=document.documentElement.scrollHeight-innerHeight;
  progress.style.width=`${max?scrollY/max*100:0}%`;
  header.classList.toggle('scrolled',scrollY>24);
};
addEventListener('scroll',updateScroll,{passive:true}); updateScroll();

// Mobile navigation
const menu=$('.menu-toggle'), nav=$('.nav');
menu.addEventListener('click',()=>{
  const open=!nav.classList.contains('open');
  nav.classList.toggle('open',open);menu.classList.toggle('active',open);
  menu.setAttribute('aria-expanded',open);document.body.classList.toggle('menu-open',open);
});
$$('.nav a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.classList.remove('active');menu.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open')}));

// Reveal on scroll
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});
$$('.reveal').forEach(el=>io.observe(el));

// Cursor glow
const glow=$('.cursor-glow');
addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px';glow.style.opacity='1'},{passive:true});
addEventListener('pointerleave',()=>glow.style.opacity='0');

// Magnetic CTAs
$$('.magnetic').forEach(btn=>{
  btn.addEventListener('pointermove',e=>{const r=btn.getBoundingClientRect();const x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;btn.style.transform=`translate(${x*.08}px,${y*.12}px)`});
  btn.addEventListener('pointerleave',()=>btn.style.transform='');
});

// Subtle 3D tilt on desktop
if(matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  $$('.tilt-card').forEach(card=>{
    card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*5).toFixed(2)}deg) translateY(-2px)`});
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });
}

// Parallax
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  addEventListener('scroll',()=>{$$('[data-parallax]').forEach(el=>{const speed=parseFloat(el.dataset.parallax||0);const r=el.getBoundingClientRect();const offset=(innerHeight/2-(r.top+r.height/2))*speed;el.style.translate=`0 ${offset}px`})},{passive:true});
}

// Interactive network canvas
(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const canvas=$('#network'),ctx=canvas.getContext('2d');let w=0,h=0,dpr=1,pts=[],mouse={x:-9999,y:-9999};
  function resize(){dpr=Math.min(devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(70,Math.max(35,Math.floor(w/24)));pts=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.2+.35}))}
  function draw(){ctx.clearRect(0,0,w,h);for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;const md=Math.hypot(p.x-mouse.x,p.y-mouse.y);if(md<150){p.x+=(p.x-mouse.x)*.003;p.y+=(p.y-mouse.y)*.003}ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(150,185,235,.32)';ctx.fill()}
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<120){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(78,130,210,${(1-d/120)*.07})`;ctx.stroke()}}
    requestAnimationFrame(draw)}
  addEventListener('resize',resize);canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top});canvas.addEventListener('pointerleave',()=>mouse={x:-9999,y:-9999});resize();draw();
})();

// Active nav section hint
const links=$$('.nav a[href^="#"]');
const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
const sectionObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))}})},{rootMargin:'-40% 0px -55%'});
sections.forEach(s=>sectionObserver.observe(s));
