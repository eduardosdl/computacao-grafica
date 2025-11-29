(function () {
  const THREE = window.THREE;
  const OrbitControlsCtor =
    (THREE && THREE.OrbitControls) || window.OrbitControls;
  const GUIClass = (window.lil && window.lil.GUI) || window.GUI;

  if (!THREE) {
    console.error("[Alus] THREE global não encontrado.");
    return;
  }
  if (!OrbitControlsCtor) {
    console.warn(
      "[Alus] OrbitControls global não encontrado. Verifique a ordem de scripts."
    );
  }
  if (!GUIClass) {
    console.warn(
      "[Alus] lil-gui não encontrado. Os controles não serão exibidos."
    );
  }

  const PHI = (1 + Math.sqrt(5)) / 2;
  const TWO_PI = Math.PI * 2;

  /**
   * Parâmetros de controle da simulação.
   * @typedef {Object} AlusParams
   * @property {number} cycles - Número de voltas do trajeto (50–100 recomendados).
   * @property {number} baseRadius - Raio base do espiral.
   * @property {number} radiusScale - Fator de crescimento do raio (influenciado por φ).
   * @property {('left'|'right')} turnDirection - Direção da rotação do espiral.
   * @property {number} verticalPeriod - Período da oscilação vertical.
   * @property {number} speed - Velocidade constante ao longo do arco.
   * @property {boolean} showTube - Exibe ou não o tubo ao longo da curva.
   * @property {number} tubeRadius - Raio do tubo.
   * @property {number} tubeSegments - Segmentos para discretização/visualização.
   * @property {number} birdRadius - Raio da representação do pássaro.
   */
  const params = {
    cycles: 80,
    baseRadius: 0.5,
    radiusScale: 0.035,
    turnDirection: "left",
    verticalPeriod: 14.0,
    speed: 3.0,
    showTube: true,
    tubeRadius: 0.03,
    tubeSegments: 1200,
    birdRadius: 0.06,
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  document.getElementById("app").appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
  );
  camera.position.set(4, 2.5, 6);
  scene.add(camera);
  let controls = null;
  if (OrbitControlsCtor) {
    controls = new OrbitControlsCtor(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
  } else {
    console.warn(
      "[Alus] OrbitControls não disponível. Ativando controles básicos."
    );
    /**
     * Controle de câmera básico com suporte a rotacionar (botão esquerdo),
     * mover/pan (botão direito) e zoom (scroll).
     * Útil como fallback quando OrbitControls não está disponível.
     * @param {THREE.PerspectiveCamera} cam - Câmera alvo.
     * @param {HTMLElement} dom - Elemento de renderização para eventos de mouse.
     * @returns {{target:THREE.Vector3, update:Function, dispose:Function}}
     */
    controls = (function BasicOrbitControls(cam, dom) {
      const target = new THREE.Vector3(0, 0, 0);
      let isDown = false;
      let mode = "rotate"; // 'rotate' | 'pan'
      let lastX = 0,
        lastY = 0;
      const spherical = new THREE.Spherical();
      const rotateSpeed = 0.005;
      const zoomSpeed = 0.0015;
      const eps = 1e-3;
      /** Atualiza estado esférico a partir da posição da câmera. */
      function updateFromCamera() {
        const offset = cam.position.clone().sub(target);
        spherical.setFromVector3(offset);
      }
      /** Aplica o estado esférico na câmera e mira o `target`. */
      function applyToCamera() {
        spherical.makeSafe();
        const offset = new THREE.Vector3().setFromSpherical(spherical);
        cam.position.copy(target).add(offset);
        cam.lookAt(target);
      }
      /**
       * Pan/lateralização da câmera baseada em delta do mouse.
       * @param {number} dx - Variação horizontal do mouse.
       * @param {number} dy - Variação vertical do mouse.
       */
      function pan(dx, dy) {
        const h = dom.clientHeight || window.innerHeight || 1;
        const v =
          (2 *
            spherical.radius *
            Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5))) /
          h;
        const panX = -dx * v;
        const panY = dy * v;
        const right = new THREE.Vector3();
        const upVec = new THREE.Vector3();
        right.setFromMatrixColumn(cam.matrix, 0);
        upVec.setFromMatrixColumn(cam.matrix, 1);
        target.add(right.multiplyScalar(panX).add(upVec.multiplyScalar(panY)));
        applyToCamera();
      }
      updateFromCamera();
      function onDown(e) {
        isDown = true;
        mode = e.button === 2 ? "pan" : "rotate";
        lastX = e.clientX;
        lastY = e.clientY;
      }
      function onMove(e) {
        if (!isDown) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        if (mode === "rotate") {
          spherical.theta -= dx * rotateSpeed;
          spherical.phi -= dy * rotateSpeed;
          spherical.phi = Math.max(eps, Math.min(Math.PI - eps, spherical.phi));
          applyToCamera();
        } else {
          pan(dx, dy);
        }
      }
      function onUp() {
        isDown = false;
      }
      function onWheel(e) {
        e.preventDefault();
        const factor = Math.exp(e.deltaY * zoomSpeed);
        spherical.radius *= factor;
        spherical.radius = Math.max(0.1, Math.min(500, spherical.radius));
        applyToCamera();
      }
      function onContext(e) {
        e.preventDefault();
      }
      dom.addEventListener("mousedown", onDown);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      dom.addEventListener("wheel", onWheel, { passive: false });
      dom.addEventListener("contextmenu", onContext);
      return {
        target,
        update() {
          /* no damping */
        },
        dispose() {
          dom.removeEventListener("mousedown", onDown);
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          dom.removeEventListener("wheel", onWheel);
          dom.removeEventListener("contextmenu", onContext);
        },
      };
    })(camera, renderer.domElement);
  }

  const hemi = new THREE.HemisphereLight(0xffffff, 0x334466, 0.7);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(5, 8, 3);
  scene.add(dir);

  const grid = new THREE.GridHelper(40, 40, 0x19324a, 0x112235);
  grid.position.y = 0;
  scene.add(grid);
  const axes = new THREE.AxesHelper(1.5);
  scene.add(axes);

  const pathMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });
  const pointMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0x221100,
    roughness: 0.4,
    metalness: 0.0,
  });
  const tubeMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0.0,
  });

  const alus = new THREE.Mesh(
    new THREE.SphereGeometry(params.birdRadius, 16, 16),
    pointMaterial
  );
  scene.add(alus);
  let tubeMesh = null;
  let pathLine = null;

  /**
   * Mapeia altitude `y` para uma cor, normalizando em relação ao intervalo [ymin, ymax].
   * @param {number} y - Altura atual.
   * @param {number} ymin - Altura mínima observada.
   * @param {number} ymax - Altura máxima observada.
   * @returns {THREE.Color} Cor correspondente à altitude.
   */
  function altitudeColor(y, ymin, ymax) {
    const t = THREE.MathUtils.clamp((y - ymin) / (ymax - ymin + 1e-6), 0, 1);
    const c = new THREE.Color();
    if (t < 0.33) {
      const k = t / 0.33;
      c.setRGB(0.23 * (1 - k) + 0.23, 0.51 * k, 0.96 * (1 - k) + 0.96);
    } else if (t < 0.66) {
      const k = (t - 0.33) / 0.33;
      c.setRGB(0.23 * (1 - k), 0.51 * (1 - k) + 0.77, 0.96 * (1 - k));
    } else {
      const k = (t - 0.66) / 0.34;
      c.setRGB(0.77 * (1 - k) + 0.94, 0.77 * (1 - k) + 0.22, 0.0 * (1 - k));
    }
    return c;
  }

  /**
   * Constrói pontos da curva helicoidal inspirada em Fibonacci com oscilação vertical.
   * Garante quantidade de ciclos e discretização conforme `params`.
   * @returns {{pts:THREE.Vector3[]}} Lista de pontos 3D.
   */
  function buildCurvePoints() {
    const N = THREE.MathUtils.clamp(params.cycles, 50, 100);
    const dirSign = params.turnDirection === "left" ? 1 : -1;
    const T = N * TWO_PI;
    const dt = T / params.tubeSegments;
    const pts = [];
    const omega = TWO_PI / params.verticalPeriod;
    const h = (t) => Math.sin(omega * t);
    for (let t = 0; t <= T + 1e-9; t += dt) {
      const k = t / TWO_PI;
      const r = params.baseRadius + params.radiusScale * Math.pow(PHI, k);
      const angle = dirSign * t;
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      const y = h(t);
      pts.push(new THREE.Vector3(x, y, z));
    }
    return { pts };
  }

  /**
   * Cria uma curva Catmull-Rom C² a partir de pontos.
   * @param {THREE.Vector3[]} points - Pontos discretos da curva.
   * @returns {THREE.CatmullRomCurve3} Curva interpoladora suave.
   */
  function makeSpline(points) {
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.25);
    return curve;
  }

  /**
   * Amostra a curva para construir tabela de comprimento de arco.
   * @param {THREE.Curve} curve - Curva a ser amostrada.
   * @param {number} [samples=2000] - Número de amostras.
   * @returns {{length:number, sTable:number[]}} Comprimento total e tabela cumulativa.
   */
  function buildArcLengthTable(curve, samples = 2000) {
    const sTable = [0];
    let length = 0;
    let prev = curve.getPoint(0);
    for (let i = 1; i <= samples; i++) {
      const u = i / samples;
      const p = curve.getPoint(u);
      length += p.distanceTo(prev);
      sTable.push(length);
      prev = p;
    }
    return { length, sTable };
  }

  /**
   * Busca o parâmetro `u` correspondente ao alvo de comprimento de arco `s`.
   * Utiliza busca binária na tabela pré-computada.
   * @param {number} targetS - Comprimento de arco desejado.
   * @param {number} length - Comprimento total da curva.
   * @param {number[]} sTable - Tabela cumulativa de comprimentos.
   * @returns {number} Parâmetro `u` entre 0 e 1.
   */
  function uByArcLength(targetS, length, sTable) {
    const samples = sTable.length - 1;
    const s = THREE.MathUtils.clamp(targetS, 0, length);
    let lo = 0,
      hi = samples,
      mid;
    while (lo < hi) {
      mid = (lo + hi) >> 1;
      if (sTable[mid] < s) lo = mid + 1;
      else hi = mid;
    }
    const idx = Math.max(1, lo);
    const s0 = sTable[idx - 1];
    const s1 = sTable[idx];
    const t = (s - s0) / Math.max(1e-6, s1 - s0);
    return (idx - 1 + t) / samples;
  }

  let curve = null,
    arc = null,
    arcLen = 0;
  /**
   * Reconstrói toda a geometria de visualização (linha e tubo) e a tabela de arco.
   * Garante descarte adequado de buffers anteriores para evitar vazamentos.
   */
  function rebuildGeometry() {
    if (tubeMesh) {
      scene.remove(tubeMesh);
      tubeMesh.geometry.dispose();
      tubeMesh.material.dispose();
      tubeMesh = null;
    }
    if (pathLine) {
      scene.remove(pathLine);
      pathLine.geometry.dispose();
      pathLine.material.dispose();
      pathLine = null;
    }
    let pts;
    try {
      ({ pts } = buildCurvePoints());
    } catch (e) {
      console.error("[Alus] Erro em buildCurvePoints:", e);
      return;
    }
    try {
      curve = makeSpline(pts);
    } catch (e) {
      console.error("[Alus] Erro ao criar spline:", e);
      return;
    }
    try {
      arc = buildArcLengthTable(curve, Math.max(1500, params.tubeSegments * 2));
      arcLen = arc.length;
    } catch (e) {
      console.error("[Alus] Erro ao construir tabela de arco:", e);
      return;
    }
    const lineGeom = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(params.tubeSegments)
    );
    pathLine = new THREE.Line(lineGeom, pathMaterial);
    scene.add(pathLine);
    if (params.showTube) {
      const tubeGeom = new THREE.TubeGeometry(
        curve,
        params.tubeSegments,
        params.tubeRadius,
        16,
        false
      );
      const pos = tubeGeom.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      let ymin = Infinity,
        ymax = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        ymin = Math.min(ymin, y);
        ymax = Math.max(ymax, y);
      }
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const c = altitudeColor(y, ymin, ymax);
        colors[i * 3 + 0] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      tubeGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      tubeMesh = new THREE.Mesh(tubeGeom, tubeMaterial);
      scene.add(tubeMesh);
    }
  }

  rebuildGeometry();

  const gui = GUIClass ? new GUIClass({ title: "Alus – controles" }) : null;
  if (gui) {
    gui
      .add(params, "turnDirection", ["left", "right"])
      .name("Direção")
      .onChange(() => {
        rebuildGeometry();
        if (controls && controls.update) controls.update();
      });
    gui
      .add(params, "baseRadius", 0.1, 2.0, 0.01)
      .name("Raio base")
      .onChange(() => {
        rebuildGeometry();
        if (controls && controls.update) controls.update();
      });
    gui.add(params, "speed", 0.5, 10.0, 0.1).name("Velocidade");
    gui
      .add(params, "birdRadius", 0.02, 0.3, 0.01)
      .name("Tamanho do pássaro")
      .onChange((r) => {
        const s = r / Math.max(1e-6, alus.geometry.parameters.radius);
        alus.scale.set(s, s, s);
      });
    const actions = {
      centralizarAlus: () => {
        if (!alus || !camera) return;
        if (controls) controls.target.copy(alus.position);
        const offset = new THREE.Vector3(0.8, 0.6, 1.0);
        const worldPos = alus.position.clone().add(offset);
        camera.position.copy(worldPos);
        camera.lookAt(alus.position);
        if (controls) controls.update();
      },
    };
    gui.add(actions, "centralizarAlus").name("Centralizar Alus");
  }

  let s = 0;
  const clock = new THREE.Clock();
  /**
   * Loop de animação principal: mantém velocidade constante ao longo do arco
   * e orienta o pássaro conforme a tangente da curva.
   */
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    if (controls) controls.update();
    if (arc && curve) {
      s = (s + params.speed * dt) % arcLen;
      const u = uByArcLength(s, arcLen, arc.sTable);
      const p = curve.getPoint(u);
      const tng = curve.getTangent(u);
      alus.position.copy(p);
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        up,
        tng.clone().normalize()
      );
      alus.quaternion.copy(quat);
    }
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
