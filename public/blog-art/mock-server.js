(function(){
'use strict';
var NS='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs){e.setAttribute(k,attrs[k]);}if(parent)parent.appendChild(e);return e;}
function txt(parent,x,y,s,cls,anchor){var t=el('text',{x:x,y:y,'text-anchor':anchor||'start'},parent);if(cls)t.setAttribute('class',cls);t.textContent=s;return t;}
function fmt(n){return n.toLocaleString('en-US');}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
function isDark(){var t=document.documentElement.getAttribute('data-theme');if(t)return t==='dark';return window.matchMedia('(prefers-color-scheme: dark)').matches;}
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

// [回合, 录制值, DeepSeek 分词器复算, 假服务端报的, 字符数]
var TOK=[[4,65728,65710,55972,237282],[5,65664,65646,55914,237038],[6,67264,67248,57134,242822],[7,68608,68593,58148,248014],[8,70528,70512,59745,255247],[9,71040,71023,59894,256927],[10,71168,71151,59947,257405],[11,71680,71663,60231,259220],[12,73920,73905,61707,267535],[13,75520,75506,62517,273153],[14,79168,79153,65046,286057],[15,82688,82669,67489,298813],[16,85248,85229,69433,307894],[17,97024,96993,78926,349673]];

function drawTokens(){
  var box=document.getElementById('c-tokens');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,narrow=W<560,H=narrow?250:290,L=52,R=narrow?54:70,T=18,B=30;
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'三种 token 数的折线图'},box);
  var n=TOK.length,ymax=100000,sx=function(i){return L+i/(n-1)*(W-L-R);},sy=function(v){return T+(1-v/ymax)*(H-T-B);};
  [0,25000,50000,75000,100000].forEach(function(v){var y=sy(v);el('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:css('--line'),'stroke-width':1},svg);txt(svg,L-8,y+4,v===0?'0':(v/1000)+'K','','end');});
  TOK.forEach(function(r,i){if(narrow&&i%2)return;txt(svg,sx(i),H-8,'第 '+r[0]+(narrow?'':' 回合'),'','middle');});
  function line(idx,color){var d=TOK.map(function(r,i){return (i?'L':'M')+sx(i)+','+sy(r[idx]);}).join('');el('path',{d:d,fill:'none',stroke:color,'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'},svg);}
  line(3,css('--bar-3'));line(2,css('--acc'));
  var last=TOK[n-1];
  el('circle',{cx:sx(n-1),cy:sy(last[2]),r:4.5,fill:css('--acc'),stroke:css('--surface'),'stroke-width':2},svg);
  el('circle',{cx:sx(n-1),cy:sy(last[3]),r:4.5,fill:css('--bar-3'),stroke:css('--surface'),'stroke-width':2},svg);
  txt(svg,sx(n-1)+10,sy(last[2])+4,fmt(last[2]),'strong');
  txt(svg,sx(n-1)+10,sy(last[3])+4,fmt(last[3]),'ink');
  // 差距标注
  var mi=Math.floor(n/2),gx=sx(mi);
  el('line',{x1:gx,x2:gx,y1:sy(TOK[mi][2])+5,y2:sy(TOK[mi][3])-5,stroke:css('--ink-2'),'stroke-width':1},svg);
  var pct=Math.round((1-TOK[mi][3]/TOK[mi][2])*100);
  var lab=txt(svg,gx+8,(sy(TOK[mi][2])+sy(TOK[mi][3]))/2+4,'少报 '+pct+'%','ink');lab.style.fontWeight='500';
  // 十字线
  var cross=el('line',{x1:0,x2:0,y1:T,y2:H-B,stroke:css('--bar-2'),'stroke-width':1,opacity:0},svg);
  var hit=el('rect',{x:L,y:T,width:W-L-R,height:H-T-B,fill:'transparent'},svg);hit.setAttribute('tabindex','0');
  var cur=0;
  function at(i,ev){i=Math.max(0,Math.min(n-1,i));cur=i;var r=TOK[i];
    cross.setAttribute('x1',sx(i));cross.setAttribute('x2',sx(i));cross.setAttribute('opacity',1);
    var rect=svg.getBoundingClientRect();
    var e=ev&&ev.clientX!==undefined?ev:{clientX:rect.left+sx(i)*(rect.width/W),clientY:rect.top+sy(r[2])*(rect.height/H)};
    showTip(e,'真分词器 '+fmt(r[2])+' token',['第 '+r[0]+' 回合','录制值 '+fmt(r[1]),'假服务端报 '+fmt(r[3])+'（少 '+((1-r[3]/r[2])*100).toFixed(1)+'%）','共 '+fmt(r[4])+' 个字符']);}
  hit.addEventListener('pointermove',function(ev){var rect=svg.getBoundingClientRect(),x=(ev.clientX-rect.left)*(W/rect.width);at(Math.round((x-L)/(W-L-R)*(n-1)),ev);});
  function off(){cross.setAttribute('opacity',0);hideTip();}
  hit.addEventListener('pointerleave',off);hit.addEventListener('blur',off);
  hit.addEventListener('focus',function(){at(cur);});
  hit.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){at(cur+1);e.preventDefault();}if(e.key==='ArrowLeft'){at(cur-1);e.preventDefault();}});
}
table('t-tokens',['回合','录制值','真分词器复算','假服务端报的','少报','字符数'],TOK.map(function(r){return [String(r[0]),fmt(r[1]),fmt(r[2]),fmt(r[3]),((1-r[3]/r[2])*100).toFixed(1)+'%',fmt(r[4])];}),[1,1,1,1,1,1]);

function drawAll(){drawTokens();}
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
