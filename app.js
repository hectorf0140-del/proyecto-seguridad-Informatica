const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w342";

const grid = document.getElementById("grid");
const status = document.getElementById("status");
const searchInput = document.getElementById("searchInput");
const modalOverlay = document.getElementById("modalOverlay");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");
const googleBtn = document.getElementById("googleBtn");
const userChip = document.getElementById("userChip");
const userPic = document.getElementById("userPic");
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");

let movies = [];
let currentUser = null; // { name, picture, email }
let pendingMovie = null; // película que el usuario quería ver antes de loguearse

/* ---------- TMDB: catálogo real ---------- */
async function loadMovies(query) {
  status.textContent = "Cargando…";
  grid.innerHTML = "";
  const url = query
    ? `${TMDB_BASE}/search/movie?api_key=${CONFIG.TMDB_API_KEY}&language=es-ES&query=${encodeURIComponent(query)}`
    : `${TMDB_BASE}/movie/popular?api_key=${CONFIG.TMDB_API_KEY}&language=es-ES&page=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("TMDB respondió " + res.status);
    const data = await res.json();
    movies = data.results || [];
    renderGrid();
    status.textContent = movies.length ? "" : "Sin resultados.";
  } catch (err) {
    status.textContent = "No se pudo cargar el catálogo. Revisá tu TMDB_API_KEY en config.js.";
    console.error(err);
  }
}

function renderGrid() {
  grid.innerHTML = movies.map(m => `
    <article class="card" data-id="${m.id}">
      <div class="card__glow"></div>
      <img loading="lazy" src="${m.poster_path ? IMG_BASE + m.poster_path : 'https://placehold.co/342x513/16161C/8A8790?text=Sin+imagen'}" alt="${escapeHtml(m.title)}">
      <div class="card__meta">
        <p class="card__title">${escapeHtml(m.title)}</p>
        <p class="card__year">${(m.release_date || '').slice(0,4) || '—'}</p>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const movie = movies.find(m => m.id === Number(card.dataset.id));
      openMovie(movie);
    });
  });
}

function escapeHtml(str){
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

/* ---------- Modal: detalle o pedido de login ---------- */
function openMovie(movie) {
  if (!currentUser) {
    pendingMovie = movie;
    modalContent.innerHTML = `
      <span class="lock-badge">Contenido restringido</span>
      <img class="modal-poster" src="${movie.poster_path ? IMG_BASE + movie.poster_path : ''}" alt="">
      <h3>${escapeHtml(movie.title)}</h3>
      <p>Iniciá sesión con tu cuenta de Google para reproducir esta película.</p>
      <div id="modalGoogleBtn"></div>
    `;
    modalOverlay.classList.remove("hidden");
    google.accounts.id.renderButton(
      document.getElementById("modalGoogleBtn"),
      { theme: "filled_black", size: "large", text: "signin_with" }
    );
    return;
  }
  modalContent.innerHTML = `
    <img class="modal-poster" src="${movie.poster_path ? IMG_BASE + movie.poster_path : ''}" alt="">
    <h3>${escapeHtml(movie.title)}</h3>
    <p>${escapeHtml(movie.overview || "Sin sinopsis disponible.")}</p>
  `;
  modalOverlay.classList.remove("hidden");
}

modalClose.addEventListener("click", () => modalOverlay.classList.add("hidden"));
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) modalOverlay.classList.add("hidden"); });

/* ---------- Google Identity Services: login REAL ---------- */
function decodeJwt(token) {
  // Solo para leer nombre/foto en el cliente. La verificación de firma
  // debe hacerse en un backend si necesitás confiar en estos datos.
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
}

function handleCredentialResponse(response) {
  const payload = decodeJwt(response.credential);
  currentUser = { name: payload.name, picture: payload.picture, email: payload.email };
  showUserChip();
  modalOverlay.classList.add("hidden");
  if (pendingMovie) { openMovie(pendingMovie); pendingMovie = null; }
}

function showUserChip() {
  googleBtn.classList.add("hidden");
  userChip.classList.remove("hidden");
  userPic.src = currentUser.picture;
  userName.textContent = currentUser.name;
}

logoutBtn.addEventListener("click", () => {
  currentUser = null;
  google.accounts.id.disableAutoSelect();
  userChip.classList.add("hidden");
  googleBtn.classList.remove("hidden");
});

window.addEventListener("load", () => {
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(googleBtn, { theme: "filled_black", size: "medium", text: "signin_with" });

  loadMovies();
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadMovies(searchInput.value.trim()), 400);
});
