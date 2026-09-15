(() => {
  const root=document.getElementById('deckRoot'),stage=document.getElementById('stage'),slides=Array.from(stage.querySelectorAll('.slide'));
  const prevBtn=document.getElementById('prevBtn'),nextBtn=document.getElementById('nextBtn'),restartBtn=document.getElementById('restartBtn'),fullscreenBtn=document.getElementById('fullscreenBtn'),exitFullscreenBtn=document.getElementById('exitFullscreenBtn'),dots=document.getElementById('dots'),slideStatus=document.getElementById('slideStatus');
  let current=0;
  slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='dot-btn'+(i===0?' active':'');b.setAttribute('aria-label',`跳到第 ${i+1} 页`);b.addEventListener('click',()=>showSlide(i));dots.appendChild(b)});
  function showSlide(index){current=Math.max(0,Math.min(slides.length-1,index));slides.forEach((s,i)=>s.classList.toggle('active',i===current));Array.from(dots.children).forEach((d,i)=>d.classList.toggle('active',i===current));slideStatus.textContent=`${current+1} / ${slides.length}`;prevBtn.disabled=current===0;nextBtn.disabled=current===slides.length-1;stage.setAttribute('aria-label',`第 ${current+1} 页：${slides[current].dataset.title||''}`)}
  prevBtn.addEventListener('click',()=>showSlide(current-1));nextBtn.addEventListener('click',()=>showSlide(current+1));
  document.addEventListener('keydown',e=>{const tag=document.activeElement&&document.activeElement.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();showSlide(current+1)}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();showSlide(current-1)}else if(e.key==='Home'){e.preventDefault();showSlide(0)}else if(e.key==='End'){e.preventDefault();showSlide(slides.length-1)}});
  async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else{await root.requestFullscreen();root.focus({preventScroll:true})}}catch(_){fullscreenBtn.title='浏览器阻止了全屏，请使用浏览器自带全屏功能'}}
  if(!root.requestFullscreen){fullscreenBtn.disabled=true;fullscreenBtn.title='当前浏览器不支持全屏 API'}else{fullscreenBtn.addEventListener('click',toggleFullscreen);exitFullscreenBtn.addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',()=>{const on=document.fullscreenElement===root;fullscreenBtn.innerHTML=on?'⛶ <span>退出全屏</span>':'⛶ <span>全屏演示</span>';if(on)root.focus({preventScroll:true})})}

  const meaningPanel=document.getElementById('meaningPanel');
  const meanings={
    id:['名义型标识符（Nominal-like identifier）','学号虽然由数字组成，但主要作用是标识对象。2026002 − 2026001 = 1，并没有“差 1 个单位”的分析意义。'],
    satisfaction:['有序尺度（Ordinal）','满意度 4 通常比 2 高，但 4 与 2 的差距不一定等同于 3 与 1；数字常是在编码顺序。'],
    temp:['区间尺度（Interval）','25°C 比 15°C 高 10°C，差值有意义；但 20°C 不能说是 10°C 的“两倍热”。'],
    height:['比率尺度（Ratio）','175 cm 的差值和比例都具有清晰含义；100 cm 可以说是 50 cm 的两倍。']
  };
  document.querySelectorAll('[data-kind]').forEach(card=>card.addEventListener('click',()=>{document.querySelectorAll('[data-kind]').forEach(c=>c.classList.remove('active'));card.classList.add('active');const [title,note]=meanings[card.dataset.kind];meaningPanel.innerHTML=`<div class="meaning-kicker">${title}</div><div class="meaning-main">${card.querySelector('span:last-child').textContent}</div><div class="meaning-note">${note}</div>`}));

  const steps=Array.from(document.querySelectorAll('.operator-step')),scaleTitle=document.getElementById('scaleTitle'),scaleExample=document.getElementById('scaleExample'),scaleCheck=document.getElementById('scaleCheck'),unlockBtn=document.getElementById('unlockBtn');
  const scaleInfo=[
    ['名义尺度（Nominal）','只允许判断“相同 / 不同”。类别没有天然顺序。','<strong>血型：</strong>A ≠ B ✓<br>但 A &gt; B ✗'],
    ['有序尺度（Ordinal）','除了相同 / 不同，还可以比较先后、高低或等级；但相邻等级之间的距离不一定相等。','<strong>满意度：</strong>5 &gt; 3 ✓<br>但 5 − 3 与 3 − 1 是否等距？未必'],
    ['区间尺度（Interval）','顺序与差值都有意义，但零点不是绝对“没有”，因此比值通常没有意义。','<strong>摄氏温度：</strong>20°C − 10°C = 10°C ✓<br>20°C = 2 × 10°C ✗'],
    ['比率尺度（Ratio）','除了前面的操作，还具有有意义的绝对零点，因此比例也可以解释。','<strong>身高：</strong>100 cm − 50 cm = 50 cm ✓<br>100 cm = 2 × 50 cm ✓']
  ];
  let unlocked=0,selectedStep=0;
  function renderScale(){steps.forEach((s,i)=>{s.classList.toggle('active',i===selectedStep);s.classList.toggle('locked-step',i>unlocked);const pill=s.querySelector('.type-pill');pill.classList.toggle('locked',i>unlocked)});const [t,e,c]=scaleInfo[selectedStep];scaleTitle.textContent=t;scaleExample.textContent=e;scaleCheck.innerHTML=c;unlockBtn.disabled=unlocked>=steps.length-1;unlockBtn.textContent=unlocked>=steps.length-1?'四层已全部解锁 ✓':'解锁下一层 →'}
  steps.forEach((step,i)=>step.addEventListener('click',()=>{if(i>unlocked)return;selectedStep=i;renderScale()}));
  unlockBtn.addEventListener('click',()=>{if(unlocked<steps.length-1){unlocked++;selectedStep=unlocked;renderScale()}});

  const trapFeedback=document.getElementById('trapFeedback');
  document.querySelectorAll('[data-trap]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-trap]').forEach(b=>b.classList.remove('correct','wrong'));const ok=btn.dataset.trap==='no';btn.classList.add(ok?'correct':'wrong');trapFeedback.textContent=ok?'✓ 对。1、2、3 只是城市的编码；编码没有赋予“差值”新的现实含义。':'不对。数字编码只是为了存储或计算方便，不能凭空制造大小和距离关系。'}));

  const impactDetail=document.getElementById('impactDetail');
  const impactText={summary:'名义尺度（Nominal）常看频数和众数；有序尺度（Ordinal）可以讨论中位数和顺序；真正的数值尺度才适合更广泛的算术统计。',encoding:'把类别写成 1/2/3 只是编码。若模型把这些数当连续数值，就可能误以为存在顺序和等距关系。',distance:'“两个城市差 2”没有意义；但“两个身高差 10 cm”有意义。距离函数必须尊重变量类型。',model:'不同模型对类别、有序和连续变量的处理方式不同。输入模型之前，必须先理解变量语义。'};
  document.querySelectorAll('[data-impact]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-impact]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');impactDetail.textContent=impactText[btn.dataset.impact]}));

  function reset(){document.querySelectorAll('[data-kind]').forEach(c=>c.classList.remove('active'));meaningPanel.innerHTML='<div class="meaning-kicker">点击变量（CLICK A VARIABLE）</div><div class="meaning-main">先点任意一列。</div><div class="meaning-note">“存成数字”不代表“可以随便做数学运算”。</div>';unlocked=0;selectedStep=0;renderScale();document.querySelectorAll('[data-trap]').forEach(b=>b.classList.remove('correct','wrong'));trapFeedback.textContent='先作答。';document.querySelectorAll('[data-impact]').forEach(b=>b.classList.remove('active'));impactDetail.textContent='点击任意一项，看为什么变量类型会影响后面的数据挖掘。'}
  restartBtn.addEventListener('click',()=>{reset();showSlide(0);root.focus({preventScroll:true})});
  let sx=null,sy=null;stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;sx=e.clientX;sy=e.clientY});stage.addEventListener('pointerup',e=>{if(sx===null||sy===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;sy=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4)showSlide(current+(dx<0?1:-1))});
  renderScale();showSlide(0);root.focus({preventScroll:true});
})();
