(function(){
'use strict';
var NS='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs){e.setAttribute(k,attrs[k]);}if(parent)parent.appendChild(e);return e;}
function txt(parent,x,y,s,cls,anchor){var t=el('text',{x:x,y:y,'text-anchor':anchor||'start'},parent);if(cls)t.setAttribute('class',cls);t.textContent=s;return t;}
function fmt(n){return n.toLocaleString('en-US');}
function onFill(hex){var h=hex.replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');var c=[0,2,4].map(function(i){var v=parseInt(h.substr(i,2),16)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});var L=0.2126*c[0]+0.7152*c[1]+0.0722*c[2];var cw=1.05/(L+0.05),cb=(L+0.05)/(0.0136+0.05);return cw>=cb?'#ffffff':'#1e1e2a';}
function textW(s){var w=0;for(var i=0;i<s.length;i++){w+=/[⺀-鿿＀-￯]/.test(s[i])?12.5:7;}return w;}
function isDark(){var t=document.documentElement.getAttribute('data-theme');if(t)return t==='dark';return window.matchMedia('(prefers-color-scheme: dark)').matches;}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
// 四角里只有数据端圆角：用 path 画一个只圆右端（或上端）的条
function barH(p,x,y,w,h,r,fill){r=Math.min(r,w/2,h/2);var d='M'+x+','+y+'h'+(w-r)+'a'+r+','+r+' 0 0 1 '+r+','+r+'v'+(h-2*r)+'a'+r+','+r+' 0 0 1 '+(-r)+','+r+'h'+(-(w-r))+'z';return el('path',{d:d,fill:fill},p);}
function barV(p,x,y,w,h,r,fill){r=Math.min(r,w/2,h);var d='M'+x+','+(y+h)+'v'+(-(h-r))+'a'+r+','+r+' 0 0 1 '+r+','+(-r)+'h'+(w-2*r)+'a'+r+','+r+' 0 0 1 '+r+','+r+'v'+(h-r)+'z';return el('path',{d:d,fill:fill},p);}

/* ---------- 提示框 ---------- */
var tip=document.getElementById('tip');
function showTip(ev,v1,lines){
  while(tip.firstChild)tip.removeChild(tip.firstChild);
  var a=document.createElement('div');a.className='tv1';a.textContent=v1;tip.appendChild(a);
  lines.forEach(function(s){var b=document.createElement('div');b.className='tv2';b.textContent=s;tip.appendChild(b);});
  var x=ev.clientX,y=ev.clientY;
  if(x===undefined&&ev.target&&ev.target.getBoundingClientRect){var r=ev.target.getBoundingClientRect();x=r.left+r.width/2;y=r.top;}
  tip.style.opacity='1';
  var tw=tip.offsetWidth,th=tip.offsetHeight,px=x+14,py=y-th-12;
  if(px+tw>window.innerWidth-8)px=x-tw-14;
  if(py<8)py=y+16;
  tip.style.left=px+'px';tip.style.top=py+'px';
}
function hideTip(){tip.style.opacity='0';}
function hover(node,fn){
  node.setAttribute('tabindex','0');
  node.style.cursor='default';
  node.addEventListener('pointermove',function(e){var c=fn();showTip(e,c[0],c[1]);});
  node.addEventListener('pointerleave',hideTip);
  node.addEventListener('focus',function(e){var c=fn();showTip(e,c[0],c[1]);});
  node.addEventListener('blur',hideTip);
}
function table(id,head,rows,right){
  var box=document.getElementById(id);while(box.firstChild)box.removeChild(box.firstChild);
  var t=document.createElement('table'),th=document.createElement('thead'),tr=document.createElement('tr');
  head.forEach(function(h,i){var c=document.createElement('th');c.textContent=h;if(right&&right[i])c.className='r';tr.appendChild(c);});
  th.appendChild(tr);t.appendChild(th);var tb=document.createElement('tbody');
  rows.forEach(function(r){var tr=document.createElement('tr');r.forEach(function(v,i){var c=document.createElement('td');c.textContent=v;if(right&&right[i])c.className='r';tr.appendChild(c);});tb.appendChild(tr);});
  t.appendChild(tb);box.appendChild(t);
}

/* ---------- 数据 ---------- */
// 会话 006c98de：[第几次, 时刻秒, 输入, 输出, 块数, 与上一回合相同的前缀块数]
var SESSION=[[0,0.0,448,14,7,0],[1,1.0,64640,65,1010,0],[2,14.1,64960,173,1015,1010],[3,84.4,65408,228,1022,1015],[4,267.3,65728,73,1027,1022],[5,3988.2,65664,183,1026,1026],[6,4049.7,67264,246,1051,1026],[7,4198.0,68608,103,1072,1051],[8,4200.3,70528,278,1102,1072],[9,4234.2,71040,159,1110,1102],[10,4239.3,71168,145,1112,1110],[11,4242.2,71680,553,1120,1112],[12,4251.8,73920,522,1155,1120],[13,4259.5,75520,580,1180,1155],[14,4265.5,79168,606,1237,1180],[15,4271.4,82688,251,1292,1237],[16,4280.5,85248,567,1332,1292],[17,4305.5,97024,4045,1516,1332],[18,4328.8,98624,2192,1541,1516],[19,4346.2,102208,162,1597,1541],[20,4349.6,102464,480,1601,1597],[21,4353.9,104960,837,1640,1601],[22,4363.6,106624,945,1666,1640],[23,4370.5,109504,1217,1711,1666],[24,4378.2,110848,185,1732,1711],[25,4381.1,111360,188,1740,1732],[26,4383.9,112000,774,1750,1740],[27,4389.8,114304,3694,1786,1750],[28,4408.3,117184,272,1831,1786],[29,4412.4,117824,945,1841,1831],[30,4419.7,119360,801,1865,1841],[31,4613.8,120320,72,1880,1865],[32,5340.1,120128,52,1877,1877]];
// 第一次运行逐请求：[会话, 回合, 阶段 w预热/p测量, 开始秒, 结束秒, 输入(服务端报), 输出]
var REQ=[["006c98de",4,"w",0.0,0.66,55972,1],["00200129",83,"w",0.04,2.04,179424,1],["006c98de",5,"w",2.05,2.71,55914,1],["006c98de",6,"w",2.71,3.39,57134,1],["00200129",84,"w",2.05,4.06,179013,1],["006c98de",7,"w",3.39,4.52,58148,1],["006c98de",8,"w",4.52,5.22,59745,1],["006c98de",9,"w",5.23,5.93,59894,1],["00200129",85,"w",4.06,6.06,180124,1],["006c98de",10,"w",5.93,6.64,59947,1],["006c98de",11,"w",6.64,7.35,60231,1],["00200129",86,"w",6.06,8.0,184480,1],["006c98de",12,"w",7.35,8.48,61707,1],["006c98de",13,"w",8.48,9.21,62517,1],["00200129",87,"w",8.01,9.95,184535,1],["006c98de",14,"w",9.21,10.44,65046,1],["00200129",88,"w",9.96,11.93,185895,1],["00200129",89,"w",11.93,13.9,186101,1],["00200129",90,"w",13.91,15.87,185952,1],["00200129",91,"w",15.87,17.86,188511,1],["00200129",92,"w",17.87,19.86,189038,1],["00200129",93,"w",19.87,21.86,188566,1],["006c98de",15,"p",22.0,25.56,67489,251],["006c98de",16,"p",27.08,34.2,69433,567],["006c98de",17,"p",44.21,90.1,78926,4045],["006c98de",18,"p",91.71,116.96,78970,2192],["006c98de",19,"p",118.54,121.24,80103,162],["006c98de",20,"p",122.56,128.81,80167,480],["006c98de",21,"p",130.11,140.35,81858,837]];
var WIN=[22.0,142.0];
var STAGES=['启动','准备数据','预热','测量','收尾'];
var RUNS=[{name:'第一次（冷启动）',seg:[7.4,166.0,22.1,120.0,3.0]},{name:'第二次（读缓存）',seg:[3.1,2.4,22.1,131.2,2.3]}];
var CTX=[['32K',32768,0,9.9],['64K',65536,7,25.0],['128K',131072,82,46.7],['256K',262144,220,69.8],['1M',1048576,393,100.0]];

/* ---------- 原理图里的四行块 ---------- */
(function(){
  var box=document.getElementById('blockRows');
  var pick=[2,3,15,17], maxB=1516;
  pick.forEach(function(i){
    var r=SESSION[i],shared=r[5],total=r[4],neu=total-shared;
    var row=document.createElement('div');row.className='brow';
    var a=document.createElement('div');a.textContent='第 '+i+' 次请求';row.appendChild(a);
    var bar=document.createElement('div');bar.className='bar';bar.style.width=(total/maxB*100)+'%';
    var o=document.createElement('i');o.className='old';o.style.flex=String(shared);bar.appendChild(o);
    var n=document.createElement('i');n.className='new';n.style.flex=String(Math.max(neu,8));bar.appendChild(n);
    row.appendChild(bar);
    var c=document.createElement('div');c.className='r';c.textContent=fmt(shared)+' 块相同 · 新增 '+fmt(neu);row.appendChild(c);
    row.setAttribute('title','第 '+i+' 次请求：共 '+fmt(total)+' 块，其中 '+fmt(shared)+' 块与上一回合相同');
    box.appendChild(row);
  });
})();

/* ---------- 图 1：时间线 ---------- */
var STAGE_FILL=['--line-2','--bar-3','--bar-2','--acc','--line-2'];
function drawTimeline(){
  var box=document.getElementById('c-timeline');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,narrow=W<560,labelW=narrow?0:128,H=narrow?150:120,rowH=26,gapY=narrow?44:30,top=narrow?22:8;
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'两次运行各阶段用时的横向条形图'},box);
  var max=narrow?320:360,x0=labelW,pw=W-labelW-8,sx=function(v){return v/max*pw;};
  // 网格
  [0,60,120,180,240,300].forEach(function(v){var x=x0+sx(v);el('line',{x1:x,x2:x,y1:top-4,y2:top+2*rowH+gapY+2,stroke:css('--line'),'stroke-width':1},svg);txt(svg,x,H-4,v+(v===300?' 秒':''),'',v===0?'start':'middle');});
  RUNS.forEach(function(run,ri){
    var y=top+ri*(rowH+gapY),x=x0,total=run.seg.reduce(function(a,b){return a+b;},0);
    if(narrow)txt(svg,0,y-6,run.name+' · 共 '+total.toFixed(1)+' 秒','ink');
    else{txt(svg,0,y+rowH/2+4,run.name,'ink');}
    run.seg.forEach(function(v,si){
      var w=sx(v),gw=Math.max(w-2,0.8),fill=css(STAGE_FILL[si]);
      var r=el('rect',{x:x,y:y,width:gw,height:rowH,rx:4,fill:fill},svg);
      var hit=el('rect',{x:x,y:y-4,width:Math.max(w,6),height:rowH+8,fill:'transparent'},svg);
      (function(si,v){hover(hit,function(){return [v.toFixed(1)+' 秒',[run.name+' · '+STAGES[si]]];});})(si,v);
      var lab=STAGES[si]+' '+(v<10?v.toFixed(1):Math.round(v));
      if(w>textW(lab)+16){var t=txt(svg,x+8,y+rowH/2+4,lab,'',null);t.style.fill=onFill(fill);t.style.fontWeight='500';t.style.pointerEvents='none';}
      x+=w;
    });
    if(!narrow)txt(svg,x+6,y+rowH/2+4,total.toFixed(1)+' 秒','strong');
  });
  var lg=document.getElementById('l-timeline');while(lg.firstChild)lg.removeChild(lg.firstChild);
  [['启动、收尾','--line-2'],['准备数据','--bar-3'],['预热','--bar-2'],['测量','--acc']].forEach(function(s){var sp=document.createElement('span'),k=document.createElement('i');k.style.background='var('+s[1]+')';sp.appendChild(k);sp.appendChild(document.createTextNode(s[0]));lg.appendChild(sp);});
}
table('t-timeline',['运行','启动','准备数据','预热','测量','收尾','合计（秒）'],RUNS.map(function(r){return [r.name].concat(r.seg.map(function(v){return v.toFixed(1);})).concat([r.seg.reduce(function(a,b){return a+b;},0).toFixed(1)]);}),[0,1,1,1,1,1,1]);

/* ---------- 图 2：两条会话的请求 ---------- */
function drawLanes(){
  var box=document.getElementById('c-lanes');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,narrow=W<560,labelW=narrow?0:120,laneH=18,gap=narrow?44:30,top=narrow?52:38,H=top+2*laneH+gap+30;
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'两条会话的请求时间线'},box);
  var max=145,x0=labelW,pw=W-labelW-6,sx=function(v){return x0+v/max*pw;};
  // 测量窗口
  el('rect',{x:sx(WIN[0]),y:top-30,width:sx(WIN[1])-sx(WIN[0]),height:2*laneH+gap+36,fill:css('--acc-wash'),rx:8},svg);
  if(!narrow)txt(svg,sx(WIN[0])+8,top-12,'测量窗口 120 秒','ink');
  [0,20,40,60,80,100,120,140].forEach(function(v){var x=sx(v);el('line',{x1:x,x2:x,y1:top+2*laneH+gap+8,y2:top+2*laneH+gap+12,stroke:css('--bar-2'),'stroke-width':1},svg);txt(svg,x,H-2,v+(v===140?' 秒':''),'',v===0?'start':'middle');});
  el('line',{x1:x0,x2:W-6,y1:top+2*laneH+gap+8,y2:top+2*laneH+gap+8,stroke:css('--line-2'),'stroke-width':1},svg);
  var lanes=['006c98de','00200129'];
  lanes.forEach(function(L,li){
    var y=top+li*(laneH+gap);
    if(narrow)txt(svg,0,y-8,'会话 '+L,'ink');else txt(svg,0,y+laneH/2+4,'会话 '+L,'ink');
    el('rect',{x:x0,y:y+laneH/2-0.5,width:pw,height:1,fill:css('--line')},svg);
  });
  REQ.forEach(function(r){
    var li=lanes.indexOf(r[0]),y=top+li*(laneH+gap),x=sx(r[3]),w=Math.max(sx(r[4])-sx(r[3])-1,1.5);
    el('rect',{x:x,y:y,width:w,height:laneH,rx:Math.min(3,w/2),fill:r[2]==='p'?css('--acc'):css('--bar-2')},svg);
    var hit=el('rect',{x:x-3,y:y-5,width:w+6,height:laneH+10,fill:'transparent'},svg);
    hover(hit,function(){return [(r[4]-r[3]).toFixed(2)+' 秒',['会话 '+r[0]+' · 第 '+r[1]+' 回合',r[2]==='p'?'测量窗口内':'预热（只要 1 个 token）','输入 '+fmt(r[5])+'（假服务端估算）· 输出 '+fmt(r[6])]];});
  });
  var y2=top+(laneH+gap)+laneH/2+4;
  var note=txt(svg,sx(WIN[0])+(sx(WIN[1])-sx(WIN[0]))/2,y2-14,narrow?'两分钟里一个请求也没发':'这条会话在测量窗口里一个请求也没发','ink','middle');
  note.style.fontWeight='500';
}
table('t-lanes',['会话','回合','阶段','开始（秒）','结束（秒）','输入（假服务端估算）','输出'],REQ.map(function(r){return [r[0],String(r[1]),r[2]==='p'?'测量':'预热',r[3].toFixed(2),r[4].toFixed(2),fmt(r[5]),fmt(r[6])];}),[0,1,0,1,1,1,1]);

/* ---------- 图 3：会话输入长度 ---------- */
function drawSession(){
  var box=document.getElementById('c-session');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,H=W<560?240:280,L=52,R=12,T=16,B=30;
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'会话 006c98de 每次请求的输入 token 数折线图'},box);
  var n=SESSION.length,ymax=125000,sx=function(i){return L+i/(n-1)*(W-L-R);},sy=function(v){return T+(1-v/ymax)*(H-T-B);};
  [0,25000,50000,75000,100000,125000].forEach(function(v){var y=sy(v);el('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:css('--line'),'stroke-width':1},svg);txt(svg,L-8,y+4,v===0?'0':(v/1000)+'K','','end');});
  [0,5,10,15,20,25,30].forEach(function(i){txt(svg,sx(i),H-8,String(i),'','middle');});
  // 62 分钟停顿
  var gx=(sx(4)+sx(5))/2,narrow=W<560;
  el('line',{x1:gx,x2:gx,y1:sy(65700)-8,y2:sy(65700)-46,stroke:css('--bar-2'),'stroke-width':1},svg);
  txt(svg,gx+6,sy(65700)-36,narrow?'停 62 分钟':'这里停了 62 分钟','ink');
  // 整条线
  var d=SESSION.map(function(r,i){return (i?'L':'M')+sx(i)+','+sy(r[2]);}).join('');
  el('path',{d:d,fill:'none',stroke:css('--bar-2'),'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'},svg);
  // 重放到的回合
  var d2=SESSION.slice(15,22).map(function(r,j){return (j?'L':'M')+sx(15+j)+','+sy(r[2]);}).join('');
  el('path',{d:d2,fill:'none',stroke:css('--acc'),'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'},svg);
  for(var i=15;i<=21;i++){el('circle',{cx:sx(i),cy:sy(SESSION[i][2]),r:4.5,fill:css('--acc'),stroke:css('--surface'),'stroke-width':2},svg);}
  if(!narrow){var lt=txt(svg,sx(17)+10,sy(SESSION[17][2])+26,'测量窗口重放到第 15–21 次','ink','start');lt.style.fontWeight='500';}
  // 末端标注
  txt(svg,sx(32)-2,sy(SESSION[32][2])-10,fmt(SESSION[32][2]),'strong','end');
  // 十字线
  var cross=el('line',{x1:0,x2:0,y1:T,y2:H-B,stroke:css('--bar-2'),'stroke-width':1,opacity:0},svg);
  var dot=el('circle',{r:5,fill:css('--ink'),stroke:css('--surface'),'stroke-width':2,opacity:0},svg);
  var hit=el('rect',{x:L,y:T,width:W-L-R,height:H-T-B,fill:'transparent'},svg);
  hit.setAttribute('tabindex','0');
  var cur=0;
  function at(i,ev){
    i=Math.max(0,Math.min(n-1,i));cur=i;var r=SESSION[i];
    cross.setAttribute('x1',sx(i));cross.setAttribute('x2',sx(i));cross.setAttribute('opacity',1);
    dot.setAttribute('cx',sx(i));dot.setAttribute('cy',sy(r[2]));dot.setAttribute('opacity',1);
    var share=r[4]?Math.round(r[5]/r[4]*100):0;
    var gapPrev=i?((r[1]-SESSION[i-1][1])):0;
    var lines=['第 '+i+' 次请求'+(i>=15&&i<=21?'（测量窗口重放到）':''),'输出 '+fmt(r[3])+' token','与上一回合相同的块 '+fmt(r[5])+' / '+fmt(r[4])+'（'+share+'%）'];
    if(i)lines.push('距上一次请求 '+(gapPrev>=120?(gapPrev/60).toFixed(0)+' 分钟':gapPrev.toFixed(1)+' 秒'));
    var rect=svg.getBoundingClientRect();
    var e=ev&&ev.clientX!==undefined?ev:{clientX:rect.left+sx(i)*(rect.width/W),clientY:rect.top+sy(r[2])*(rect.height/H)};
    showTip(e,'输入 '+fmt(r[2])+' token',lines);
  }
  hit.addEventListener('pointermove',function(ev){var rect=svg.getBoundingClientRect(),x=(ev.clientX-rect.left)*(W/rect.width);at(Math.round((x-L)/(W-L-R)*(n-1)),ev);});
  function off(){cross.setAttribute('opacity',0);dot.setAttribute('opacity',0);hideTip();}
  hit.addEventListener('pointerleave',off);hit.addEventListener('blur',off);
  hit.addEventListener('focus',function(){at(cur);});
  hit.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){at(cur+1);e.preventDefault();}if(e.key==='ArrowLeft'){at(cur-1);e.preventDefault();}});
}
table('t-session',['第几次','时刻（秒）','输入','输出','块数','与上一回合相同的块'],SESSION.map(function(r){return [String(r[0]),r[1].toFixed(1),fmt(r[2]),fmt(r[3]),fmt(r[4]),fmt(r[5])];}),[1,1,1,1,1,1]);

/* ---------- 图 4：上下文窗口 ---------- */
function drawCtx(){
  var box=document.getElementById('c-ctx');while(box.firstChild)box.removeChild(box.firstChild);
  var W=box.clientWidth,H=W<560?230:260,L=44,R=8,T=26,B=40;
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'不同上下文窗口下能完整跑完的会话比例柱状图'},box);
  var sy=function(v){return T+(1-v/100)*(H-T-B);},band=(W-L-R)/CTX.length,bw=Math.min(24,band*.5);
  [0,25,50,75,100].forEach(function(v){var y=sy(v);el('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:css('--line'),'stroke-width':1},svg);txt(svg,L-8,y+4,v+'%','','end');});
  CTX.forEach(function(c,i){
    var pct=c[2]/393*100,cx=L+band*i+band/2,y=sy(pct),h=sy(0)-y;
    if(h>0.5)barV(svg,cx-bw/2,y,bw,h,4,css('--acc'));
    else el('rect',{x:cx-bw/2,y:sy(0)-1,width:bw,height:1,fill:css('--bar-2')},svg);
    var lab=txt(svg,cx,y-8,pct===0?'0%':pct.toFixed(pct<10?1:0)+'%','strong','middle');
    txt(svg,cx,H-20,c[0],'ink','middle');
    txt(svg,cx,H-4,'token','','middle');
    var hit=el('rect',{x:L+band*i+4,y:T-10,width:band-8,height:H-T-B+10,fill:'transparent'},svg);
    hover(hit,function(){return [c[2]+' / 393 条会话（'+pct.toFixed(1)+'%）',['上下文窗口 '+fmt(c[1])+' token','能放下的单次请求占 '+c[3].toFixed(1)+'%']];});
  });
}
table('t-ctx',['上下文窗口（token）','能完整跑完的会话','占比','能放下的单次请求占比'],CTX.map(function(c){return [fmt(c[1]),c[2]+' / 393',(c[2]/393*100).toFixed(1)+'%',c[3].toFixed(1)+'%'];}),[1,1,1,1]);

/* ---------- 渲染与主题 ---------- */
function drawAll(){drawTimeline();drawLanes();drawSession();drawCtx();}
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
