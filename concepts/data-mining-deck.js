(() => {
  const root=document.getElementById('deckRoot'),stage=document.getElementById('stage'),slides=Array.from(stage.querySelectorAll('.slide'));
  const prevBtn=document.getElementById('prevBtn'),nextBtn=document.getElementById('nextBtn'),restartBtn=document.getElementById('restartBtn'),fullscreenBtn=document.getElementById('fullscreenBtn'),exitFullscreenBtn=document.getElementById('exitFullscreenBtn'),dots=document.getElementById('dots'),slideStatus=document.getElementById('slideStatus');
  const slideMemoryKey='dm001:slide:data-mining';
  const params=new URLSearchParams(location.search);
  let current=0;

  function rememberedSlide(){
    const start=params.get('start');
    if(start==='last')return Math.max(0,slides.length-1);
    if(start==='first')return 0;
    try{
      const saved=Number(sessionStorage.getItem(slideMemoryKey));
      return Number.isInteger(saved)&&saved>=0&&saved<slides.length?saved:0;
    }catch(_){return 0}
  }
  function rememberSlide(){try{sessionStorage.setItem(slideMemoryKey,String(current))}catch(_){}}
  function consumeStartParam(){
    const start=params.get('start');
    if(start!=='first'&&start!=='last')return;
    try{
      const url=new URL(location.href);
      url.searchParams.delete('start');
      history.replaceState(history.state,'',url.href);
    }catch(_){}
  }

  slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='dot-btn'+(i===0?' active':'');b.setAttribute('aria-label',`跳到第 ${i+1} 页`);b.addEventListener('click',()=>showSlide(i));dots.appendChild(b)});
  function showSlide(index){current=Math.max(0,Math.min(slides.length-1,index));slides.forEach((s,i)=>s.classList.toggle('active',i===current));Array.from(dots.children).forEach((d,i)=>d.classList.toggle('active',i===current));slideStatus.textContent=`${current+1} / ${slides.length}`;prevBtn.disabled=current===0;nextBtn.disabled=current===slides.length-1;stage.setAttribute('aria-label',`第 ${current+1} 页：${slides[current].dataset.title||''}`);rememberSlide()}
  prevBtn.addEventListener('click',()=>showSlide(current-1));nextBtn.addEventListener('click',()=>showSlide(current+1));
  document.addEventListener('keydown',e=>{const tag=document.activeElement&&document.activeElement.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();showSlide(current+1)}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();showSlide(current-1)}else if(e.key==='Home'){e.preventDefault();showSlide(0)}else if(e.key==='End'){e.preventDefault();showSlide(slides.length-1)}});
  async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else{await root.requestFullscreen();root.focus({preventScroll:true})}}catch(_){fullscreenBtn.title='浏览器阻止了全屏，请使用浏览器自带全屏功能'}}
  if(!root.requestFullscreen){fullscreenBtn.disabled=true;fullscreenBtn.title='当前浏览器不支持全屏 API'}else{fullscreenBtn.addEventListener('click',toggleFullscreen);exitFullscreenBtn.addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',()=>{const on=document.fullscreenElement===root;fullscreenBtn.innerHTML=on?'⛶ <span>退出全屏</span>':'⛶ <span>全屏演示</span>';if(on)root.focus({preventScroll:true})})}
  document.querySelectorAll('[data-reveal]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.answer').forEach(el=>el.classList.remove('show'));document.querySelectorAll(`.answer[data-kind="${btn.dataset.reveal}"]`).forEach(el=>el.classList.add('show'))}));
  document.querySelectorAll('.criterion').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('active')));
  document.querySelectorAll('.quiz-item').forEach(item=>item.querySelectorAll('.choice-btn').forEach(btn=>btn.addEventListener('click',()=>{const result=item.querySelector('.quiz-result'),correct=btn.dataset.choice===item.dataset.answer;result.textContent=correct?'✓ 对，这一项更接近 '+(item.dataset.answer==='query'?'查询（Query）：答案已经被问题明确指定。':'挖掘（Mining）：目标是发现或预测尚未知的模式。'):'再想一下：问题是在“取一个已知答案”，还是在“发现未知模式”？';result.className='quiz-result '+(correct?'ok':'no')})));
  const processSteps=Array.from(document.querySelectorAll('.process-step')),processNext=document.getElementById('processNext'),processReset=document.getElementById('processReset'),processNote=document.getElementById('processNote'),finalMessage=document.getElementById('finalMessage');
  const processNotes=['从一个现实问题开始：我们到底想理解、预测或改变什么？','获取与问题有关的数据，并确认对象、变量、范围和来源。','清洗、集成、变换和表示数据，让它变得可以分析。','这里才进入算法：发现模式、建立模型、进行搜索或学习。','判断模式是不是可靠、泛化、可解释，并排除偶然与偏差。','把结果变成可以理解的知识，而不是只留下一个分数。','最终回到行动：做决策、优化系统，或者提出新的问题。'];
  let processIndex=0;
  function renderProcess(){processSteps.forEach((step,i)=>{step.classList.toggle('done',i<processIndex);step.classList.toggle('active',i===processIndex&&processIndex<processSteps.length)});processNote.textContent=processNotes[Math.min(processIndex,processNotes.length-1)];const finished=processIndex>=processSteps.length;processNext.disabled=finished;processNext.textContent=finished?'演示完成 ✓':'演示下一步 →';finalMessage.classList.toggle('show',finished)}
  processNext.addEventListener('click',()=>{if(processIndex<processSteps.length)processIndex+=1;renderProcess()});processReset.addEventListener('click',()=>{processIndex=0;renderProcess()});
  function reset(){document.querySelectorAll('.answer').forEach(el=>el.classList.remove('show'));document.querySelectorAll('.criterion').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.quiz-result').forEach(el=>{el.textContent='';el.className='quiz-result'});processIndex=0;renderProcess()}
  restartBtn.addEventListener('click',()=>{reset();showSlide(0);root.focus({preventScroll:true})});
  let sx=null,sy=null;stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;sx=e.clientX;sy=e.clientY});stage.addEventListener('pointerup',e=>{if(sx===null||sy===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;sy=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4)showSlide(current+(dx<0?1:-1))});
  renderProcess();showSlide(rememberedSlide());consumeStartParam();root.focus({preventScroll:true});
})();