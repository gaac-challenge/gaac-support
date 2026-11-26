(function(){
'use strict';
var NS='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs){e.setAttribute(k,attrs[k]);}if(parent)parent.appendChild(e);return e;}
function txt(parent,x,y,s,cls,anchor){var t=el('text',{x:x,y:y,'text-anchor':anchor||'start'},parent);if(cls)t.setAttribute('class',cls);t.textContent=s;return t;}
function fmt(n){return n.toLocaleString('en-US');}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
function isDark(){var t=document.documentElement.getAttribute('data-theme');if(t)return t==='dark';return window.matchMedia('(prefers-color-scheme: dark)').matches;}
function lum(hex){hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(function(c){return c+c;}).join('');
  function f(c){c=c/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
  return 0.2126*f(parseInt(hex.substr(0,2),16))+0.7152*f(parseInt(hex.substr(2,2),16))+0.0722*f(parseInt(hex.substr(4,2),16));}
function onFill(hex){return lum(hex)>0.2?'#1e1e2a':'#ffffff';}
var tip=document.getElementById('tip');
function showTip(ev,v1,lines){
  while(tip.firstChild)tip.removeChild(tip.firstChild);
  var a=document.createElement('div');a.className='tv1';a.textContent=v1;tip.appendChild(a);
  lines.forEach(function(s){var b=document.createElement('div');b.className='tv2';b.textContent=s;tip.appendChild(b);});
  tip.style.opacity='1';
  var tw=tip.offsetWidth,th=tip.offsetHeight,px=ev.clientX+14,py=ev.clientY-th-12;
  if(px+tw>window.innerWidth-8)px=ev.clientX-tw-14;
  if(py<8)py=ev.clientY+16;
  tip.style.left=px+'px';tip.style.top=py+'px';
}
function hideTip(){tip.style.opacity='0';}
function table(id,head,rows,right){
  var box=document.getElementById(id);while(box.firstChild)box.removeChild(box.firstChild);
  var t=document.createElement('table'),th=document.createElement('thead'),tr=document.createElement('tr');
  head.forEach(function(h,i){var c=document.createElement('th');c.textContent=h;if(right&&right[i])c.className='r';tr.appendChild(c);});
  th.appendChild(tr);t.appendChild(th);var tb=document.createElement('tbody');
  rows.forEach(function(r){var tr=document.createElement('tr');r.forEach(function(v,i){var c=document.createElement('td');c.textContent=v;if(right&&right[i])c.className='r';tr.appendChild(c);});tb.appendChild(tr);});
  t.appendChild(tb);box.appendChild(t);
}
// 给一组图形挂上悬停、聚焦和左右键
function wire(svg,W,H,items,show){
  var cur=0;
  function at(i,ev){i=Math.max(0,Math.min(items.length-1,i));cur=i;var it=items[i];
    var rect=svg.getBoundingClientRect();
    var e=ev&&ev.clientX!==undefined?ev:{clientX:rect.left+it.cx*(rect.width/W),clientY:rect.top+it.cy*(rect.height/H)};
    items.forEach(function(o,j){if(o.node)o.node.setAttribute('opacity',j===i?1:0.55);});
    show(i,e);}
  function off(){items.forEach(function(o){if(o.node)o.node.setAttribute('opacity',1);});hideTip();}
  items.forEach(function(it,i){it.hit.addEventListener('pointermove',function(ev){at(i,ev);});it.hit.addEventListener('pointerleave',off);});
  svg.setAttribute('tabindex','0');
  svg.addEventListener('focus',function(){at(cur);});
  svg.addEventListener('blur',off);
  svg.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='ArrowDown'){at(cur+1);e.preventDefault();}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){at(cur-1);e.preventDefault();}});
}

// 图 1：语料快照的 token 构成 [名称, 十亿 token, 占比 %]
var COMP=[['缓存读取',583.68,95.18,'从缓存里直接取的前缀'],['缓存写入',21.18,3.45,'新算出来并存进缓存的'],['新输入',5.87,0.96,'没走缓存、照常计算的输入'],['输出',2.54,0.41,'模型生成的 token']];
function compColors(){return [css('--acc'),css('--bar-3'),css('--bar-2'),css('--ink-2')];}
function drawComp(){
  var box=document.getElementById('c-comp');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,narrow=W<560,H=narrow?96:88,T=6,BH=44,R=0;
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'语料快照的 token 构成：缓存读取 95.18%，缓存写入 3.45%，新输入 0.96%，输出 0.41%'},box);
  var cols=compColors(),x=0,gap=2,usable=W-R-gap*(COMP.length-1),items=[];
  COMP.forEach(function(c,i){
    var w=Math.max(3,usable*c[2]/100);
    var g=el('g',{},svg);
    var r=el('rect',{x:x,y:T,width:w,height:BH,rx:i===0?5:2,fill:cols[i]},g);
    var hit=el('rect',{x:x-1,y:T-4,width:w+gap+1,height:BH+8,fill:'transparent'},g);
    items.push({node:g,hit:hit,cx:x+w/2,cy:T+BH/2});
    if(i===0){var lab=txt(svg,x+14,T+BH/2+5,'缓存读取 95.18%','');lab.style.fill=onFill(cols[0]);lab.style.fontWeight='600';lab.style.fontSize='13.5px';lab.style.pointerEvents='none';}
    x+=w+gap;
  });
  // 其余 4.82% 的括注
  var x0=items[1].cx-(usable*COMP[1][2]/100)/2-1,y=T+BH+8;
  el('path',{d:'M'+x0+','+y+' v5 H'+(W-1)+' v-5',fill:'none',stroke:css('--bar-3'),'stroke-width':1},svg);
  txt(svg,W-1,y+22,narrow?'其余 4.82%':'其余 4.82%：写入缓存、新算的输入和输出','ink','end');
  wire(svg,W,H,items,function(i,e){var c=COMP[i];showTip(e,c[0]+' '+c[2]+'%',[fmt(c[1])+' 十亿 token',c[3]]);});
  // 图例
  var lg=document.getElementById('lg-comp');while(lg.firstChild)lg.removeChild(lg.firstChild);
  COMP.forEach(function(c,i){var s=document.createElement('span'),sw=document.createElement('i');sw.style.background=cols[i];s.appendChild(sw);s.appendChild(document.createTextNode(c[0]+' '+c[2]+'%'));lg.appendChild(s);});
}
table('t-comp',['类别','token（十亿）','占比','说明'],COMP.map(function(c){return [c[0],c[1].toFixed(2),c[2].toFixed(2)+'%',c[3]];}),[0,1,1,0]);

// 图 2：从 13,316 条到 393 条 [名称, 会话数, 说明]
var FUN=[['全库会话',13316,'语料快照里的全部会话'],['20 个请求以上',8271,'快照里请求数超过 20 的会话'],['AgentX 1.0 发布',393,'再过七道筛子后剩下的全部']];
function drawFunnel(){
  var box=document.getElementById('c-funnel');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,narrow=W<560,LW=narrow?0:130,VW=narrow?92:150,BH=24,rowH=narrow?58:46,GAP=narrow?40:34,T=narrow?16:6;
  var H=T+rowH*3+GAP;
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'会话数从 13,316 条筛到 8,271 条，再到 393 条'},box);
  var bw=W-LW-VW,items=[];
  FUN.forEach(function(f,i){
    var y=T+i*rowH+(i===2?GAP:0),by=narrow?y+6:y+(rowH-BH)/2-6;
    var lab=txt(svg,narrow?0:0,narrow?y:by+BH/2+4,f[0],i===2?'strong':'ink');
    var w=Math.max(4,bw*f[1]/FUN[0][1]);
    var g=el('g',{},svg);
    el('rect',{x:LW,y:by,width:w,height:BH,rx:4,fill:i===2?css('--acc'):css('--bar-2')},g);
    var vx=LW+w+10;
    var v=txt(svg,vx,by+BH/2+5,fmt(f[1])+' 条',i===2?'strong':'ink');v.style.fontSize='13.5px';
    if(i>0){txt(svg,vx+v.getComputedTextLength()+10,by+BH/2+5,'占全库 '+(f[1]/FUN[0][1]*100).toFixed(i===2?2:1)+'%','');}
    var hit=el('rect',{x:0,y:by-6,width:W,height:BH+12,fill:'transparent'},g);
    items.push({node:g,hit:hit,cx:LW+w/2,cy:by+BH/2});
  });
  // 两行之间的说明
  var ny=T+2*rowH+GAP/2-(narrow?2:6);
  txt(svg,LW,ny,narrow?'↓ 再过七道筛子，各砍多少未公布':'↓ 再过七道筛子：版本、请求头、图片、子智能体并发、故障会话……各砍多少未公布','');
  wire(svg,W,H,items,function(i,e){var f=FUN[i];showTip(e,fmt(f[1])+' 条会话',[f[0],f[2],'占全库 '+(f[1]/FUN[0][1]*100).toFixed(2)+'%']);});
}
table('t-funnel',['阶段','会话数','占全库','说明'],FUN.map(function(f){return [f[0],fmt(f[1]),(f[1]/FUN[0][1]*100).toFixed(2)+'%',f[2]];}),[0,1,1,0]);

// 图 3：测过的模型 [名称, 总参数（十亿）, 显示, 激活参数, 数据版本, 备注]
var MOD=[['Qwen3.5',397,'3,970 亿','—','256K 版','原生窗口 26.2 万，用截短版'],['MiniMax M3',432,'4,320 亿','—','完整版',''],['DeepSeek V4.1 Flash',552,'5,520 亿','读输入 80 亿 / 生成 160 亿','完整版','我们比赛用的模型；配方窗口 1,048,576'],['GLM 5.2',744,'7,440 亿','—','完整版','GLM 5.3 在它之上加了后训练'],['DeepSeek V4 Pro',1600,'约 1.6 万亿','490 亿','完整版',''],['Kimi K3',2800,'2.8 万亿','—','完整版','一台 B200 服务器装不下']];
var OURS=2;
function drawModels(){
  var box=document.getElementById('c-models');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,narrow=W<560,LW=narrow?0:150,VW=narrow?118:150,BH=18,rowH=narrow?50:36,T=narrow?14:8,B=26;
  var H=T+rowH*MOD.length+B,xmax=3000,bw=W-LW-VW,sx=function(v){return LW+v/xmax*bw;};
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'SemiAnalysis 用 AgentX 测过的六个模型的总参数量'},box);
  [0,1000,2000,3000].forEach(function(v){var x=sx(v);el('line',{x1:x,x2:x,y1:T-4,y2:H-B,stroke:css('--line'),'stroke-width':1},svg);txt(svg,x,H-8,v===0?'0':(v/1000)+' 万亿','',v===0?'start':'middle');});
  var items=[];
  MOD.forEach(function(m,i){
    var y=T+i*rowH,by=narrow?y+8:y+(rowH-BH)/2;
    txt(svg,0,narrow?y+2:by+BH/2+4,m[0],i===OURS?'strong':'ink');
    var g=el('g',{},svg);
    var w=sx(m[1])-LW;
    el('rect',{x:LW,y:by,width:w,height:BH,rx:4,fill:i===OURS?css('--acc'):css('--bar-2')},g);
    var v=txt(svg,LW+w+8,by+BH/2+4,m[2],i===OURS?'strong':'ink');
    if(m[4]==='256K 版'){txt(svg,LW+w+8+v.getComputedTextLength()+6,by+BH/2+4,'· 256K 版','');}
    var hit=el('rect',{x:0,y:by-6,width:W,height:BH+12,fill:'transparent'},g);
    items.push({node:g,hit:hit,cx:LW+w/2,cy:by+BH/2});
  });
  wire(svg,W,H,items,function(i,e){var m=MOD[i],lines=['总参数 '+m[2]];if(m[3]!=='—')lines.push('激活 '+m[3]);lines.push('数据：'+m[4]);if(m[5])lines.push(m[5]);showTip(e,m[0],lines);});
}
table('t-models',['模型','总参数','激活参数','数据版本','备注'],MOD.map(function(m){return [m[0],m[2],m[3],m[4],m[5]||'—'];}),[0,1,1,0,0]);

function drawAll(){drawComp();drawFunnel();drawModels();}
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(drawAll,120);});
var btn=document.getElementById('themeBtn'),root=document.documentElement;
function syncBtn(){btn.textContent=isDark()?'浅色':'深色';}
try{var saved=localStorage.getItem('blog-theme');if(saved)root.setAttribute('data-theme',saved);}catch(e){}
btn.addEventListener('click',function(){var next=isDark()?'light':'dark';root.setAttribute('data-theme',next);try{localStorage.setItem('blog-theme',next);}catch(e){}syncBtn();drawAll();});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){syncBtn();drawAll();});
syncBtn();
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(drawAll);}
drawAll();
})();
