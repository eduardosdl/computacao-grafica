const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const virtualWidth = 1600;
const virtualHeight = 1200;
const cameraWidth = 800;
const cameraHeight = 600;
let cameraX = virtualWidth / 2 - cameraWidth / 2;
let cameraY = virtualHeight / 2 - cameraHeight / 2;
const cameraSpeed = 5;
let animationRunning = true;
let lastTime = 0;
let lightEnabled = true;
const lightDirection = { x: 0.5, y: -0.5, z: 0.5 };
const lightColor = { r: 1.0, g: 1.0, b: 0.9 };
const lightIntensity = 1.0;
const ambientIntensity = 0.3;
let captureMode = false;
const toggleAnimationBtn = document.getElementById("toggleAnimation");
const resetCameraBtn = document.getElementById("resetCamera");
const toggleLightBtn = document.getElementById("toggleLight");
const captureModeBtn = document.getElementById("captureMode");
const captureMessage = document.getElementById("captureMessage");
const catPaw = document.getElementById("catPaw");

/**
 * Objeto representando o personagem Speedy Gonzales
 * @typedef {Object} SpeedyObject
 * @property {number} x - Posição X no espaço virtual
 * @property {number} y - Posição Y no espaço virtual
 * @property {number} width - Largura do personagem
 * @property {number} height - Altura do personagem
 * @property {number} speed - Velocidade de movimento
 * @property {number} direction - Direção atual em radianos
 * @property {number} rotation - Ângulo de rotação para transformação afim
 * @property {number} scale - Fator de escala para transformação afim
 * @property {string} color - Cor base do personagem
 * @property {number|null} targetX - Posição X do alvo
 * @property {number|null} targetY - Posição Y do alvo
 * @property {string} state - Estado atual do personagem
 * @property {boolean} captured - Indica se foi capturado
 * @property {number} captureTime - Tempo desde a captura
 */

/**
 * Objeto Speedy Gonzales com propriedades para animação e transformações afins
 * @type {SpeedyObject}
 */
const speedy = {
  x: virtualWidth / 2,
  y: virtualHeight / 2,
  width: 40,
  height: 60,
  speed: 5,
  direction: Math.random() * Math.PI * 2,
  rotation: 0,
  scale: 1,
  color: "#ffcc00",
  targetX: null,
  targetY: null,
  state: "running", // running, turning, captured
  captured: false,
  captureTime: 0,
};

/**
 * Array de obstáculos no cenário para criar variação visual e colisões
 * @type {Array<{x: number, y: number, width: number, height: number, color: string}>}
 */
const obstacles = [];
for (let i = 0; i < 15; i++) {
  obstacles.push({
    x: Math.random() * virtualWidth,
    y: Math.random() * virtualHeight,
    width: 40 + Math.random() * 80,
    height: 40 + Math.random() * 80,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
  });
}

/**
 * Array de elementos de fundo para criar sensação de profundidade visual
 * Utiliza efeito de paralaxe baseado na propriedade depth (z-buffer simplificado)
 * @type {Array<{x: number, y: number, size: number, color: string, depth: number}>}
 */
const backgroundElements = [];
for (let i = 0; i < 50; i++) {
  backgroundElements.push({
    x: Math.random() * virtualWidth,
    y: Math.random() * virtualHeight,
    size: 5 + Math.random() * 15,
    color: `hsla(${200 + Math.random() * 40}, 70%, ${
      40 + Math.random() * 30
    }%, 0.5)`,
    depth: 0.2 + Math.random() * 0.8, // Para efeito de paralaxe
  });
}

/**
 * Normaliza um vetor 3D para magnitude unitária
 * @param {{x: number, y: number, z: number}} v - Vetor a ser normalizado
 * @returns {{x: number, y: number, z: number}} Vetor normalizado com magnitude 1
 */
function normalizeVector(v) {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length > 0) {
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length,
    };
  }
  return { x: 0, y: 0, z: 0 };
}

/**
 * Calcula o produto escalar (dot product) entre dois vetores 3D
 * @param {{x: number, y: number, z: number}} v1 - Primeiro vetor
 * @param {{x: number, y: number, z: number}} v2 - Segundo vetor
 * @returns {number} Resultado do produto escalar
 */
function dotProduct(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * Aplica o modelo de iluminação local de Phong a uma cor base
 * Calcula componentes: ambiente, difusa (Lambert) e especular
 * @param {{r: number, g: number, b: number}} baseColor - Cor RGB base (valores 0-1)
 * @param {{x: number, y: number, z: number}} normal - Vetor normal da superfície
 * @param {{x: number, y: number, z: number}} viewDirection - Direção de visualização
 * @param {number} [shininess=32] - Fator de brilho para componente especular
 * @returns {{r: number, g: number, b: number}} Cor final após aplicar iluminação
 */
function applyPhongLighting(baseColor, normal, viewDirection, shininess = 32) {
  if (!lightEnabled) return baseColor;

  // Normalizar vetores
  const normalizedLightDir = normalizeVector(lightDirection);
  const normalizedNormal = normalizeVector(normal);
  const normalizedViewDir = normalizeVector(viewDirection);

  /**
   * Componente ambiente da iluminação Phong
   * Ia = ka * Iambiente
   */
  const ambient = {
    r: baseColor.r * ambientIntensity,
    g: baseColor.g * ambientIntensity,
    b: baseColor.b * ambientIntensity,
  };

  /**
   * Componente difusa da iluminação Phong (Lei de Lambert)
   * Id = kd * I * (N · L)
   */
  const diffuseFactor = Math.max(
    0,
    dotProduct(normalizedNormal, normalizedLightDir)
  );
  const diffuse = {
    r: baseColor.r * diffuseFactor * lightIntensity * lightColor.r,
    g: baseColor.g * diffuseFactor * lightIntensity * lightColor.g,
    b: baseColor.b * diffuseFactor * lightIntensity * lightColor.b,
  };

  /**
   * Componente especular da iluminação Phong (Blinn-Phong)
   * Is = ks * I * (R · V)^shininess
   */
  const reflectDir = {
    x: 2 * diffuseFactor * normalizedNormal.x - normalizedLightDir.x,
    y: 2 * diffuseFactor * normalizedNormal.y - normalizedLightDir.y,
    z: 2 * diffuseFactor * normalizedNormal.z - normalizedLightDir.z,
  };
  const specularFactor = Math.pow(
    Math.max(0, dotProduct(reflectDir, normalizedViewDir)),
    shininess
  );
  const specular = {
    r: lightColor.r * specularFactor * lightIntensity,
    g: lightColor.g * specularFactor * lightIntensity,
    b: lightColor.b * specularFactor * lightIntensity,
  };

  // Combinar componentes (I = Ia + Id + Is)
  const finalColor = {
    r: Math.min(1, ambient.r + diffuse.r + specular.r),
    g: Math.min(1, ambient.g + diffuse.g + specular.g),
    b: Math.min(1, ambient.b + diffuse.b + specular.b),
  };

  return finalColor;
}

/**
 * Converte cor RGB (valores 0-1) para formato hexadecimal
 * @param {{r: number, g: number, b: number}} rgb - Cor RGB normalizada
 * @returns {string} Cor no formato hexadecimal (#RRGGBB)
 */
function rgbToHex(rgb) {
  const r = Math.floor(rgb.r * 255);
  const g = Math.floor(rgb.g * 255);
  const b = Math.floor(rgb.b * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Renderiza o personagem Speedy Gonzales no canvas
 * Aplica transformações afins (translação, rotação, escala) e iluminação Phong
 * @returns {void}
 */
function drawSpeedy() {
  if (speedy.captured) return;

  ctx.save();

  // Aplicar transformações afins: Translação, Rotação, Escala
  ctx.translate(speedy.x - cameraX, speedy.y - cameraY);
  ctx.rotate(speedy.rotation);
  ctx.scale(speedy.scale, speedy.scale);

  // Cor base do Speedy
  const baseColor = { r: 1.0, g: 0.8, b: 0.0 }; // Amarelo
  const normal = { x: 0, y: 0, z: 1 }; // Normal apontando para frente (simplificado para 2D)
  const viewDirection = { x: 0, y: 0, z: 1 }; // Direção da visão (câmera olhando para Z+)

  // Aplicar iluminação
  const finalColor = applyPhongLighting(baseColor, normal, viewDirection);
  const colorHex = rgbToHex(finalColor);

  // Desenhar corpo do Speedy
  ctx.fillStyle = colorHex;
  ctx.fillRect(
    -speedy.width / 2,
    -speedy.height / 2,
    speedy.width,
    speedy.height
  );

  // Desenhar detalhes (olhos, chapéu, etc.)
  ctx.fillStyle = "white";
  ctx.fillRect(
    -speedy.width / 4,
    -speedy.height / 3,
    speedy.width / 4,
    speedy.height / 6
  );
  ctx.fillRect(
    speedy.width / 8,
    -speedy.height / 3,
    speedy.width / 4,
    speedy.height / 6
  );

  ctx.fillStyle = "black";
  ctx.fillRect(
    -speedy.width / 5,
    -speedy.height / 3,
    speedy.width / 8,
    speedy.height / 8
  );
  ctx.fillRect(
    speedy.width / 6,
    -speedy.height / 3,
    speedy.width / 8,
    speedy.height / 8
  );

  // Chapéu
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(
    -speedy.width / 2,
    -speedy.height / 2,
    speedy.width,
    speedy.height / 6
  );

  ctx.restore();
}

/**
 * Renderiza todos os obstáculos do cenário com iluminação aplicada
 * @returns {void}
 */
function drawObstacles() {
  obstacles.forEach((obstacle) => {
    ctx.save();

    // Converter cor HSL para RGB
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.fillStyle = obstacle.color;
    tempCtx.fillRect(0, 0, 1, 1);
    const rgbColor = tempCtx.getImageData(0, 0, 1, 1).data;
    const baseColor = {
      r: rgbColor[0] / 255,
      g: rgbColor[1] / 255,
      b: rgbColor[2] / 255,
    };

    // Aplicar iluminação
    const normal = { x: 0, y: 0, z: 1 };
    const viewDirection = { x: 0, y: 0, z: 1 };
    const finalColor = applyPhongLighting(baseColor, normal, viewDirection, 16);
    const colorHex = rgbToHex(finalColor);

    ctx.fillStyle = colorHex;
    ctx.fillRect(
      obstacle.x - cameraX,
      obstacle.y - cameraY,
      obstacle.width,
      obstacle.height
    );

    ctx.restore();
  });
}

/**
 * Desenha o fundo da cena com gradiente e elementos com efeito de paralaxe
 * Simula profundidade visual através de z-buffer simplificado
 * @returns {void}
 */
function drawBackground() {
  // Gradiente de fundo
  const gradient = ctx.createLinearGradient(0, 0, 0, cameraHeight);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(1, "#16213e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cameraWidth, cameraHeight);

  // Desenhar elementos de fundo com efeito de paralaxe
  backgroundElements.forEach((element) => {
    const parallaxX = (element.x - cameraX) * element.depth;
    const parallaxY = (element.y - cameraY) * element.depth;

    // Verificar se o elemento está dentro da vista da câmera
    if (
      parallaxX >= -element.size &&
      parallaxX <= cameraWidth + element.size &&
      parallaxY >= -element.size &&
      parallaxY <= cameraHeight + element.size
    ) {
      ctx.fillStyle = element.color;
      ctx.beginPath();
      ctx.arc(parallaxX, parallaxY, element.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * Atualiza a posição e estado do Speedy Gonzales
 * Implementa movimento autônomo com trajetórias variáveis e detecção de colisão
 * @param {number} deltaTime - Tempo decorrido desde o último frame em milissegundos
 * @returns {void}
 */
function updateSpeedy(deltaTime) {
  if (speedy.captured) {
    speedy.captureTime += deltaTime;
    if (speedy.captureTime > 3000) {
      // 3 segundos
      speedy.captured = false;
      speedy.captureTime = 0;
      captureMessage.style.display = "none";
    }
    return;
  }

  // Definir novo alvo se necessário
  if (
    speedy.targetX === null ||
    speedy.targetY === null ||
    Math.hypot(speedy.x - speedy.targetX, speedy.y - speedy.targetY) < 50
  ) {
    speedy.targetX = Math.random() * virtualWidth;
    speedy.targetY = Math.random() * virtualHeight;
  }

  // Calcular direção para o alvo
  const targetDirection = Math.atan2(
    speedy.targetY - speedy.y,
    speedy.targetX - speedy.x
  );

  // Suavizar a mudança de direção
  const angleDiff = targetDirection - speedy.direction;
  const normalizedAngleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
  speedy.direction += normalizedAngleDiff * 0.05;

  // Atualizar rotação para corresponder à direção
  speedy.rotation = speedy.direction;

  // Mover na direção atual
  speedy.x += Math.cos(speedy.direction) * speedy.speed;
  speedy.y += Math.sin(speedy.direction) * speedy.speed;

  // Manter dentro dos limites do espaço virtual
  speedy.x = Math.max(
    speedy.width / 2,
    Math.min(virtualWidth - speedy.width / 2, speedy.x)
  );
  speedy.y = Math.max(
    speedy.height / 2,
    Math.min(virtualHeight - speedy.height / 2, speedy.y)
  );

  // Verificar colisões com obstáculos (simplificado)
  obstacles.forEach((obstacle) => {
    if (
      Math.abs(speedy.x - (obstacle.x + obstacle.width / 2)) <
        speedy.width / 2 + obstacle.width / 2 &&
      Math.abs(speedy.y - (obstacle.y + obstacle.height / 2)) <
        speedy.height / 2 + obstacle.height / 2
    ) {
      // Mudar direção ao colidir
      speedy.direction +=
        Math.PI / 2 + ((Math.random() * Math.PI) / 2 - Math.PI / 4);
      speedy.targetX = null;
      speedy.targetY = null;
    }
  });

  // A câmera pode seguir o Speedy (opcional)
  // cameraX = speedy.x - cameraWidth / 2;
  // cameraY = speedy.y - cameraHeight / 2;
}

/**
 * Renderiza toda a cena (fundo, obstáculos e personagem)
 * Aplica projeção ortográfica baseada na posição da câmera
 * @returns {void}
 */
function drawScene() {
  // Limpar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenhar fundo
  drawBackground();

  // Desenhar obstáculos
  drawObstacles();

  // Desenhar Speedy Gonzales
  drawSpeedy();
}

/**
 * Loop principal de animação usando requestAnimationFrame
 * Gerencia o deltaTime e atualiza a cena continuamente
 * @param {number} timestamp - Timestamp fornecido por requestAnimationFrame
 * @returns {void}
 */
function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  if (animationRunning) {
    updateSpeedy(deltaTime);
    drawScene();
  }

  requestAnimationFrame(animate);
}

/**
 * Objeto para rastrear estado das teclas pressionadas
 * @type {Object<string, boolean>}
 */
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  keys[e.key.toLowerCase()] = true; // Para garantir que funcione com CapsLock
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
  keys[e.key.toLowerCase()] = false;
});

/**
 * Gerencia o movimento da câmera baseado nas teclas pressionadas
 * Suporta WASD e setas direcionais, mantendo a câmera dentro dos limites do mundo virtual
 * @returns {void}
 */
function handleCameraMovement() {
  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    cameraY = Math.max(0, cameraY - cameraSpeed);
  }
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    cameraY = Math.min(virtualHeight - cameraHeight, cameraY + cameraSpeed);
  }
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    cameraX = Math.max(0, cameraX - cameraSpeed);
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    cameraX = Math.min(virtualWidth - cameraWidth, cameraX + cameraSpeed);
  }
}

/**
 * Atualiza o movimento da câmera em intervalo fixo (60 FPS)
 */
setInterval(handleCameraMovement, 16);

// ==================== EVENT LISTENERS ====================

/**
 * Event listener para pausar/continuar animação
 */
toggleAnimationBtn.addEventListener("click", () => {
  animationRunning = !animationRunning;
  toggleAnimationBtn.textContent = animationRunning
    ? "Pausar Animação"
    : "Continuar Animação";
});

/**
 * Event listener para resetar posição da câmera
 */
resetCameraBtn.addEventListener("click", () => {
  cameraX = virtualWidth / 2 - cameraWidth / 2;
  cameraY = virtualHeight / 2 - cameraHeight / 2;
});

/**
 * Event listener para alternar iluminação Phong
 */
toggleLightBtn.addEventListener("click", () => {
  lightEnabled = !lightEnabled;
});

/**
 * Event listener para ativar/desativar modo captura
 */
captureModeBtn.addEventListener("click", () => {
  captureMode = !captureMode;
  captureModeBtn.textContent = captureMode
    ? "Sair do Modo Captura"
    : "Modo Captura";
  captureModeBtn.style.backgroundColor = captureMode ? "#aa4444" : "#4a4a8a";
});

/**
 * Event listener para capturar o Speedy ao clicar (Bonus Round)
 * Verifica se o clique foi dentro da área do personagem e ativa animação de captura
 */
canvas.addEventListener("click", (e) => {
  if (!captureMode || speedy.captured) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left + cameraX;
  const clickY = e.clientY - rect.top + cameraY;

  // Verificar se o clique foi no Speedy
  if (
    Math.abs(clickX - speedy.x) < speedy.width / 2 &&
    Math.abs(clickY - speedy.y) < speedy.height / 2
  ) {
    speedy.captured = true;
    captureMessage.style.display = "block";

    // Mostrar pata de gato (efeito visual de captura)
    catPaw.style.display = "block";
    catPaw.style.left = e.clientX - rect.left - 40 + "px";
    catPaw.style.top = e.clientY - rect.top - 40 + "px";

    setTimeout(() => {
      catPaw.style.display = "none";
    }, 1000);
  }
});

// ==================== INICIALIZAÇÃO ====================

/**
 * Inicia o loop principal de animação
 */
animate(0);
