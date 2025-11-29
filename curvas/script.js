// ----------------------------------------------
// iniciação e configuração do canvas e elementos UI
// ----------------------------------------------
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const rect = () => canvas.getBoundingClientRect();

// UI elements
const tabBezier = document.getElementById("tab-bezier");
const tabSpline = document.getElementById("tab-spline");
const modeView = document.getElementById("modeView");
const stepRange = document.getElementById("step");
const stepVal = document.getElementById("stepVal");
const countLabel = document.getElementById("count");
const pointsList = document.getElementById("pointsList");
const selX = document.getElementById("selX");
const selY = document.getElementById("selY");
const selW = document.getElementById("selW");
const updatePt = document.getElementById("updatePt");
const removePt = document.getElementById("removePt");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const splinePanel = document.getElementById("splinePanel");
const bezierPanel = document.getElementById("bezierPanel");
const splineDegree = document.getElementById("splineDegree");
const degLabel = document.getElementById("degLabel");

// Controle de pontos {x,y,w}
let points = [];
let selectedIndex = null;
let dragging = { index: null, offsetX: 0, offsetY: 0 };
let mode = "bezier"; // or 'spline'
let step = parseFloat(stepRange.value);

// gerais
/**
 * Converte coordenadas de tela (cliente) para coordenadas do canvas.
 * @param {number} x - Coordenada X em pixels do evento (clientX).
 * @param {number} y - Coordenada Y em pixels do evento (clientY).
 * @returns {{x:number,y:number}} Ponto nas coordenadas internas do canvas.
 */
function screenToCanvas(x, y) {
  const r = rect();
  return {
    x: (x - r.left) * (canvas.width / r.width),
    y: (y - r.top) * (canvas.height / r.height),
  };
}

/**
 * Calcula a distância euclidiana entre dois pontos.
 * @param {{x:number,y:number}} a - Primeiro ponto.
 * @param {{x:number,y:number}} b - Segundo ponto.
 * @returns {number} Distância em pixels.
 */
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ----------------- desenho -----------------
/**
 * Limpa e redesenha toda a cena no canvas.
 * Desenha grade, polígono de controle, curva (Bézier ou B-spline) e pontos.
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  if (points.length > 0) {
    drawControlPolygon();
    if (mode === "bezier") drawBezier();
    else drawBSpline();
  }
  drawControlPoints();
}

/**
 * Desenha uma grade leve para referência visual no canvas.
 */
function drawGrid() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.02)";
  const step = 50;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Desenha o polígono de controle conectando os pontos atuais.
 */
function drawControlPolygon() {
  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(100,140,160,0.6)";
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Desenha os pontos de controle como círculos com índice ao lado.
 */
function drawControlPoints() {
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.fillStyle = i === selectedIndex ? "#06b6d4" : "#fff";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "10px sans-serif";
    ctx.fillText(i, p.x + 10, p.y + 4);
  });
}

// ----------------- Bézier (De Casteljau) -----------------
// Implementa Bézier racional via pesos: computa coordenadas ponderadas e depois divide
/**
 * Avalia uma curva Bézier racional usando o algoritmo de De Casteljau.
 * Cada ponto tem peso `w`; trabalha em coordenadas ponderadas e retorna cartesiano.
 * @param {{x:number,y:number,w:number}[]} ctrl - Pontos de controle com pesos.
 * @param {number} t - Parâmetro no intervalo [0,1].
 * @returns {{x:number,y:number}} Ponto avaliado na curva.
 */
function deCasteljauRational(ctrl, t) {
  // ctrl: [{x,y,w},...]
  let pts = ctrl.map((p) => ({ x: p.x * p.w, y: p.y * p.w, w: p.w }));
  const n = pts.length - 1;
  for (let r = 1; r <= n; r++) {
    for (let i = 0; i <= n - r; i++) {
      pts[i] = {
        x: (1 - t) * pts[i].x + t * pts[i + 1].x,
        y: (1 - t) * pts[i].y + t * pts[i + 1].y,
        w: (1 - t) * pts[i].w + t * pts[i + 1].w,
      };
    }
  }
  // back to cartesian
  const res = { x: pts[0].x / pts[0].w, y: pts[0].y / pts[0].w };
  return res;
}

/**
 * Desenha a curva Bézier (racional) atual com base em `points`.
 * Usa o passo `step` para amostragem de `t` em [0,1].
 */
function drawBezier() {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#06b6d4";
  ctx.beginPath();
  let first = true;
  for (let t = 0; t <= 1 + 1e-9; t += step) {
    const p = deCasteljauRational(points, t);
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

// ----------------- B-spline interpolation (uniform knots) -----------------
// Implementa avaliação de curva B-spline usando fórmula de Cox - de Boor
/**
 * Função base B-spline (Cox–de Boor).
 * @param {number} i - Índice da base.
 * @param {number} k - Grau da curva.
 * @param {number} t - Parâmetro.
 * @param {number[]} knot - Vetor de nós.
 * @returns {number} Valor da base N_{i,k}(t).
 */
function bsplineBasis(i, k, t, knot) {
  // i: índice da base, k: grau, t: parâmetro, knot: vetor de nós
  if (k === 0) {
    return knot[i] <= t && t < knot[i + 1] ? 1 : 0;
  }
  const denom1 = knot[i + k] - knot[i];
  const denom2 = knot[i + k + 1] - knot[i + 1];
  let term1 = 0,
    term2 = 0;
  if (denom1 !== 0)
    term1 = ((t - knot[i]) / denom1) * bsplineBasis(i, k - 1, t, knot);
  if (denom2 !== 0)
    term2 =
      ((knot[i + k + 1] - t) / denom2) * bsplineBasis(i + 1, k - 1, t, knot);
  return term1 + term2;
}

/**
 * Gera vetor de nós uniforme aberto com clamping.
 * @param {number} nCtrl - Número de pontos de controle.
 * @param {number} degree - Grau da B-spline.
 * @returns {number[]} Vetor de nós no intervalo [0,1].
 */
function uniformKnotVector(nCtrl, degree) {
  // vetor de nós uniforme aberto com clamping
  const n = nCtrl - 1;
  const m = n + degree + 1;
  const knot = [];
  for (let i = 0; i <= m; i++) {
    if (i <= degree) knot.push(0);
    else if (i >= m - degree) knot.push(1);
    else knot.push((i - degree) / (m - 2 * degree));
  }
  return knot;
}

/**
 * Avalia uma curva B-spline em `t`.
 * @param {{x:number,y:number}[]} ctrl - Pontos de controle.
 * @param {number} degree - Grau da curva.
 * @param {number} t - Parâmetro em [0,1].
 * @param {number[]} knot - Vetor de nós correspondente.
 * @returns {{x:number,y:number}} Ponto avaliado.
 */
function evalBSpline(ctrl, degree, t, knot) {
  const n = ctrl.length - 1;
  let x = 0,
    y = 0;
  for (let i = 0; i <= n; i++) {
    const b = bsplineBasis(i, degree, t, knot);
    x += b * ctrl[i].x;
    y += b * ctrl[i].y;
  }
  return { x, y };
}

/**
 * Desenha a B-spline atual com base em `points` e grau selecionado.
 * Usa `step` para amostragem de `t`.
 */
function drawBSpline() {
  if (points.length < 2) return;
  const degree = parseInt(splineDegree.value, 10);
  const knot = uniformKnotVector(points.length, degree);
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#f59e0b";
  ctx.beginPath();
  let first = true;
  // amostragem de t de 0 a 1 com passo definido
  for (let t = 0; t <= 1 + 1e-9; t += step) {
    const p = evalBSpline(points, degree, Math.min(t, 1), knot);
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

// ----------------- Interação -----------------
/**
 * Reconstrói a lista de pontos na UI e atualiza rótulos.
 */
function rebuildList() {
  pointsList.innerHTML = "";
  points.forEach((p, i) => {
    const item = document.createElement("div");
    item.className = "point-item";
    const left = document.createElement("div");
    left.innerHTML = `<strong>#${i}</strong> <span class='muted'>(${Math.round(
      p.x
    )}, ${Math.round(p.y)})</span>`;
    const right = document.createElement("div");
    right.innerHTML = `<div class='kvs'>w:${p.w.toFixed(
      2
    )} <button data-i='${i}' class='small btn' style='padding:4px'>Select</button></div>`;
    item.appendChild(left);
    item.appendChild(right);
    pointsList.appendChild(item);
  });
  countLabel.textContent = points.length;
  degLabel.textContent =
    points.length > 0 ? "Grau = " + (points.length - 1) : "Auto (n-1)";
}

/**
 * Define o ponto selecionado e sincroniza campos da UI.
 * @param {number|null} i - Índice do ponto ou null para limpar seleção.
 */
function setSelected(i) {
  selectedIndex = i == null ? null : i;
  if (selectedIndex != null) {
    selX.value = Math.round(points[i].x);
    selY.value = Math.round(points[i].y);
    selW.value = points[i].w;
  } else {
    selX.value = "";
    selY.value = "";
    selW.value = "1";
  }
  rebuildList();
  draw();
}

/**
 * Listener de mousedown no canvas: seleciona ponto existente ou cria novo.
 * @param {MouseEvent} ev
 */
// eventos no canva
canvas.addEventListener("mousedown", (ev) => {
  const c = screenToCanvas(ev.clientX, ev.clientY);
  // verifica se clicou em ponto existente
  for (let i = 0; i < points.length; i++) {
    if (distance(c, points[i]) <= 10) {
      // iniciando arraste
      dragging.index = i;
      dragging.offsetX = points[i].x - c.x;
      dragging.offsetY = points[i].y - c.y;
      setSelected(i);
      draw();
      return;
    }
  }
  // caso contrário, adiciona ponto
  points.push({ x: c.x, y: c.y, w: 1 });
  setSelected(points.length - 1);
  rebuildList();
  draw();
});

/**
 * Listener de movimento do mouse para arrastar pontos selecionados.
 * Atualiza posição do ponto e campos da UI durante o arraste.
 * @param {MouseEvent} ev
 */
window.addEventListener("mousemove", (ev) => {
  if (dragging.index == null) return;
  const c = screenToCanvas(ev.clientX, ev.clientY);
  points[dragging.index].x = c.x + dragging.offsetX;
  points[dragging.index].y = c.y + dragging.offsetY;
  // atualiza campos da UI
  if (selectedIndex === dragging.index) {
    selX.value = Math.round(points[dragging.index].x);
    selY.value = Math.round(points[dragging.index].y);
  }
  draw();
});

/**
 * Listener de término do arraste: limpa estado de `dragging`.
 */
window.addEventListener("mouseup", () => {
  dragging.index = null;
});

// manipula pontos via UI (editar/remover)
/**
 * Listener de clique na lista de pontos: seleciona item clicado.
 * @param {MouseEvent} ev
 */
pointsList.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;
  const i = Number(btn.dataset.i);
  setSelected(i);
});

/**
 * Atualiza o ponto selecionado com os valores de X, Y e peso da UI.
 */
updatePt.addEventListener("click", () => {
  if (selectedIndex == null) return;
  const x = Number(selX.value),
    y = Number(selY.value),
    w = Number(selW.value);
  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w)) {
    points[selectedIndex].x = x;
    points[selectedIndex].y = y;
    points[selectedIndex].w = Math.max(0.001, w);
    rebuildList();
    draw();
  }
});

/**
 * Remove o ponto atualmente selecionado.
 */
removePt.addEventListener("click", () => {
  if (selectedIndex == null) return;
  points.splice(selectedIndex, 1);
  selectedIndex = null;
  rebuildList();
  draw();
});

/**
 * Limpa todos os pontos e atualiza a UI.
 */
clearBtn.addEventListener("click", () => {
  points = [];
  selectedIndex = null;
  rebuildList();
  draw();
});

/**
 * Atualiza o passo de amostragem das curvas e redesenha.
 */
stepRange.addEventListener("input", () => {
  step = parseFloat(stepRange.value);
  stepVal.textContent = step.toFixed(3);
  draw();
});

/**
 * Exporta a configuração atual (modo, passo, grau, pontos) como JSON.
 */
exportBtn.addEventListener("click", () => {
  const data = {
    mode,
    step,
    degree: mode === "spline" ? Number(splineDegree.value) : points.length - 1,
    points,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "curva.json";
  a.click();
  URL.revokeObjectURL(url);
});

// tabs
/**
 * Alterna para modo Bézier e atualiza a UI.
 */
tabBezier.addEventListener("click", () => {
  mode = "bezier";
  tabBezier.classList.add("active");
  tabSpline.classList.remove("active");
  modeView.textContent = "Bézier";
  bezierPanel.hidden = false;
  splinePanel.hidden = true;
  draw();
});
/**
 * Alterna para modo B-spline e atualiza a UI.
 */
tabSpline.addEventListener("click", () => {
  mode = "spline";
  tabSpline.classList.add("active");
  tabBezier.classList.remove("active");
  modeView.textContent = "Spline (B-spline)";
  bezierPanel.hidden = true;
  splinePanel.hidden = false;
  draw();
});

// keyboard: excluir
/**
 * Listener de teclado: apaga ponto selecionado com Delete/Backspace.
 * @param {KeyboardEvent} ev
 */
window.addEventListener("keydown", (ev) => {
  if (ev.key === "Delete" || ev.key === "Backspace") {
    if (selectedIndex != null) {
      points.splice(selectedIndex, 1);
      selectedIndex = null;
      rebuildList();
      draw();
    }
  }
});

// redimensionamento canvas
/**
 * Redimensiona o canvas com alta fidelidade usando devicePixelRatio.
 * Mantido para referência; o app usa `resizeSimple` por simplicidade.
 */
function resize() {
  const r = rect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * ratio);
  canvas.height = Math.round(r.height * ratio);
  ctx.setTransform(
    r.width / canvas.width,
    0,
    0,
    r.height / canvas.height,
    0,
    0
  );
  // Alternativa: manter coordenadas de desenho no espaço de pixels definido acima; para simplificar, mantemos canvas.width/height padrão
}

// para evitar complexidade com transformações, definiremos a largura/altura do canvas em pixels CSS
/**
 * Redimensiona o canvas para corresponder ao retângulo de layout (CSS pixels).
 * Também força um redesenho.
 */
function resizeSimple() {
  const r = rect();
  canvas.width = Math.round(r.width);
  canvas.height = Math.round(r.height);
  draw();
}
window.addEventListener("resize", resizeSimple);
resizeSimple();

// pontos iniciais de demonstração
/**
 * Inicializa um conjunto de pontos de exemplo e redesenha.
 */
function seed() {
  const w = canvas.width,
    h = canvas.height;
  points = [
    { x: w * 0.2, y: h * 0.6, w: 1 },
    { x: w * 0.4, y: h * 0.2, w: 1 },
    { x: w * 0.6, y: h * 0.8, w: 1 },
    { x: w * 0.8, y: h * 0.3, w: 1 },
  ];
  rebuildList();
  draw();
}
seed();

// expõe algumas funções para avaliação / testes
window.__app = {
  /**
   * Retorna uma cópia dos pontos atuais.
   * @returns {{x:number,y:number,w:number}[]} Array de pontos.
   */
  getPoints: () => points.map((p) => ({ x: p.x, y: p.y, w: p.w })),
  /**
   * Define a lista de pontos e atualiza a UI.
   * @param {{x:number,y:number,w:number}[]} arr - Novo conjunto de pontos.
   */
  setPoints: (arr) => {
    points = arr.map((p) => ({ x: p.x, y: p.y, w: p.w }));
    rebuildList();
    draw();
  },
  /**
   * Avalia a curva Bézier racional atual em `t`.
   * @param {number} t - Parâmetro em [0,1].
   * @returns {{x:number,y:number}} Ponto avaliado.
   */
  computeBezierAt: (t) => deCasteljauRational(points, t),
  /**
   * Avalia a curva B-spline atual em `t` com grau `deg`.
   * @param {number} t - Parâmetro em [0,1].
   * @param {number} [deg=3] - Grau da B-spline.
   * @returns {{x:number,y:number}} Ponto avaliado.
   */
  computeBSplineAt: (t, deg = 3) => {
    return evalBSpline(points, deg, t, uniformKnotVector(points.length, deg));
  },
};
