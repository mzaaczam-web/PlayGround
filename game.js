import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101b2c');
scene.fog = new THREE.FogExp2('#101b2c', 0.015);
const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0, 6, 12);
const clock = new THREE.Clock();
let world = new THREE.Group(); scene.add(world);
const dynamicWorld = new THREE.Group(); scene.add(dynamicWorld);
const hemi = new THREE.HemisphereLight('#bcd5ef', '#192130', 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffd6ae', 3.2); sun.position.set(-12, 24, 10); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -28; sun.shadow.camera.right = 28; sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28; scene.add(sun);
const fill = new THREE.PointLight('#4c9dce', 35, 40, 2); fill.position.set(4, 7, -4); scene.add(fill);

const mat = (color, roughness = .78, metalness = .05, emissive = null, intensity = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive: emissive || color, emissiveIntensity: intensity });
const mats = {
  ground: mat('#172331'), road: mat('#17202b'), sidewalk: mat('#36404a'), building: mat('#263445'), building2: mat('#303b4b'), window: new THREE.MeshStandardMaterial({ color: '#f1b878', emissive: '#ffb761', emissiveIntensity: 1.7, roughness: .4 }),
  hero: mat('#253c53', .54, .12), heroDark: mat('#111d2a', .64, .1), skin: mat('#d29a72'), hair: mat('#25202a'), gold: mat('#ffd58d', .28, .5, '#ffb64f', 1.4), cyan: mat('#84e9ff', .22, .2, '#4cd9ff', 2.8), enemy: mat('#211d36', .36, .34, '#8e3cff', 1.25), enemyEye: mat('#ff7a91', .25, .1, '#ff315e', 3), white: mat('#f3eee1', .4)
};

const state = { running:false, paused:false, stage:-1, health:100, hits:0, startTime:0, fireHeld:false, lastShot:0, lastDamage:0, keys:new Set(), player:null, playerParts:null, interact:null, enemies:[], collectibles:[], anchors:[], projectiles:[], decor:[], mobileVector:new THREE.Vector2(), touchStart:null, sound:false, stageComplete:false };
const chapters = [
  { name:'Una vida normal', index:'CAPÍTULO 01', date:'CINCO AÑOS ANTES', title:'Un día cualquiera', body:'Alex Ríos no era especial. Pagaba la renta, llegaba tarde al trabajo y guardaba los domingos para Inés. Hasta que una grieta en el cielo eligió su camino de regreso a casa.', quote:'A veces el universo te encuentra en el momento más común.', objective:'Llega a la estación de metro', label:'HUMANO', theme:0 },
  { name:'El primer destello', index:'CAPÍTULO 02', date:'LA NOCHE DEL DESPERTAR', title:'La luz también quema', body:'La grieta lo alcanzó. Alex sobrevivió, pero algo antiguo despertó en sus manos: energía capaz de cerrar los bordes rotos del mundo. El poder no vino con instrucciones.', quote:'No sabía qué podía hacer. Solo sabía a quién quería proteger.', objective:'Reúne los 3 fragmentos de luz', label:'DESPERTANDO', theme:1 },
  { name:'Aprender a volar', index:'CAPÍTULO 03', date:'MESES DESPUÉS', title:'El poder se aprende', body:'Con ayuda de una pequeña comunidad de héroes, Alex aprendió a controlar cada pulso. Falló, volvió a intentarlo y, por primera vez, dejó de tener miedo de sus propias manos.', quote:'El valor no era no caer. Era levantarse con más cuidado.', objective:'Cierra las 5 fisuras', label:'PORTADOR DE LUZ', theme:2 },
  { name:'Un lugar que llamar hogar', index:'CAPÍTULO 04', date:'DOCE AÑOS DESPUÉS', title:'Todo lo que importa', body:'Alex e Inés construyeron una vida. Su hija Luna llenó la casa de dibujos de estrellas y preguntas imposibles. Alex aprendió que ser héroe también era estar presente cuando se apagaban las luces.', quote:'Su mayor hazaña no tenía capa: era volver a casa.', objective:'Protege el vecindario', label:'GUARDIÁN', theme:3 },
  { name:'La última frontera', index:'CAPÍTULO 05', date:'EL FIN DE TODOS LOS MUNDOS', title:'La noche de mil cielos', body:'La amenaza se llamaba NÉMESIS: una conciencia que devoraba universos para silenciar el dolor. Alex y un grupo de héroes resistieron juntos, pero la última fisura solo podía cerrarse desde dentro.', quote:'Hay sacrificios que no son una despedida. Son una promesa.', objective:'Desactiva los 3 anclajes', label:'ÚLTIMO GUARDIÁN', theme:4 }
];

function resize(){ renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);

function showStory(stage){
  state.stage = stage;
  const chapter = chapters[stage];
  $('chapter-name').textContent = chapter.name;
  $('story-index').innerHTML = `${chapter.index} <span>—</span> ${chapter.date}`;
  $('story-title').textContent = chapter.title;
  $('story-body').textContent = chapter.body;
  $('story-quote').textContent = `“${chapter.quote}”`;
  $('continue-button').innerHTML='Continuar <span>↗</span>';
  $('story-screen').classList.remove('hidden');
  $('intro-screen').classList.add('hidden');
  $('ending-screen').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('mobile-controls').classList.add('hidden');
  $('interact-hint').classList.add('hidden');
  $('crosshair').classList.add('hidden');
}

$('start-button').addEventListener('click',()=>{ state.startTime=performance.now(); state.health=100; state.hits=0; showStory(0); });
$('continue-button').addEventListener('click',beginStage);
$('restart-button').addEventListener('click',()=>{ state.health=100;state.hits=0;state.startTime=performance.now();state.running=false;state.stage=-1;$('ending-screen').classList.add('hidden');$('intro-screen').classList.remove('hidden');$('chapter-name').textContent='Una vida normal';$('game-footer').style.display=''; });
$('resume-button').addEventListener('click',togglePause);
$('sound-button').addEventListener('click',()=>{state.sound=!state.sound;$('sound-button').style.color=state.sound?'#83e5ff':'#ffcf80';showToast(state.sound?'Audio ambiental activado':'Audio ambiental silenciado');});

function beginStage(){
  $('story-screen').classList.add('hidden');
  state.running=true;state.paused=false;state.stageComplete=false;
  $('hud').classList.remove('hidden');
  if(window.matchMedia('(pointer:coarse)').matches) $('mobile-controls').classList.remove('hidden');
  $('crosshair').classList.remove('hidden');
  buildStage(state.stage);
  $('chapter-name').textContent=chapters[state.stage].name;
  $('power-label').textContent=`· ${chapters[state.stage].label}`;
  $('objective-text').textContent=chapters[state.stage].objective;
  updateHUD();
  showBanner(`${chapters[state.stage].index}  /  ${chapters[state.stage].name.toUpperCase()}`);
}

function showBanner(text){const el=$('chapter-banner');el.textContent=text;el.classList.remove('hidden');requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.classList.add('hidden'),500);},2300);}
let toastTimer;
function showToast(text){const el=$('toast');el.textContent=text;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),1800);}
function updateHUD(){ $('health-fill').style.width=`${Math.max(0,state.health)}%`; $('progress-text').textContent=`0${state.stage+1} / 05`; $('progress-fill').style.width=`${(state.stage+1)*20}%`; }

function addMesh(parent,geometry,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function box(parent,w,h,d,material,x,y,z){return addMesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);}
function makeGround(){
  const ground=addMesh(world,new THREE.PlaneGeometry(150,150),mats.ground,0,-.12,0);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
  const road=addMesh(world,new THREE.PlaneGeometry(11,70),mats.road,0,-.08,-1);road.rotation.x=-Math.PI/2;
  const grid=new THREE.GridHelper(100,50,'#52657b','#293849');grid.position.y=-.065;grid.material.opacity=.2;grid.material.transparent=true;world.add(grid);
  for(let z=-30;z<33;z+=7){box(world,.12,.02,3.2,mat('#78818a'),0,-.045,z);}
  for(const x of [-6.4,6.4]){box(world,.35,.2,70,mats.sidewalk,x,-.01,-1);}
}
function building(x,z,w,h,d,index){
  const color=index%3===0?mats.building2:mats.building;const b=box(world,w,h,d,color,x,h/2-.05,z);b.castShadow=true;
  const rows=Math.floor(h/2.5),cols=Math.max(2,Math.floor(w/1.8));
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const wx=x-w/2+(c+.5)*w/cols, wy=1+r*2.15, wz=z-d/2-.012;
    if(wy<h-.3 && (c+r+index)%4!==0){const win=box(world,w/cols*.43,.9,.025,(c+r+index)%5===0?mats.window:mat('#33475b',.5,.1,'#426482',.3),wx,wy,wz);win.castShadow=false;}
  }
  box(world,w+.25,.22,d+.25,mat('#3c4653'),x,h-.12,z);
}
function addCity(){
  let seed=43;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let side of [-1,1]) for(let z=-26;z<27;z+=11){const x=side*(11+rand()*2.2);building(x,z,5+rand()*3,8+rand()*15,7+rand()*3,Math.floor(rand()*7));}
  for(const z of [-20,-10,2,13,24]) for(const side of [-1,1]){
    const x=side*7.7;const pole=addMesh(world,new THREE.CylinderGeometry(.055,.085,4,8),mat('#4b5663',.48,.5),x,2,z);pole.castShadow=true;
    const arm=box(world,.9,.09,.11,mat('#52606b',.4,.5),x-side*.36,3.88,z);arm.rotation.z=side*.16;
    const lamp=addMesh(world,new THREE.SphereGeometry(.15,10,8),mats.gold,x-side*.65,3.75,z);lamp.scale.set(1,.4,1);
    const light=new THREE.PointLight('#ffbb7a',5,9,2);light.position.set(x-side*.65,3.5,z);world.add(light);
  }
  for(let i=0;i<22;i++){let x=-50+i*4.8,z=-43-(i%3)*3,h=9+(i*17%19);box(world,3.8,h,3.5,mat(i%2?'#202d3f':'#253249'),x,h/2,z);}
}
function addCosmicStage(){
  const starGeo=new THREE.BufferGeometry(),pts=[];let s=2025;const rand=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  for(let i=0;i<330;i++)pts.push((rand()-.5)*95,3+rand()*32,(rand()-.5)*95);
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));world.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#b8d9ff',size:.11,transparent:true,opacity:.72})));
  if(state.stage===4){
    const ring1=new THREE.Mesh(new THREE.TorusGeometry(21,.045,8,150),new THREE.MeshBasicMaterial({color:'#8a4bff',transparent:true,opacity:.65}));ring1.rotation.x=Math.PI/2.35;ring1.position.y=8;world.add(ring1);
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(14,.035,8,130),new THREE.MeshBasicMaterial({color:'#ff6d9a',transparent:true,opacity:.52}));ring2.rotation.x=Math.PI/2.7;ring2.rotation.y=.6;ring2.position.y=12;world.add(ring2);
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const rock=addMesh(world,new THREE.IcosahedronGeometry(.4+(i%4)*.22,0),mat(i%2?'#3d3155':'#253b58',.7,.3),Math.cos(a)*(12+i%3*3),2+(i*7%14),Math.sin(a)*(12+i%3*3));rock.rotation.set(i,i*.7,i*.3);}
    const rift=new THREE.Mesh(new THREE.TorusGeometry(3.2,.12,12,64),new THREE.MeshBasicMaterial({color:'#ff647f',transparent:true,opacity:.9}));rift.position.set(0,5,-21);world.add(rift);rift.userData.spin=true;
  } else {
    addCity();
    if(state.stage===1){const crack=new THREE.Mesh(new THREE.TorusGeometry(3.1,.09,10,70),new THREE.MeshBasicMaterial({color:'#56dcff',transparent:true,opacity:.7}));crack.position.set(0,5,-18);crack.rotation.x=.25;world.add(crack);}
    if(state.stage===3){for(let z=-5;z<9;z+=9){const x=sideSign(z)*12;box(world,5,3.7,4,mat('#7b6560'),x,1.85,z);box(world,5.5,.25,4.5,mat('#343749'),x,3.85,z);box(world,.9,1.7,.12,mat('#b28b68'),x,.85,z-2.06);}}
  }
  addMesh(world,new THREE.SphereGeometry(3.8,24,16),mat(state.stage===4?'#784a9c':'#dfbda1',.8,.05,state.stage===4?'#77357f':'#dcab7b',.25),-20,25,-40).castShadow=false;
}
function sideSign(z){return z%2===0?1:-1;}

function makeHero(){
  const root=new THREE.Group();world.add(root);
  box(root,.72,.92,.4,mats.hero,0,1.3,0);
  box(root,.5,.16,.43,mat('#3c5870',.5,.1),0,1.47,-.02);
  box(root,.7,.13,.43,mat('#d2ad79',.45,.5),0,.91,0);
  addMesh(root,new THREE.CylinderGeometry(.13,.16,.22,10),mats.skin,0,1.81,0);
  const head=addMesh(root,new THREE.SphereGeometry(.28,18,14),mats.skin,0,2.1,0);head.scale.set(.84,1.08,.88);
  const hair=addMesh(root,new THREE.SphereGeometry(.285,16,10),mats.hair,0,2.24,.015);hair.scale.set(.88,.7,.92);
  box(root,.14,.065,.035,mat('#292832'),-.11,2.1,-.244);box(root,.14,.065,.035,mat('#292832'),.11,2.1,-.244);
  const legs=[];
  for(const x of [-.22,.22]){const pivot=new THREE.Group();pivot.position.set(x,.85,0);root.add(pivot);box(pivot,.27,.68,.3,mats.heroDark,0,-.31,0);box(pivot,.34,.18,.48,mat('#0d1722'),0,-.66,-.055);legs.push(pivot);}
  const arms=[];
  for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.43,1.68,0);root.add(pivot);const arm=addMesh(pivot,new THREE.CapsuleGeometry(.12,.48,4,8),mats.hero,0,-.27,0);arm.rotation.z=side*-.12;addMesh(pivot,new THREE.SphereGeometry(.13,12,10),mats.skin,0,-.58,-.01);arms.push(pivot);}
  const capeGeo=new THREE.BufferGeometry();capeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.24,1.66,.21,.24,1.66,.21,-.37,.35,.37,.37,.35,.37,0,.2,.4],3));capeGeo.setIndex([0,2,1,1,2,3,2,4,3]);capeGeo.computeVertexNormals();root.add(new THREE.Mesh(capeGeo,new THREE.MeshStandardMaterial({color:'#a74c58',side:THREE.DoubleSide,roughness:.72})));
  const aura=addMesh(root,new THREE.SphereGeometry(.19,12,10),mats.cyan,0,1.48,-.4);aura.visible=state.stage>0;
  const footGlow=addMesh(root,new THREE.CircleGeometry(.65,32),new THREE.MeshBasicMaterial({color:'#45dfff',transparent:true,opacity:.18,depthWrite:false}),0,.015,0);footGlow.rotation.x=-Math.PI/2;footGlow.visible=state.stage>0;
  state.playerParts={legs,arms,aura,footGlow};return root;
}
function addMarker(position,color='#ffcf80',label=''){
  const group=new THREE.Group();group.position.copy(position);dynamicWorld.add(group);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.045,10,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));ring.rotation.x=Math.PI/2;ring.position.y=.12;group.add(ring);
  addMesh(group,new THREE.OctahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2,metalness:.22,roughness:.2}),0,1.45,0);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.07,.28,2.5,12,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=1.35;group.add(beam);
  group.userData.float=true;group.userData.spin=true;state.decor.push(group);return {group,action:label};
}
function makeCollectible(pos,index){
  const group=new THREE.Group();group.position.copy(pos);dynamicWorld.add(group);
  const core=addMesh(group,new THREE.IcosahedronGeometry(.43,1),mats.cyan,0,1.1,0);core.userData.spin=true;
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.68,.025,8,32),new THREE.MeshBasicMaterial({color:'#b2f6ff',transparent:true,opacity:.8}));halo.rotation.x=Math.PI/2;halo.position.y=1.1;group.add(halo);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.04,.18,1.5,10,1,true),new THREE.MeshBasicMaterial({color:'#68e4ff',transparent:true,opacity:.14,side:THREE.DoubleSide}));stem.position.y=.78;group.add(stem);
  state.collectibles.push({group,index,taken:false});state.decor.push(group);
}
function makeEnemy(pos,boss=false){
  const group=new THREE.Group();group.position.copy(pos);dynamicWorld.add(group);const scale=boss?1.9:1;
  const core=addMesh(group,new THREE.IcosahedronGeometry(.58*scale,1),boss?mat('#391a3d',.25,.5,'#ff315e',1.8):mats.enemy,0,1.15*scale,0);core.userData.spin=true;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.82*scale,.055*scale,8,28),new THREE.MeshBasicMaterial({color:boss?'#ff466e':'#8c55ff',transparent:true,opacity:.88}));ring.position.y=1.15*scale;ring.rotation.x=.8;group.add(ring);
  addMesh(group,new THREE.SphereGeometry(.14*scale,12,10),mats.enemyEye,0,1.2*scale,-.51*scale);
  for(let i=0;i<3;i++){const spike=addMesh(group,new THREE.ConeGeometry(.12*scale,.6*scale,6),mats.enemy,Math.sin(i*2.1)*.52*scale,1.12*scale,Math.cos(i*2.1)*.52*scale);spike.rotation.z=Math.sin(i*2.1)*.55;}
  const shadow=addMesh(group,new THREE.CircleGeometry(.75*scale,20),new THREE.MeshBasicMaterial({color:'#00050b',transparent:true,opacity:.35,depthWrite:false}),0,.015,0);shadow.rotation.x=-Math.PI/2;
  const enemy={group,core,boss,hp:boss?8:1,maxHp:boss?8:1,dead:false,phase:Math.random()*5,damageCooldown:0};state.enemies.push(enemy);state.decor.push(group);return enemy;
}
function makeAnchor(pos,index){
  const group=new THREE.Group();group.position.copy(pos);dynamicWorld.add(group);
  addMesh(group,new THREE.CylinderGeometry(.85,1.1,1.3,8),mat('#31253f',.42,.5),0,.65,0);
  const crystal=addMesh(group,new THREE.OctahedronGeometry(.72,1),mat('#ef6c99',.25,.3,'#ff386d',1.5),0,1.85,0);crystal.userData.spin=true;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.18,.06,8,36),new THREE.MeshBasicMaterial({color:'#ff718e',transparent:true,opacity:.82}));ring.rotation.x=Math.PI/2;ring.position.y=.2;group.add(ring);
  const anchor={group,core:crystal,hp:1,maxHp:1,anchor:true,dead:false,index};state.anchors.push(anchor);state.decor.push(group);return anchor;
}
function buildStage(stage){
  scene.remove(world);world=new THREE.Group();scene.add(world);scene.remove(dynamicWorld);dynamicWorld.clear();scene.add(dynamicWorld);
  state.enemies=[];state.collectibles=[];state.anchors=[];state.projectiles=[];state.decor=[];state.interact=null;state.stageComplete=false;
  scene.background.set(stage===4?'#100d20':stage===3?'#1a1b29':'#101b2c');scene.fog.color.copy(scene.background);scene.fog.density=stage===4?.009:.015;
  sun.color.set(stage===4?'#d18bff':stage===3?'#ffc999':'#ffd6ae');sun.intensity=stage===4?2.1:3.2;fill.color.set(stage===4?'#af48ff':'#4c9dce');
  makeGround();addCosmicStage();state.player=makeHero();state.player.position.set(0,0,5);state.player.rotation.y=Math.PI;
  camera.position.set(0,5.4,13);camera.lookAt(0,1,0);
  if(stage===0)state.interact=addMarker(new THREE.Vector3(0,0,-16),'#ffcb83','Entra en la estación');
  if(stage===1){makeCollectible(new THREE.Vector3(-5,0,-5),0);makeCollectible(new THREE.Vector3(5,0,-12),1);makeCollectible(new THREE.Vector3(0,0,1),2);}
  if(stage===2){for(const p of [[-5,-10],[5,-14],[-3,1],[7,0],[1,-22]])makeEnemy(new THREE.Vector3(p[0],0,p[1]));}
  if(stage===3){for(const p of [[-7,-11],[7,-13],[-4,1],[5,4]])makeEnemy(new THREE.Vector3(p[0],0,p[1]));}
  if(stage===4){makeAnchor(new THREE.Vector3(-8,0,-12),0);makeAnchor(new THREE.Vector3(0,0,-21),1);makeAnchor(new THREE.Vector3(8,0,-12),2);}
  state.health=Math.min(100,state.health+22);updateHUD();
}
function completeStage(){if(state.stageComplete)return;state.stageComplete=true;state.running=false;if(state.stage<4){showStory(state.stage+1);return;}showSacrifice();}
function showSacrifice(){
  $('story-index').innerHTML='EPÍLOGO <span>—</span> LA ÚLTIMA ELECCIÓN';$('story-title').textContent='Un universo para todos';
  $('story-body').textContent='Los héroes contienen a Némesis mientras Alex cruza el umbral. Inés toma la mano de Luna. Él piensa en una mesa llena de dibujos, en una risa familiar y en cada mañana ordinaria que ahora sabe cuánto vale. Da un paso hacia la luz y cierra la grieta desde dentro.';
  $('story-quote').textContent='“Dile a Luna que las estrellas también son hogar.”';$('continue-button').innerHTML='Hacer el último salto <span>↗</span>';
  $('story-screen').classList.remove('hidden');$('hud').classList.add('hidden');$('mobile-controls').classList.add('hidden');$('crosshair').classList.add('hidden');
  const handler=()=>{$('continue-button').removeEventListener('click',handler);$('story-screen').classList.add('hidden');showEnding();};$('continue-button').addEventListener('click',handler);
}
function showEnding(){
  $('ending-copy').textContent='La grieta se cerró. Inés y Luna nunca supieron dónde terminaba el universo y empezaba su luz. Años después, una niña mira las estrellas y siente que alguien la cuida.';
  $('final-hits').textContent=state.hits;$('final-time').textContent=formatTime((performance.now()-state.startTime)/1000);
  $('ending-screen').classList.remove('hidden');$('game-footer').style.display='none';
}
function formatTime(seconds){const m=Math.floor(seconds/60),s=Math.floor(seconds%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function fire(){
  if(!state.running||state.paused||performance.now()-state.lastShot<360)return;
  const candidates=[...state.enemies.filter(e=>!e.dead),...state.anchors.filter(a=>!a.dead)].filter(t=>t.group.position.distanceTo(state.player.position)<38).sort((a,b)=>a.group.position.distanceTo(state.player.position)-b.group.position.distanceTo(state.player.position));
  if(!candidates.length){if(state.stage===0)showToast('La luz aún no ha despertado. Sigue el camino.');return;}
  const target=candidates[0];state.lastShot=performance.now();const start=state.player.position.clone().add(new THREE.Vector3(0,1.55,0));const orb=addMesh(dynamicWorld,new THREE.SphereGeometry(.15,12,10),mats.cyan,start.x,start.y,start.z);orb.add(new THREE.PointLight('#67e9ff',2,3));
  state.projectiles.push({mesh:orb,target,speed:22});state.playerParts.arms[1].rotation.x=-.8;setTimeout(()=>{if(state.playerParts)state.playerParts.arms[1].rotation.x=0;},120);
}
function hitTarget(target){
  if(!target||target.dead)return;target.hp--;state.hits++;target.group.scale.setScalar(1.08);setTimeout(()=>{if(target.group)target.group.scale.setScalar(1);},90);
  if(target.hp<=0){target.dead=true;dynamicWorld.remove(target.group);
    if(target.anchor){showToast(`Anclaje ${target.index+1} neutralizado`);const remain=state.anchors.filter(a=>!a.dead).length;$('objective-text').textContent=remain?`Desactiva los ${remain} anclajes restantes`:'Enfrenta a NÉMESIS';if(!remain){makeEnemy(new THREE.Vector3(0,0,-20),true);showToast('NÉMESIS ha cruzado la grieta');}}
    else showToast(target.boss?'NÉMESIS se desvanece.':'Fisura cerrada');
  }
  if(state.stage===1&&state.collectibles.every(c=>c.taken))completeStage();
  if((state.stage===2||state.stage===3)&&state.enemies.every(e=>e.dead))completeStage();
  if(state.stage===4&&state.anchors.every(a=>a.dead)&&state.enemies.length&&state.enemies.every(e=>e.dead)){state.interact=addMarker(new THREE.Vector3(0,0,-18),'#fff0ad','Cierra la grieta');$('objective-text').textContent='Entra en el corazón de la grieta';showToast('El núcleo está expuesto. Acércate y pulsa E o ENTER.');}
}
function interact(){
  if(!state.running||state.paused||!state.interact)return;
  if(state.player.position.distanceTo(state.interact.group.position)<5.2){state.interact=null;completeStage();}
  else showToast('Sigue la señal luminosa y acércate para interactuar.');
}
$('interact-hint').addEventListener('click',interact);
$('mobile-interact').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
function togglePause(){if(!state.running)return;state.paused=!state.paused;$('pause-overlay').classList.toggle('hidden',!state.paused);}
function doJump(){if(state.running&&!state.paused&&state.player.position.y<=.03)state.player.userData.vy=7.1;}
function onKeyDown(e){
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
  const key=e.key.toLowerCase();state.keys.add(key);
  if(key==='e'||key==='enter')interact();if(key==='f'||key===' ')state.fireHeld=true;if(key===' '&&state.running)doJump();
  if(key==='escape'||key==='p')togglePause();
}
function onKeyUp(e){state.keys.delete(e.key.toLowerCase());if(e.key===' '||e.key.toLowerCase()==='f')state.fireHeld=false;}
window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);
canvas.addEventListener('pointerdown',e=>{if(state.running&&e.button===0){state.fireHeld=true;canvas.setPointerCapture?.(e.pointerId);}});
canvas.addEventListener('pointerup',()=>state.fireHeld=false);canvas.addEventListener('pointercancel',()=>state.fireHeld=false);
const movePad=$('move-pad');
movePad.addEventListener('pointerdown',e=>{state.touchStart={x:e.clientX,y:e.clientY,id:e.pointerId};movePad.setPointerCapture(e.pointerId);});
movePad.addEventListener('pointermove',e=>{if(!state.touchStart||state.touchStart.id!==e.pointerId)return;const rect=movePad.getBoundingClientRect();const dx=(e.clientX-(rect.left+rect.width/2))/(rect.width*.36),dy=(e.clientY-(rect.top+rect.height/2))/(rect.height*.36);state.mobileVector.set(THREE.MathUtils.clamp(dx,-1,1),THREE.MathUtils.clamp(dy,-1,1));});
movePad.addEventListener('pointerup',()=>{state.touchStart=null;state.mobileVector.set(0,0);});movePad.addEventListener('pointercancel',()=>{state.touchStart=null;state.mobileVector.set(0,0);});
$('mobile-fire').addEventListener('pointerdown',e=>{e.preventDefault();state.fireHeld=true;});$('mobile-fire').addEventListener('pointerup',()=>state.fireHeld=false);$('mobile-fire').addEventListener('pointercancel',()=>state.fireHeld=false);$('mobile-jump').addEventListener('pointerdown',e=>{e.preventDefault();doJump();});

let walkClock=0;
function update(dt){
  if(!state.running||state.paused)return;
  const x=(state.keys.has('d')?1:0)-(state.keys.has('a')?1:0)+state.mobileVector.x;
  const z=(state.keys.has('s')?1:0)-(state.keys.has('w')?1:0)+state.mobileVector.y;
  const movement=new THREE.Vector3(x,0,z);if(movement.lengthSq()>1)movement.normalize();
  const moving=movement.lengthSq()>.002;
  if(moving){const speed=state.stage===0?4.7:5.4;state.player.position.addScaledVector(movement,speed*dt);state.player.rotation.y=Math.atan2(movement.x,-movement.z);walkClock+=dt*11;}
  state.player.position.x=THREE.MathUtils.clamp(state.player.position.x,-18,18);state.player.position.z=THREE.MathUtils.clamp(state.player.position.z,-31,30);
  state.player.userData.vy=(state.player.userData.vy||0)-18*dt;state.player.position.y=Math.max(0,state.player.position.y+state.player.userData.vy*dt);if(state.player.position.y===0)state.player.userData.vy=0;
  const swing=moving?Math.sin(walkClock)*.55:0;state.playerParts.legs[0].rotation.x=swing;state.playerParts.legs[1].rotation.x=-swing;state.playerParts.arms[0].rotation.x=-swing*.6;state.playerParts.arms[1].rotation.x=swing*.6;
  if(state.playerParts.aura){state.playerParts.aura.material=state.stage>0?mats.cyan:state.playerParts.aura.material;state.playerParts.aura.visible=state.stage>0;state.playerParts.footGlow.visible=state.stage>0;}
  const heading=state.player.rotation.y;const desired=new THREE.Vector3(state.player.position.x-Math.sin(heading)*8,state.player.position.y+5.2,state.player.position.z+Math.cos(heading)*8);
  camera.position.lerp(desired,1-Math.exp(-4.5*dt));camera.lookAt(state.player.position.x,state.player.position.y+1.15,state.player.position.z);
  const near=!!(state.interact&&state.player.position.distanceTo(state.interact.group.position)<5.2);
  $('interact-hint').classList.toggle('hidden',!near);
  $('mobile-interact').classList.toggle('interact-ready',near);
  $('mobile-interact').setAttribute('aria-label',near?`Interactuar: ${state.interact?.action||'objeto cercano'}`:'Acércate a la señal para interactuar');
  state.decor.forEach(o=>{if(!o||!o.parent)return;if(o.userData.float)o.position.y=Math.sin(clock.elapsedTime*2.2)*.12;if(o.userData.spin)o.rotation.y+=dt*1.25;});
  for(const item of state.collectibles){if(item.taken)continue;item.group.children[0].rotation.y+=dt*1.7;if(state.player.position.distanceTo(item.group.position)<1.8){item.taken=true;dynamicWorld.remove(item.group);const remaining=state.collectibles.filter(c=>!c.taken).length;$('objective-text').textContent=remaining?`Reúne los ${remaining} fragmentos restantes`:'Poder despertado';showToast(`Fragmento de luz ${item.index+1} / 3`);if(!remaining)completeStage();}}
  for(const enemy of state.enemies){if(enemy.dead)continue;enemy.phase+=dt;enemy.group.position.y=Math.sin(enemy.phase*2)*.14;
    const toward=state.player.position.clone().sub(enemy.group.position);toward.y=0;const dist=toward.length();if(dist>1.75){toward.normalize();enemy.group.position.addScaledVector(toward,(enemy.boss?1.15:.72)*dt);enemy.group.rotation.y=Math.atan2(toward.x,-toward.z);}
    if(dist<1.75&&performance.now()-state.lastDamage>850){state.lastDamage=performance.now();state.health=Math.max(0,state.health-(enemy.boss?12:7));updateHUD();$('damage-flash').style.boxShadow='inset 0 0 0 999px rgba(255,60,70,.14)';setTimeout(()=>$('damage-flash').style.boxShadow='inset 0 0 0 0 rgba(255,60,70,0)',130);if(state.health===0){state.health=60;state.player.position.set(0,0,5);updateHUD();showToast('La luz te devuelve al combate. No te rindas.');}}
  }
  for(let i=state.projectiles.length-1;i>=0;i--){const p=state.projectiles[i];if(!p.target||p.target.dead){dynamicWorld.remove(p.mesh);state.projectiles.splice(i,1);continue;}const aim=p.target.group.position.clone().add(new THREE.Vector3(0,p.target.boss?2.2:1.15,0));const delta=aim.sub(p.mesh.position);const distance=delta.length();if(distance<p.speed*dt+.45){hitTarget(p.target);dynamicWorld.remove(p.mesh);state.projectiles.splice(i,1);}else{p.mesh.position.addScaledVector(delta.normalize(),p.speed*dt);}}
  if(state.fireHeld)fire();
  if(state.stage===0&&state.interact&&state.player.position.distanceTo(state.interact.group.position)<5.2)$('objective-text').textContent='Pulsa E / ENTER para entrar';
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035);update(dt);renderer.render(scene,camera);}
animate();
