const app = document.getElementById('app');
const C = window.JL_CONFIG;
let current = null;
let lightboxIndex = 0;
let visiblePhotos = 20;
const PHOTOS_STEP = 20;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const photoPath = (c, photo, full = false) => {
  if (typeof photo === 'string') return `galerias/${c.id}/fotos/${photo}`;
  if (!photo) return '';
  return full ? (photo.full || photo.src || '') : (photo.src || photo.full || '');
};
const photoDownload = (c, photo) => {
  if (typeof photo === 'string') return photoPath(c, photo);
  return photo?.download || photoPath(c, photo, true);
};
const photoName = (photo, index) => typeof photo === 'string' ? photo : (photo?.name || `Foto ${index + 1}`);

function login(){
  app.innerHTML = `<main class="login"><div class="login-art"></div><div class="login-box"><div class="card"><div class="eyebrow">${esc(C.brand.subtitle)}</div><h1>Sua história,<br><i>guardada.</i></h1><p>Entre com o e-mail e a senha enviados pela JL Fotografia para acessar sua entrega exclusiva.</p><form id="loginForm"><div class="field"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div><div class="field"><label for="pass">Senha da galeria</label><input id="pass" type="password" autocomplete="current-password" required></div><div class="error" id="err"></div><button class="btn dark" type="submit" style="width:100%">Acessar minha galeria</button></form></div></div></main>`;
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const em = document.getElementById('email').value.trim().toLowerCase();
    const pw = document.getElementById('pass').value;
    const c = C.clients.find(x => x.email.toLowerCase() === em && x.password === pw);
    if(!c){ document.getElementById('err').textContent = 'E-mail ou senha não conferem.'; return; }
    sessionStorage.setItem('jl_client', c.id); show(c);
  });
}

function show(c){
  current = c;
  visiblePhotos = PHOTOS_STEP;
  const fav = JSON.parse(localStorage.getItem(`jl_fav_${c.id}`) || '[]');
  const photoCount = c.photos.length;
  app.innerHTML = `<header class="top"><div class="logo">${esc(C.brand.name)}<small>${esc(C.brand.subtitle)}</small></div><button class="btn" id="logout">Sair</button></header>
  <section class="hero" style="background-image:url('${esc(c.cover)}')"><div class="hero-content"><div class="eyebrow">${esc(c.type)} · ${esc(c.date)}</div><h1>${esc(c.title)}</h1><p>${esc(c.message)}</p></div></section>
  <div class="bar"><div><b>${photoCount} ${photoCount===1?'fotografia':'fotografias'}</b><span class="meta">${c.videos.length ? ` · ${c.videos.length} vídeo(s)` : ''}</span></div><div class="actions"><button class="btn dark" id="downloadAll">${c.zip || c.zipUrl ? '↓ Baixar galeria completa' : 'Abrir galeria completa no Drive'}</button></div></div>
  <section class="section" id="gallerySection"><div class="section-head"><div class="eyebrow">Sua galeria</div><h2>Momentos para sempre</h2><p>Toque em uma fotografia para ampliar. Você também pode favoritar ou baixar cada imagem individualmente.</p></div>${photoCount ? `<div class="grid" id="photoGrid"></div><div class="gallery-controls" id="galleryControls"></div>` : `<div class="empty">Nenhuma foto cadastrada nesta galeria.</div>`}</section>
  ${videos(c)}
  <footer class="footer">© ${new Date().getFullYear()} ${esc(C.brand.name)} · Feito para guardar histórias.</footer>
  <div class="lightbox" id="lightbox"><button class="lb-btn lb-close" id="lbClose">×</button><button class="lb-btn lb-prev" id="lbPrev">‹</button><img id="big" alt="Fotografia ampliada"><button class="lb-btn lb-next" id="lbNext">›</button></div>
  <div class="download-modal" id="feedbackModal"><div class="feedback-card"><button class="modal-x" id="feedbackClose">×</button><div class="eyebrow">Enquanto suas memórias chegam até você</div><h2>Seu download já começou. 🤎</h2><p>Enquanto a galeria é baixada, conta pra gente como foi sua experiência com a JL Fotografia?</p><div class="stars" id="stars">${[1,2,3,4,5].map(n=>`<button class="star" data-star="${n}" aria-label="${n} estrelas">★</button>`).join('')}</div><textarea class="feedback-text" id="feedbackText" placeholder="Escreva aqui seu feedback..."></textarea><button class="btn dark" id="sendFeedback" style="width:100%">Enviar pelo WhatsApp</button><p class="feedback-note">O download continua normalmente mesmo se você fechar esta janela.</p></div></div>
  <div class="toast" id="toast"></div>`;

  document.getElementById('logout').onclick = () => { sessionStorage.removeItem('jl_client'); login(); };
  document.getElementById('downloadAll').onclick = () => downloadAll(c);
  document.getElementById('playFilm')?.addEventListener('click',()=>{ const v=document.querySelector('.film-media video'); v?.play(); v?.scrollIntoView({behavior:'smooth',block:'center'}); });
  if(photoCount) renderPhotoBatch(c);
  document.getElementById('lbClose').onclick = closeLightbox;
  document.getElementById('lbPrev').onclick = () => moveLightbox(-1);
  document.getElementById('lbNext').onclick = () => moveLightbox(1);
  document.getElementById('feedbackClose').onclick = () => document.getElementById('feedbackModal').classList.remove('show');
  setupStars();
  document.getElementById('sendFeedback').onclick = () => sendFeedback(c);
}

function videos(c){
  if(!c.videos.length) return '';
  const v = c.videos[0];
  return `<section class="film-section"><div class="film-media"><video controls preload="metadata"><source src="${esc(v.file)}"></video></div><div class="film-copy"><div class="eyebrow">Seu filme</div><h2>Reviva esse momento.</h2><p>Um pedacinho desse dia para assistir com calma, sentir tudo de novo e guardar para sempre.</p><div class="film-actions"><button class="btn dark" id="playFilm">▶ Assistir ao filme</button><a class="btn soft" href="${esc(v.file)}" download>↓ Baixar vídeo</a></div></div></section>`;
}

function configurarAutoplayVideos() {
  const videos = document.querySelectorAll(".film-video video");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;

      if (entry.isIntersecting) {
        video.muted = true;

        video.play().catch(() => {
          console.log("Autoplay bloqueado pelo navegador.");
        });
      } else {
        video.pause();
      }
    });
  }, {
    threshold: 0.55
  });

  videos.forEach((video) => observer.observe(video));
}

function renderPhotoBatch(c){
  const grid = document.getElementById('photoGrid');
  const controls = document.getElementById('galleryControls');
  if(!grid || !controls) return;
  const fav = JSON.parse(localStorage.getItem(`jl_fav_${c.id}`) || '[]');
  const shown = c.photos.slice(0, visiblePhotos);
  grid.innerHTML = shown.map((photo,i)=>`<div class="photo"><img src="${photoPath(c,photo)}" alt="${esc(c.title)} — ${esc(photoName(photo,i))}" data-view="${i}" loading="lazy"><div class="photo-tools"><button class="round ${fav.includes(i)?'on':''}" data-fav="${i}" aria-label="Favoritar">♡</button><a class="round" href="${photoDownload(c,photo)}" target="_blank" rel="noopener" aria-label="Baixar foto">↓</a></div></div>`).join('');
  controls.innerHTML = `${visiblePhotos < c.photos.length ? `<button class="btn dark" id="loadMore">Ver mais fotos <span>+${Math.min(PHOTOS_STEP,c.photos.length-visiblePhotos)}</span></button>` : `<span class="all-seen">Você chegou ao final da galeria 🤎</span>`}<button class="btn soft" id="backTop">↑ Voltar ao topo</button>`;
  document.querySelectorAll('[data-view]').forEach(el => el.onclick = () => openLightbox(+el.dataset.view));
  document.querySelectorAll('[data-fav]').forEach(btn => btn.onclick = () => toggleFav(c,btn));
  document.getElementById('loadMore')?.addEventListener('click',()=>{ visiblePhotos=Math.min(visiblePhotos+PHOTOS_STEP,c.photos.length); renderPhotoBatch(c); });
  document.getElementById('backTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
}

function downloadAll(c){
  const target = c.zip || c.zipUrl || c.driveFolder;
  if(!target){ toast('Link da galeria não configurado.'); return; }
  if(c.zip || c.zipUrl){
    const a = document.createElement('a');
    a.href = target;
    a.download = `${c.title} - JL Fotografia.zip`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Download iniciado');
  } else {
    window.open(target, '_blank', 'noopener');
    toast('Abrindo a galeria completa no Google Drive');
  }
  setTimeout(() => document.getElementById('feedbackModal').classList.add('show'), 450);
}

function setupStars(){
  let rating = 0;
  const stars = [...document.querySelectorAll('.star')];
  stars.forEach(s => s.onclick = () => {
    rating = +s.dataset.star;
    document.getElementById('stars').dataset.rating = rating;
    stars.forEach(x => x.classList.toggle('active', +x.dataset.star <= rating));
  });
}

function sendFeedback(c){
  const rating = +(document.getElementById('stars').dataset.rating || 0);
  const feedback = document.getElementById('feedbackText').value.trim();
  if(!rating && !feedback){ toast('Escolha as estrelas ou escreva seu feedback 🤎'); return; }
  const stars = rating ? '⭐'.repeat(rating) : 'Não informada';
  const msg = `Olá, Lívia e José! 🤎\n\nAcabei de baixar minha galeria de ${c.type} — ${c.title}.\n\nMinha avaliação: ${stars}\n\nQueria deixar meu feedback:\n${feedback || 'Amei receber minhas fotos!'}\n\nObrigada(o) por registrarem esse momento! 🤎`;
  window.open(`https://wa.me/${C.brand.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}

function toggleFav(c,b){
  const i = +b.dataset.fav;
  let a = JSON.parse(localStorage.getItem(`jl_fav_${c.id}`) || '[]');
  a = a.includes(i) ? a.filter(n => n !== i) : [...a,i];
  localStorage.setItem(`jl_fav_${c.id}`, JSON.stringify(a));
  b.classList.toggle('on');
}
function openLightbox(i){ lightboxIndex=i; document.getElementById('big').src=photoPath(current,current.photos[i],true); document.getElementById('lightbox').classList.add('show'); }
function closeLightbox(){ document.getElementById('lightbox').classList.remove('show'); }
function moveLightbox(d){ if(!current.photos.length)return; lightboxIndex=(lightboxIndex+d+current.photos.length)%current.photos.length; document.getElementById('big').src=photoPath(current,current.photos[lightboxIndex],true); }
function toast(msg){ const t=document.getElementById('toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

document.addEventListener('keydown', e => { if(!document.getElementById('lightbox')?.classList.contains('show'))return; if(e.key==='Escape')closeLightbox(); if(e.key==='ArrowLeft')moveLightbox(-1); if(e.key==='ArrowRight')moveLightbox(1); });

const saved = sessionStorage.getItem('jl_client');
const found = C.clients.find(c => c.id === saved);
found ? show(found) : login();

configurarAutoplayVideos();