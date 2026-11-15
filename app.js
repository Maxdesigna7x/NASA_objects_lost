'use strict';
const by = id => document.getElementById(id);
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const panel = by('panel'), body = by('body');
const keys = new Set();
const ship = {x:0,y:0,vx:0,vy:0,angle:0};
const camera = {x:0,y:0};
const images = Object.fromEntries([...Object.keys(objects),'colibri'].map(id => {
  const img = new Image();
  img.src = 'assets/' + id + '.webp';
  return [id,img];
}));
const storeKey = 'ruta-fantasma-v1';
const fresh = () => ({sector:0, found:[], inertial:false, mute:false});
let save = fresh();
try { const data = JSON.parse(localStorage.getItem(storeKey)); if (data && sectors[data.sector] && Array.isArray(data.found)) save = {...save,...data}; } catch {}
let zone, clock, gate, marked, scan, towing, joy, braking, heading, message, transition;
let ready, active = false, last = 0, accumulator = 0, audio;
const stars = Array.from({length:140}, (_,i) => [((i*173.23)%997)/997,((i*i*19.27)%991)/991,i%3]);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const persist = () => { try { localStorage.setItem(storeKey, JSON.stringify(save)); } catch {} };
const distance = (x,y) => Math.hypot(x-ship.x,y-ship.y);
const found = id => save.found.includes(id);
function sound(freq) {
  if (save.mute) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.frequency.value = freq;
    gain.gain.value = .055;
    gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.16);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime+.16);
  } catch {}
}
function say(text) {
  if (by('status').textContent !== text) by('status').textContent = text;
}
function clearInput() {
  keys.clear();
  joy = null;
  braking = false;
  by('stick').firstElementChild.style.transform = '';
}
function enter(index) {
  save.sector = index;
  zone = sectors[index];
  clock = gate = heading = 0;
  marked = zone.target;
  scan = towing = ready = transition = null;
  message = '';
  Object.assign(ship,{x:0,y:index===0?156:0,vx:0,vy:0,angle:0});
  Object.assign(camera,{x:ship.x,y:ship.y});
  by('zone').textContent = zone.name;
  clearInput();
  persist();
}
function contacts() {
  return [[zone.target,zone.point],[zone.extra,zone.extraPoint]].filter(([id])=>id).map(([id,[x,y]])=>{
    const orbit = zone.gravity === 0;
    return {id,x:x+(orbit?Math.sin(clock*.6)*55:0),y:y+(orbit?Math.cos(clock*.6)*31:0),
      vx:orbit?33*Math.cos(clock*.6):0,vy:orbit?-18.6*Math.sin(clock*.6):0};
  });
}
function dialog(title) {
  clearInput();
  by('title').textContent = title;
  body.replaceChildren();
  if (!panel.open) panel.showModal();
}
function button(label, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = fn;
  body.append(b);
  return b;
}
function paragraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  body.append(p);
}
function startMenu() {
  dialog('Ruta Fantasma');
  paragraph('Pilota Colibrí desde Zacatepec. Encuentra equipos reales, registra sus historias y salta de la Tierra a Marte.');
  by('close').hidden = true;
  button(save.sector ? 'Continuar expedición' : 'Iniciar expedición',()=>{ active=true; by('close').hidden=false; panel.close(); });
}
function pause() {
  dialog('Pausa');
  button('Continuar',()=>panel.close());
  button(save.inertial?'Vuelo inercial':'Vuelo asistido',()=>{save.inertial=!save.inertial; persist(); pause();});
  button(save.mute?'Activar sonido':'Silenciar',()=>{save.mute=!save.mute; persist(); pause();});
  button('Reiniciar zona',()=>{enter(save.sector); panel.close();});
  button('Reiniciar expedición',()=>{
    dialog('¿Reiniciar expedición?');
    paragraph('Se borrarán los hallazgos y volverás a la plataforma de despegue.');
    button('Reiniciar desde Zacatepec',()=>{save.found=[]; enter(0); panel.close();});
    button('Cancelar',pause);
  });
}
function map() {
  dialog('Mapa de navegación');
  paragraph('Ruta esquemática · posiciones y distancias de juego');
  if (!zone.target) {paragraph('Cruza los tres anillos de ascenso.');return;}
  const radar = document.createElement('canvas');
  radar.className = 'radar';
  radar.width = 420;
  radar.height = 220;
  radar.setAttribute('aria-label','Radar esquemático. La lista inferior ofrece los mismos contactos.');
  body.append(radar);
  const pen = radar.getContext('2d');
  pen.fillStyle = '#091329';
  pen.fillRect(0,0,420,220);
  pen.strokeStyle = '#3f6176';
  for (const radius of [42,85]) {
    pen.beginPath();
    pen.arc(210,110,radius,0,Math.PI*2);
    pen.stroke();
  }
  pen.fillStyle = '#7bffe1';
  pen.fillRect(206,106,8,8);
  for (const [i,c] of contacts().entries()) {
    const d = distance(c.x,c.y);
    if (d>650) continue;
    pen.fillStyle = '#d1c4ff';
    const x=210+(c.x-ship.x)*.13, y=110+(c.y-ship.y)*.13;
    pen.beginPath(); pen.arc(x,y,5,0,Math.PI*2); pen.fill();
    pen.font='14px system-ui';
    pen.fillText(String(i+1),x+8,y+5);
  }
  for (const [i,c] of contacts().entries()) {
    const d = distance(c.x,c.y);
    const name = d<=650 || found(c.id) ? objects[c.id][0] : 'Contacto fuera de alcance';
    button((i+1)+'. '+name+' · '+Math.round(d)+' u'+(found(c.id)?' · registrado':''),()=>{marked=c.id;panel.close();});
  }
  if (zone.jump) button('Marcar baliza',()=>{marked='jump';panel.close();});
  if (zone.back!==undefined) button('Regresar al sector anterior',()=>{if(!towing){enter(zone.back);panel.close();}}).disabled=Boolean(towing);
  if (found('sojourner')) button('Ver resumen',finish);
}
function archive() {
  dialog('Archivo de objetos');
  const select = document.createElement('select');
  select.setAttribute('aria-label','Filtrar por destino');
  for (const name of ['Todos','Tierra','Luna','Marte']) select.add(new Option(name));
  body.append(select);
  const list = document.createElement('div');
  body.append(list);
  function render() {
    list.replaceChildren();
    for (const [id,[name,region,desc,url,alt]] of Object.entries(objects)) {
      if (select.value!=='Todos' && select.value!==region) continue;
      const item = document.createElement('article');
      const img = document.createElement('img');
      img.src = images[id].src;
      img.alt = alt;
      const text = document.createElement('p');
      text.textContent = region+' · '+desc;
      const link = document.createElement('a');
      link.href=url;
      link.textContent='Fuente de la misión';
      const title = document.createElement('strong');
      title.textContent=name+(found(id)?' ✓':'');
      item.append(img,title,text,link);
      list.append(item);
    }
  }
  select.onchange=render;
  paragraph('Ilustraciones generadas con OpenAI ImageGen. ✓ indica un hallazgo de la expedición.');
  render();
}
function comic() {
  dialog('Historieta · Equipo espacial abandonado');
  const figure = document.createElement('figure');
  const img = new Image();
  img.src='historieta.webp';
  img.alt='Historieta de cuatro viñetas sobre la inspección de una nave.';
  figure.append(img);
  body.append(figure);
  for (const line of ['1. La tripulación encuentra una nave que ya no responde.','2. El panel solar convierte la luz en electricidad.','3. La antena transmite información.','4. El radiador ayuda a eliminar calor.']) paragraph(line);
}
function finish() {
  dialog('Expedición completada');
  paragraph('Colibrí ha registrado las visitas de la Tierra, la Luna y Marte. Hallazgos: '+save.found.length+' de 6.');
  button('Seguir explorando',()=>panel.close());
  button('Ver archivo',archive);
  button('Volver a órbita',()=>{enter(1);panel.close();});
  button('Volver a la Luna',()=>{enter(3);panel.close();});
}
function register(id) {
  if (!found(id)) save.found.push(id);
  persist();
  sound(660);
  message=objects[id][0]+' · registrado';
  if (id==='sojourner') finish();
}
function jump(index) {
  transition={index,time:0};
  clearInput();
  sound(430);
}
function act() {
  if (panel.open || !active || !ready || transition) return;
  if (ready.type==='scan' || ready.type==='attach') scan={id:ready.id,time:0,type:ready.type};
  if (ready.type==='deliver') { towing=null; register('envisat'); }
  if (ready.type==='jump') jump(ready.index);
}
function input() {
  if (joy) return joy;
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  const norm=Math.max(1,Math.hypot(x,y));
  return {x:x/norm,y:y/norm};
}
function step(dt) {
  if (transition) {
    transition.time+=dt;
    if(transition.time>=1.05) enter(transition.index);
    return;
  }
  clock+=dt;
  const list=contacts();
  const focus=list.find(c=>c.id===marked);
  const nearby=focus && distance(focus.x,focus.y)<195;
  const control=input();
  const brake=braking||keys.has(' ');
  const max=towing?322:430;
  if (brake) {
    const tx=nearby?focus.vx:0, ty=nearby?focus.vy:0;
    const dx=ship.vx-tx, dy=ship.vy-ty;
    const f=Math.min(1,780*dt/(Math.hypot(dx,dy)||1));
    ship.vx-=dx*f; ship.vy-=dy*f;
  } else {
    const thrust=towing?465:620;
    ship.vx+=control.x*thrust*dt;
    ship.vy+=(control.y*thrust+zone.gravity)*dt;
    if(zone.gravity===0 && !save.inertial) {
      const damping=Math.exp(-.45*dt);
      ship.vx*=damping; ship.vy*=damping;
    }
  }
  if(zone.gates && ship.y>-30 && !keys.size && !joy && !brake) ship.vx*=.9;
  const speed=Math.hypot(ship.vx,ship.vy);
  if(speed>max){ship.vx*=max/speed;ship.vy*=max/speed;}
  ship.x+=ship.vx*dt; ship.y+=ship.vy*dt;
  if(zone.ground!==undefined && ship.y>zone.ground-18){
    ship.y=zone.ground-18;
    if(ship.vy>220){ship.vy=-65; message='Contacto fuerte. Asciende y vuelve a intentarlo.';} else ship.vy=0;
    ship.vx*=.94;
  }
  if(Math.abs(ship.x)>1700||ship.y< -1700||ship.y>1400){
    if(zone.gates && gate){[ship.x,ship.y]=zone.gates[gate-1];ship.vx=ship.vy=0;}
    else enter(save.sector);
    message='De vuelta en el punto seguro.';
  }
  if(Math.hypot(control.x,control.y)>.05) heading=Math.atan2(control.x,-control.y);
  const turn=Math.atan2(Math.sin(heading-ship.angle),Math.cos(heading-ship.angle));
  ship.angle+=turn*(1-Math.exp(-15*dt));
  camera.x+=(ship.x+ship.vx*.15-camera.x)*(1-Math.exp(-5*dt));
  camera.y+=(ship.y+ship.vy*.13-camera.y)*(1-Math.exp(-5*dt));
  ready=null;
  let hint=message;
  if(zone.gates){
    const point=zone.gates[gate];
    if(point&&distance(...point)<112){
      gate++;
      sound(500+gate*60);
      if(gate===3) jump(1);
    }
    hint=gate<3?'Impulsa hacia el anillo '+(gate+1)+' de 3.':'Corte de motor · entrada en órbita';
  } else {
    for(const c of list){
      if(found(c.id)||towing) continue;
      const d=distance(c.x,c.y);
      const relative=Math.hypot(ship.vx-c.vx,ship.vy-c.vy);
      const capture=c.id==='envisat';
      const near=d<(capture?65:88) && (zone.gravity===0||ship.y<c.y-26);
      const valid=near && relative<(capture?40:65);
      if(c.id===marked || near){
        if(!hint||near) hint=valid?(capture?'Enganche listo':'Escaneo listo'):near?'Frena para igualar velocidad':d<=650?objects[c.id][0]+' · sigue la señal':'Sigue el rumbo aproximado';
      }
      if(valid) ready={id:c.id,type:capture?'attach':'scan'};
      if(scan?.id===c.id){
        if(!valid){scan=null;message='Acércate y reduce la velocidad para reintentar.';}
        else {
          scan.time+=dt;
          hint='Registrando… '+Math.floor(scan.time*100)+'%';
          if(scan.time>=1){
            if(capture){towing=c.id;marked='jump';sound(545);}
            else register(c.id);
            scan=null;
            ready=null;
          }
        }
      }
    }
    if(zone.jump && distance(...zone.jump)<135){
      if(towing){ready={type:'deliver'};hint='Entrega Envisat en la baliza de servicio.';}
      else if(found(zone.target)||(save.sector===2&&found('vanguard'))){
        ready={type:'jump',index:zone.next??zone.optional??zone.back};
        hint='Baliza lista. Selecciona el destino.';
      } else hint='Completa el objetivo principal para habilitar la baliza.';
    } else if(towing) hint='Remolca Envisat hasta la baliza de servicio.';
  }
  say(hint || 'Explora el sector y usa el mapa para fijar un contacto.');
  by('telemetry').textContent=Math.round(speed)+' u/s'+(nearby?' · velocidad relativa '+Math.round(Math.hypot(ship.vx-focus.vx,ship.vy-focus.vy))+' u/s':'');
  const label=ready?.type;
  by('act').textContent={attach:'Enganchar',deliver:'Entregar',jump:'Destinos'}[label]||'Escanear';
  by('act').disabled=!ready||Boolean(scan)||Boolean(transition);
}
function action() {
  if(ready?.type!=='jump'){act();return;}
  dialog('Destinos disponibles');
  for(const index of [zone.next,zone.optional,zone.back].filter(i=>i!==undefined)){
    button(sectors[index].name,()=>{panel.close();jump(index);});
  }
  if(save.sector===4||save.sector===5) button('Cerrar expedición',finish);
}
function ring(x,y,r,color,label) {
  ctx.strokeStyle=color;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  if(label){ctx.fillStyle=color;ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText(label,x,y-r-10);}
}
function sprite(id,x,y,size,angle=0) {
  const img=images[id];
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  if(img.complete&&img.naturalWidth){
    const factor=size/Math.max(img.naturalWidth,img.naturalHeight);
    const w=img.naturalWidth*factor,h=img.naturalHeight*factor;
    ctx.drawImage(img,-w/2,-h/2,w,h);
  } else {
    ctx.fillStyle=id==='colibri'?'#a8ffe4':'#f0ca79';
    ctx.beginPath();ctx.moveTo(0,-size/2);ctx.lineTo(size*.28,size*.35);ctx.lineTo(-size*.28,size*.35);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
function render() {
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(2,devicePixelRatio);
  if(!w||!h) return;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const gradient=ctx.createLinearGradient(0,0,0,h);
  gradient.addColorStop(0,'#070d22');gradient.addColorStop(1,zone.sky);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  for(const [sx,sy,r] of stars){
    const x=((sx*w-camera.x*.06)%w+w)%w,y=((sy*h-camera.y*.06)%h+h)%h;
    ctx.fillStyle=r===0?'#bfe1f8':'#647893';ctx.fillRect(x,y,r===0?2:1,r===0?2:1);
  }
  const scale=Math.min(1.2,Math.max(.48,Math.min(w/660,h/450)));
  const originX=w*.5-camera.x*scale,originY=h*.49-camera.y*scale;
  ctx.translate(originX,originY);ctx.scale(scale,scale);
  const left=-originX/scale,right=(w-originX)/scale,lower=(h-originY)/scale;
  if(zone.ground!==undefined){
    const tint=save.sector>=4?'#a35348':save.sector===3?'#697384':'#356d73';
    ctx.fillStyle=tint;ctx.beginPath();ctx.moveTo(left,zone.ground-48);
    for(let x=left;x<=right+35;x+=30)ctx.lineTo(x,zone.ground-43-60*Math.sin(x*.004)**2-30*Math.cos(x*.012)**2);
    ctx.lineTo(right,Math.max(lower,zone.ground));ctx.lineTo(left,Math.max(lower,zone.ground));ctx.fill();
    ctx.fillStyle=save.sector>=4?'#652e32':save.sector===3?'#333a50':'#193a4b';
    ctx.fillRect(left,zone.ground,right-left,Math.max(0,lower-zone.ground));
    for(let x=Math.floor(left/61)*61;x<right;x+=61){ctx.fillStyle=tint;ctx.fillRect(x,zone.ground+7+Math.abs(x%19),18,3);}
  } else {
    ctx.fillStyle='#103a59';ctx.beginPath();ctx.arc(50,1100,900,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle='#376e92';ctx.lineWidth=9;ctx.stroke();
  }
  if(zone.gates&&zone.gates[gate]) ring(...zone.gates[gate],103,'#82f4dd','Anillo '+(gate+1));
  if(zone.jump) ring(...zone.jump,107,'#e7bd79','Baliza');
  const list=contacts();
  for(const c of list){
    if(c.id===towing || c.id==='envisat'&&found(c.id)) continue;
    const angle=c.id==='envisat'&&!reduce.matches?clock*.37:0;
    sprite(c.id,c.x,c.y,c.id==='vanguard'?52:78,angle);
    if(distance(c.x,c.y)<650) ring(c.x,c.y,48,found(c.id)?'#7ff4cb':'#cfc6ff',objects[c.id][0]);
  }
  if(towing){
    ctx.strokeStyle='#ffd18d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(ship.x-55,ship.y+55);ctx.stroke();
    sprite(towing,ship.x-64,ship.y+64,73);
  }
  const u=input();
  if(Math.hypot(u.x,u.y)>.06 && !panel.open || braking || keys.has(' ')){
    ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);
    ctx.fillStyle='#f7b874';ctx.beginPath();ctx.moveTo(-8,15);ctx.lineTo(0,braking?31:40);ctx.lineTo(8,15);ctx.fill();ctx.restore();
  }
  if(!reduce.matches && Math.hypot(ship.vx,ship.vy)>35){
    ctx.strokeStyle='#82dfdca0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(ship.x-ship.vx*.18,ship.y-ship.vy*.18);ctx.stroke();
  }
  sprite('colibri',ship.x,ship.y,55,ship.angle);
  const focus=marked==='jump'&&zone.jump?{x:zone.jump[0],y:zone.jump[1]}:list.find(c=>c.id===marked);
  const gatePoint=zone.gates?.[gate];
  const target=gatePoint?{x:gatePoint[0],y:gatePoint[1]}:focus;
  if(target){
    const sx=originX+target.x*scale, sy=originY+target.y*scale;
    if(sx<55||sx>w-55||sy<75||sy>h-95){
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const x=Math.max(28,Math.min(w-28,sx)),y=Math.max(98,Math.min(h-110,sy));
      const arrow=Math.atan2(sy-h*.49,sx-w*.5);
      ctx.save();ctx.translate(x,y);ctx.rotate(arrow);ctx.fillStyle='#9bf8dc';ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-10,10);ctx.lineTo(-10,-10);ctx.closePath();ctx.fill();ctx.restore();
    }
  }
  if(transition){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='rgba(8,17,34,'+Math.min(1,transition.time*1.7)+')';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#b8ffe9';ctx.textAlign='center';ctx.font='bold 20px system-ui';ctx.fillText(save.sector===0?'Entrada en órbita':'Hiperpropulsión',w/2,h/2);
  }
}
function frame(now) {
  const elapsed=Math.min(.08,(now-last)/1000);
  last=now;
  if(active&&!panel.open&&!document.hidden){
    accumulator+=elapsed;
    while(accumulator>=1/60){step(1/60);accumulator-=1/60;}
  } else accumulator=0;
  render();
  requestAnimationFrame(frame);
}
const moveKeys=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ']);
addEventListener('keydown',e=>{
  if(panel.open||!active||e.altKey||e.ctrlKey||e.metaKey) return;
  const k=e.key.toLowerCase();
  if(k===' '&&e.target.closest?.('button,a')) return;
  if(moveKeys.has(k)){e.preventDefault(); keys.add(k);}
  if(!e.repeat){if(k==='e') action();if(k==='m') map();if(k==='escape') pause();}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',clearInput);
addEventListener('orientationchange',clearInput);
document.addEventListener('visibilitychange',clearInput);
panel.addEventListener('cancel',e=>{if(!active)e.preventDefault();});
by('close').onclick=()=>panel.close();
by('map').onclick=map;by('pause').onclick=pause;by('archive').onclick=archive;by('comic').onclick=comic;
by('act').onclick=action;
const stick=by('stick'), brakeButton=by('brake');
function moveStick(e) {
  const box=stick.getBoundingClientRect();
  const x=e.clientX-box.left-box.width/2,y=e.clientY-box.top-box.height/2;
  const magnitude=Math.hypot(x,y);
  const force=Math.max(0,Math.min(1,(magnitude/43-.12)/.88));
  joy={id:e.pointerId,x:x/(magnitude||1)*force,y:y/(magnitude||1)*force};
  stick.firstElementChild.style.transform='translate('+joy.x*32+'px,'+joy.y*32+'px)';
}
stick.onpointerdown=e=>{if(!joy){stick.setPointerCapture(e.pointerId);moveStick(e);}};
stick.onpointermove=e=>{if(joy?.id===e.pointerId)moveStick(e);};
for(const event of ['pointerup','pointercancel','lostpointercapture']){
  stick.addEventListener(event,e=>{if(joy?.id===e.pointerId){joy=null;stick.firstElementChild.style.transform='';}});
  brakeButton.addEventListener(event,()=>{braking=false;});
}
brakeButton.onpointerdown=e=>{brakeButton.setPointerCapture(e.pointerId);braking=true;};
if(location.pathname.split('/').includes('NASA_objects_lost')) by('catalog').hidden=true;
enter(save.sector);
startMenu();
requestAnimationFrame(frame);
