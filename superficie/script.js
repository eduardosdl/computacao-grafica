// ==================== MÓDULO 1: GERAÇÃO DE CURVAS 2D ====================

/**
 * Gerador de curvas 2D (Bézier e B-Spline).
 */
class CurveGenerator {
  constructor() {
    this.controlPoints = [];
  }

  /**
   * Calcula um ponto na curva de Bézier via algoritmo de De Casteljau.
   * @param {{x:number,y:number}[]} points - Pontos de controle em ordem.
   * @param {number} t - Parâmetro no intervalo [0,1].
   * @returns {{x:number,y:number}} Ponto interpolado na curva.
   */
  deCasteljau(points, t) {
    if (points.length === 1) return points[0];

    const newPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
      const x = (1 - t) * points[i].x + t * points[i + 1].x;
      const y = (1 - t) * points[i].y + t * points[i + 1].y;
      newPoints.push({ x, y });
    }

    return this.deCasteljau(newPoints, t);
  }

  /**
   * Gera uma curva de Bézier amostrada.
   * @param {{x:number,y:number}[]} controlPoints - Pontos de controle da Bézier.
   * @param {number} [resolution=50] - Quantidade de amostras ao longo da curva.
   * @returns {{x:number,y:number}[]} Lista de pontos da curva.
   */
  generateBezier(controlPoints, resolution = 50) {
    if (controlPoints.length < 2) {
      return [];
    }

    const curve = [];
    for (let i = 0; i <= resolution; i++) {
      const t = i / resolution;
      const point = this.deCasteljau(controlPoints, t);
      curve.push(point);
    }

    return curve;
  }

  /**
   * Avalia a função base B-Spline (Cox–de Boor).
   * @param {number} i - Índice da base.
   * @param {number} k - Grau atual (ordem-1).
   * @param {number} t - Parâmetro do domínio dos nós.
   * @param {number[]} knots - Vetor de nós não decrescente.
   * @returns {number} Valor da base N_{i,k}(t).
   */
  bSplineBasis(i, k, t, knots) {
    if (k === 0) {
      // Incluir o último ponto: usar <= no limite superior para o último intervalo
      if (i === knots.length - 2) {
        return t >= knots[i] && t <= knots[i + 1] ? 1.0 : 0.0;
      }
      return t >= knots[i] && t < knots[i + 1] ? 1.0 : 0.0;
    }

    let c1 = 0,
      c2 = 0;

    if (knots[i + k] !== knots[i]) {
      c1 =
        ((t - knots[i]) / (knots[i + k] - knots[i])) *
        this.bSplineBasis(i, k - 1, t, knots);
    }

    if (knots[i + k + 1] !== knots[i + 1]) {
      c2 =
        ((knots[i + k + 1] - t) / (knots[i + k + 1] - knots[i + 1])) *
        this.bSplineBasis(i + 1, k - 1, t, knots);
    }

    return c1 + c2;
  }

  // Gera vetor de nós uniforme
  /**
   * Gera vetor de nós uniforme aberto para B-Spline.
   * @param {number} n - Número de pontos de controle.
   * @param {number} degree - Grau da B-Spline.
   * @returns {number[]} Vetor de nós.
   */
  generateKnotVector(n, degree) {
    const knots = [];
    const m = n + degree + 1;

    for (let i = 0; i < m; i++) {
      if (i < degree + 1) {
        knots.push(0);
      } else if (i >= n) {
        knots.push(n - degree);
      } else {
        knots.push(i - degree);
      }
    }

    return knots;
  }

  // Gera curva B-Spline
  /**
   * Gera uma curva B-Spline amostrada.
   * @param {{x:number,y:number}[]} controlPoints - Pontos de controle.
   * @param {number} [degree=3] - Grau da curva (k).
   * @param {number} [resolution=50] - Quantidade de amostras ao longo da curva.
   * @returns {{x:number,y:number}[]} Lista de pontos da curva.
   */
  generateBSpline(controlPoints, degree = 3, resolution = 50) {
    if (controlPoints.length < degree + 1) {
      return [];
    }
    const n = controlPoints.length;
    const knots = this.generateKnotVector(n, degree);
    const curve = [];
    // Intervalo válido: [knots[degree], knots[n]]
    const minKnot = knots[degree];
    const maxKnot = knots[n];

    for (let i = 0; i <= resolution; i++) {
      const t = minKnot + (i / resolution) * (maxKnot - minKnot);
      let x = 0,
        y = 0,
        sumBasis = 0;
      for (let j = 0; j < n; j++) {
        const basis = this.bSplineBasis(j, degree, t, knots);
        sumBasis += basis;
        x += basis * controlPoints[j].x;
        y += basis * controlPoints[j].y;
      }
      // Só adiciona se a soma das bases for significativa
      if (isFinite(x) && isFinite(y) && sumBasis > 1e-6) {
        curve.push({ x, y });
      }
    }
    return curve;
  }

  // Interface unificada
  /**
   * Interface unificada para gerar curvas Bézier ou B-Spline.
   * @param {{x:number,y:number}[]} controlPoints - Pontos de controle.
   * @param {"bezier"|"bspline"} [type="bezier"] - Tipo de curva a gerar.
   * @param {number} [degree=3] - Grau (aplicado a B-Spline).
   * @param {number} [resolution=50] - Amostras da curva.
   * @returns {{x:number,y:number}[]} Pontos amostrados da curva.
   */
  generateCurve(controlPoints, type = "bezier", degree = 3, resolution = 50) {
    if (type === "bezier") {
      return this.generateBezier(controlPoints, resolution);
    } else if (type === "bspline") {
      return this.generateBSpline(controlPoints, degree, resolution);
    }

    return [];
  }
}

// ==================== MÓDULO 2: SUPERFÍCIE DE REVOLUÇÃO ====================

/**
 * Geração e exportação de malhas de superfícies de revolução.
 */
class RevolutionSurface {
  constructor() {
    this.vertices = [];
    this.normals = [];
    this.faces = [];
  }

  // Gera superfície de revolução
  /**
   * Gera a malha da superfície de revolução a partir de um perfil 2D.
   * @param {{x:number,y:number}[]} profile - Perfil 2D no plano (x,y) já normalizado.
   * @param {"x"|"y"|"z"} [axis="y"] - Eixo de revolução.
   * @param {number} [angle=360] - Ângulo total de revolução em graus.
   * @param {number} [subdivisions=32] - Subdivisões angulares.
   * @returns {void}
   */
  generate(profile, axis = "y", angle = 360, subdivisions = 32) {
    if (profile.length < 2) {
      return;
    }

    this.vertices = [];
    this.normals = [];
    this.faces = [];

    const angleRad = (angle * Math.PI) / 180;
    const angleStep = angleRad / subdivisions;

    // Gera vértices
    for (let i = 0; i <= subdivisions; i++) {
      const theta = i * angleStep;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      for (let j = 0; j < profile.length; j++) {
        const point = profile[j];
        let x, y, z;

        // Rotação ao redor do eixo especificado
        if (axis === "y") {
          const r = point.x;
          x = r * cosTheta;
          y = point.y;
          z = r * sinTheta;
        } else if (axis === "x") {
          const r = point.y;
          x = point.x;
          y = r * cosTheta;
          z = r * sinTheta;
        } else {
          // z
          const r = point.x;
          x = r * cosTheta;
          y = r * sinTheta;
          z = point.y;
        }

        this.vertices.push({ x, y, z });
      }
    }

    // Gera faces (triângulos)
    const pointsPerRing = profile.length;
    for (let i = 0; i < subdivisions; i++) {
      for (let j = 0; j < pointsPerRing - 1; j++) {
        const a = i * pointsPerRing + j;
        const b = a + pointsPerRing;
        const c = a + 1;
        const d = b + 1;

        this.faces.push([a, b, c]);
        this.faces.push([b, d, c]);
      }
    }

    this.calculateNormals();
  }

  // Calcula normais para iluminação
  /**
   * Calcula normais por vértice a partir das faces triangulares.
   * @returns {void}
   */
  calculateNormals() {
    this.normals = new Array(this.vertices.length)
      .fill(null)
      .map(() => ({ x: 0, y: 0, z: 0 }));

    // Para cada face, calcula a normal e adiciona aos vértices
    for (const face of this.faces) {
      const v0 = this.vertices[face[0]];
      const v1 = this.vertices[face[1]];
      const v2 = this.vertices[face[2]];

      // Vetores da face
      const u = {
        x: v1.x - v0.x,
        y: v1.y - v0.y,
        z: v1.z - v0.z,
      };
      const v = {
        x: v2.x - v0.x,
        y: v2.y - v0.y,
        z: v2.z - v0.z,
      };

      // Produto vetorial
      const normal = {
        x: u.y * v.z - u.z * v.y,
        y: u.z * v.x - u.x * v.z,
        z: u.x * v.y - u.y * v.x,
      };

      // Adiciona às normais dos vértices
      for (const idx of face) {
        this.normals[idx].x += normal.x;
        this.normals[idx].y += normal.y;
        this.normals[idx].z += normal.z;
      }
    }

    // Normaliza
    for (let i = 0; i < this.normals.length; i++) {
      const n = this.normals[i];
      const length = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      if (length > 0) {
        n.x /= length;
        n.y /= length;
        n.z /= length;
      }
    }
  }

  // Exporta para formato OBJ
  /**
   * Exporta a malha em formato OBJ (ASCII).
   * @returns {string} Conteúdo do arquivo OBJ.
   */
  exportOBJ() {
    let obj = "# Surface of Revolution\n";
    obj += `# Vertices: ${this.vertices.length}\n`;
    obj += `# Faces: ${this.faces.length}\n\n`;

    // Vértices
    for (const v of this.vertices) {
      obj += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
    }

    obj += "\n";

    // Normais
    for (const n of this.normals) {
      obj += `vn ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}\n`;
    }

    obj += "\n";

    // Faces (OBJ usa índice 1-based)
    for (const f of this.faces) {
      obj += `f ${f[0] + 1}//${f[0] + 1} ${f[1] + 1}//${f[1] + 1} ${
        f[2] + 1
      }//${f[2] + 1}\n`;
    }

    return obj;
  }

  // Exporta para formato STL (ASCII)
  /**
   * Exporta a malha em formato STL ASCII.
   * @returns {string} Conteúdo do arquivo STL.
   */
  exportSTL() {
    let stl = "solid RevolutionSurface\n";

    for (const face of this.faces) {
      const v0 = this.vertices[face[0]];
      const v1 = this.vertices[face[1]];
      const v2 = this.vertices[face[2]];

      // Calcula normal da face
      const u = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const v = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
      const n = {
        x: u.y * v.z - u.z * v.y,
        y: u.z * v.x - u.x * v.z,
        z: u.x * v.y - u.y * v.x,
      };
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      if (len > 0) {
        n.x /= len;
        n.y /= len;
        n.z /= len;
      }

      stl += `  facet normal ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(
        6
      )}\n`;
      stl += "    outer loop\n";
      stl += `      vertex ${v0.x.toFixed(6)} ${v0.y.toFixed(6)} ${v0.z.toFixed(
        6
      )}\n`;
      stl += `      vertex ${v1.x.toFixed(6)} ${v1.y.toFixed(6)} ${v1.z.toFixed(
        6
      )}\n`;
      stl += `      vertex ${v2.x.toFixed(6)} ${v2.y.toFixed(6)} ${v2.z.toFixed(
        6
      )}\n`;
      stl += "    endloop\n";
      stl += "  endfacet\n";
    }

    stl += "endsolid RevolutionSurface\n";
    return stl;
  }
}

// ==================== MÓDULO 3: VISUALIZAÇÃO E INTERAÇÃO ====================

/**
 * Visualização e interação: canvas 2D (perfil) e cena 3D (Three.js).
 */
class Visualization {
  constructor() {
    try {
      this.initCanvas2D();
      this.initCanvas3D();
      this.curveGen = new CurveGenerator();
      this.surface = new RevolutionSurface();
      this.controlPoints = [];
      this.selectedPoint = null;
      this.curve = [];
      this.mesh = null;

      this.setupEventListeners();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Inicializa o canvas 2D para edição de perfil.
   * @returns {void}
   */
  initCanvas2D() {
    this.canvas2D = document.getElementById("canvas2D");
    if (!this.canvas2D) {
      return;
    }
    this.ctx = this.canvas2D.getContext("2d");
    this.canvas2D.width = this.canvas2D.offsetWidth;
    this.canvas2D.height = this.canvas2D.offsetHeight;
  }

  /**
   * Inicializa a cena 3D (Three.js), câmera, renderer, luzes e controles.
   * @returns {void}
   */
  initCanvas3D() {
    this.canvas3D = document.getElementById("canvas3D");
    if (!this.canvas3D) {
      return;
    }
    const width = this.canvas3D.offsetWidth;
    const height = this.canvas3D.offsetHeight;

    try {
      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1a1a2e);

      // Camera
      this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      this.camera.position.set(5, 3, 5);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas3D,
        antialias: true,
      });
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;

      // Controls

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight1.position.set(5, 10, 5);
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      dirLight2.position.set(-5, 5, -5);
      this.scene.add(dirLight2);

      // Eixos
      this.axesHelper = new THREE.AxesHelper(3);
      this.scene.add(this.axesHelper);

      // Grid
      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
      this.scene.add(gridHelper);

      // Animação
      this.animate();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Registra os listeners de UI e interação de mouse/resize.
   * @returns {void}
   */
  setupEventListeners() {
    try {
      // Canvas 2D - Interação com pontos
      this.canvas2D.addEventListener("mousedown", (e) => {
        this.onCanvas2DMouseDown(e);
      });
      this.canvas2D.addEventListener("mousemove", (e) =>
        this.onCanvas2DMouseMove(e)
      );
      this.canvas2D.addEventListener("mouseup", (e) =>
        this.onCanvas2DMouseUp(e)
      );

      // Controles
      document
        .getElementById("curveType")
        .addEventListener("change", () => this.updateCurve());
      document.getElementById("degree").addEventListener("input", (e) => {
        document.getElementById("degreeValue").textContent = e.target.value;
        this.updateCurve();
      });
      document
        .getElementById("curveResolution")
        .addEventListener("input", (e) => {
          document.getElementById("resolutionValue").textContent =
            e.target.value;
          this.updateCurve();
        });
      document
        .getElementById("revolutionAngle")
        .addEventListener("input", (e) => {
          document.getElementById("angleValue").textContent =
            e.target.value + "°";
        });
      document
        .getElementById("angularSubdivisions")
        .addEventListener("input", (e) => {
          document.getElementById("subdivisionsValue").textContent =
            e.target.value;
        });

      document
        .getElementById("clearPoints")
        .addEventListener("click", () => this.clearPoints());

      document
        .getElementById("generateSurface")
        .addEventListener("click", () => this.generateSurface());

      // Modos de visualização
      document
        .getElementById("modeWireframe")
        .addEventListener("click", () => this.setRenderMode("wireframe"));
      document
        .getElementById("modeSolid")
        .addEventListener("click", () => this.setRenderMode("solid"));
      document
        .getElementById("modeSmooth")
        .addEventListener("click", () => this.setRenderMode("smooth"));

      document
        .getElementById("showWireframe")
        .addEventListener("change", (e) => {
          if (this.mesh) this.mesh.material.wireframe = e.target.checked;
        });
      document.getElementById("showAxis").addEventListener("change", (e) => {
        this.axesHelper.visible = e.target.checked;
      });
      document.getElementById("autoRotate").addEventListener("change", (e) => {
        this.controls.autoRotate = e.target.checked;
      });

      // Exportação
      document
        .getElementById("exportOBJ")
        .addEventListener("click", () => this.exportFile("obj"));
      document
        .getElementById("exportSTL")
        .addEventListener("click", () => this.exportFile("stl"));
      document
        .getElementById("exportJSON")
        .addEventListener("click", () => this.exportFile("json"));

      // Resize
      window.addEventListener("resize", () => this.onResize());
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Trata clique no canvas 2D: seleção ou criação de ponto.
   * @param {MouseEvent} e - Evento do mouse.
   * @returns {void}
   */
  onCanvas2DMouseDown(e) {
    try {
      const rect = this.canvas2D.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Verifica se clicou em um ponto existente
      for (let i = 0; i < this.controlPoints.length; i++) {
        const p = this.controlPoints[i];
        const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
        if (dist < 8) {
          this.selectedPoint = i;
          return;
        }
      }

      // Adiciona novo ponto
      this.controlPoints.push({ x, y });
      this.updateCurve();
      this.updatePointList();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Trata arraste de ponto no canvas 2D.
   * @param {MouseEvent} e - Evento do mouse.
   * @returns {void}
   */
  onCanvas2DMouseMove(e) {
    if (this.selectedPoint !== null) {
      const rect = this.canvas2D.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(this.canvas2D.width, e.clientX - rect.left)
      );
      const y = Math.max(
        0,
        Math.min(this.canvas2D.height, e.clientY - rect.top)
      );

      this.controlPoints[this.selectedPoint] = { x, y };
      this.updateCurve();
      this.updatePointList();
    }
  }

  /**
   * Encerra o arraste de ponto no canvas 2D.
   * @param {MouseEvent} e - Evento do mouse.
   * @returns {void}
   */
  onCanvas2DMouseUp(e) {
    this.selectedPoint = null;
  }

  /**
   * Recalcula a curva 2D a partir dos pontos de controle e configurações atuais.
   * @returns {void}
   */
  updateCurve() {
    try {
      if (this.controlPoints.length < 2) {
        this.curve = [];
        this.draw2D();

        return;
      }

      const type = document.getElementById("curveType").value;
      const degree = parseInt(document.getElementById("degree").value);
      const resolution = parseInt(
        document.getElementById("curveResolution").value
      );
      this.curve = this.curveGen.generateCurve(
        this.controlPoints,
        type,
        degree,
        resolution
      );
      this.draw2D();
      this.updateStats();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Renderiza o perfil 2D, eixos, linhas de controle e pontos.
   * @returns {void}
   */
  draw2D() {
    try {
      const ctx = this.ctx;
      const w = this.canvas2D.width;
      const h = this.canvas2D.height;

      // Limpa
      ctx.clearRect(0, 0, w, h);

      // Eixo horizontal (referência de revolução)
      ctx.strokeStyle = "#667eea";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Eixo vertical (centro do canvas)
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Curva
      if (this.curve.length > 0) {
        ctx.strokeStyle = "#48bb78";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.curve[0].x, this.curve[0].y);
        for (let i = 1; i < this.curve.length; i++) {
          ctx.lineTo(this.curve[i].x, this.curve[i].y);
        }
        ctx.stroke();
      }

      // Linha de controle
      if (this.controlPoints.length > 1) {
        ctx.strokeStyle = "#cbd5e0";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(this.controlPoints[0].x, this.controlPoints[0].y);
        for (let i = 1; i < this.controlPoints.length; i++) {
          ctx.lineTo(this.controlPoints[i].x, this.controlPoints[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Pontos de controle
      for (let i = 0; i < this.controlPoints.length; i++) {
        const p = this.controlPoints[i];
        ctx.fillStyle = i === this.selectedPoint ? "#f56565" : "#667eea";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Número
        ctx.fillStyle = "#333";
        ctx.font = "10px Arial";
        ctx.fillText(i, p.x + 10, p.y - 10);
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Gera a superfície 3D a partir da curva 2D e cria a malha Three.js.
   * @returns {void}
   */
  generateSurface() {
    try {
      if (this.curve.length < 2) {
        alert("Adicione pontos de controle para gerar a superfície!");

        return;
      }

      const axis = document.getElementById("revolutionAxis").value;
      const angle = parseInt(document.getElementById("revolutionAngle").value);
      const subdivisions = parseInt(
        document.getElementById("angularSubdivisions").value
      );
      // Normaliza a curva para coordenadas 3D
      const w = this.canvas2D.width;
      const h = this.canvas2D.height;
      const profile = this.curve.map((p) => ({
        x: (p.x / w) * 4 - 2,
        y: -(p.y / h) * 4 + 2,
      }));

      // Gera superfície
      this.surface.generate(profile, axis, angle, subdivisions);
      // Remove malha anterior
      if (this.mesh) {
        this.scene.remove(this.mesh);
      }

      // Cria geometria Three.js
      const geometry = new THREE.BufferGeometry();

      const positions = [];
      const normals = [];
      const indices = [];

      for (const v of this.surface.vertices) {
        positions.push(v.x, v.y, v.z);
      }

      for (const n of this.surface.normals) {
        normals.push(n.x, n.y, n.z);
      }

      for (const f of this.surface.faces) {
        indices.push(f[0], f[1], f[2]);
      }
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(normals, 3)
      );
      geometry.setIndex(indices);

      // Material
      const material = new THREE.MeshPhongMaterial({
        color: 0x667eea,
        side: THREE.DoubleSide,
        flatShading: false,
        shininess: 100,
        specular: 0x444444,
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.mesh);

      this.updateStats();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Define o modo de renderização da malha (wireframe/sólido/suavizado).
   * @param {"wireframe"|"solid"|"smooth"} mode - Modo desejado.
   * @returns {void}
   */
  setRenderMode(mode) {
    // Atualiza botões
    document.getElementById("modeWireframe").classList.remove("active");
    document.getElementById("modeSolid").classList.remove("active");
    document.getElementById("modeSmooth").classList.remove("active");
    document
      .getElementById("mode" + mode.charAt(0).toUpperCase() + mode.slice(1))
      .classList.add("active");

    if (!this.mesh) return;

    if (mode === "wireframe") {
      this.mesh.material.wireframe = true;
      this.mesh.material.flatShading = false;
    } else if (mode === "solid") {
      this.mesh.material.wireframe = false;
      this.mesh.material.flatShading = true;
    } else if (mode === "smooth") {
      this.mesh.material.wireframe = false;
      this.mesh.material.flatShading = false;
    }

    this.mesh.material.needsUpdate = true;
  }

  /**
   * Limpa todos os pontos de controle e a curva 2D.
   * @returns {void}
   */
  clearPoints() {
    this.controlPoints = [];
    this.curve = [];
    this.updateCurve();
    this.updatePointList();
  }

  /**
   * Atualiza a lista visual de pontos de controle no painel.
   * @returns {void}
   */
  updatePointList() {
    const list = document.getElementById("pointList");
    list.innerHTML = "";

    this.controlPoints.forEach((p, i) => {
      const item = document.createElement("div");
      item.className = "point-item";
      item.innerHTML = `
                        <span>P${i}: (${Math.round(p.x)}, ${Math.round(
        p.y
      )})</span>
                        <button class="danger" onclick="app.removePoint(${i})">✕</button>
                    `;
      list.appendChild(item);
    });
  }

  /**
   * Remove um ponto de controle pelo índice.
   * @param {number} index - Índice do ponto a ser removido.
   * @returns {void}
   */
  removePoint(index) {
    this.controlPoints.splice(index, 1);
    this.updateCurve();
    this.updatePointList();
  }

  /**
   * Atualiza as estatísticas exibidas (vértices, faces, pontos).
   * @returns {void}
   */
  updateStats() {
    document.getElementById("statsVertices").textContent =
      this.surface.vertices.length;
    document.getElementById("statsFaces").textContent =
      this.surface.faces.length;
    document.getElementById("statsPoints").textContent =
      this.controlPoints.length;
  }

  /**
   * Exporta a geometria gerada para arquivo OBJ, STL (ASCII) ou JSON.
   * @param {"obj"|"stl"|"json"} format - Formato desejado de exportação.
   * @returns {void}
   */
  exportFile(format) {
    if (this.surface.vertices.length === 0) {
      alert("Gere uma superfície primeiro!");
      return;
    }

    let content, filename, mimeType;

    if (format === "obj") {
      content = this.surface.exportOBJ();
      filename = "surface.obj";
      mimeType = "text/plain";
    } else if (format === "stl") {
      content = this.surface.exportSTL();
      filename = "surface.stl";
      mimeType = "text/plain";
    } else if (format === "json") {
      const data = {
        controlPoints: this.controlPoints,
        curveType: document.getElementById("curveType").value,
        degree: parseInt(document.getElementById("degree").value),
        revolutionAxis: document.getElementById("revolutionAxis").value,
        revolutionAngle: parseInt(
          document.getElementById("revolutionAngle").value
        ),
        subdivisions: parseInt(
          document.getElementById("angularSubdivisions").value
        ),
        vertices: this.surface.vertices,
        normals: this.surface.normals,
        faces: this.surface.faces,
      };
      content = JSON.stringify(data, null, 2);
      filename = "surface.json";
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Loop de animação/renderização da cena 3D.
   * @returns {void}
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Trata redimensionamento da janela, ajustando 2D e 3D.
   * @returns {void}
   */
  onResize() {
    try {
      const width = this.canvas3D.offsetWidth;
      const height = this.canvas3D.offsetHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);

      this.canvas2D.width = this.canvas2D.offsetWidth;
      this.canvas2D.height = this.canvas2D.offsetHeight;
      this.draw2D();
    } catch (error) {
      console.error(error);
    }
  }
}

// Inicialização
let app;
window.addEventListener("load", () => {
  try {
    app = new Visualization();
  } catch (error) {
    console.error(error);
    alert("Erro ao inicializar aplicação. Veja o console para detalhes.");
  }
});
