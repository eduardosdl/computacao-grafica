# O voo de Alus — Documentação Técnica

## Visão Geral

Simulação 3D em Three.js de um pássaro (esfera) percorrendo uma trajetória helicoidal inspirada na sequência de Fibonacci, com variação radial guiada pelo número áureo (φ) e oscilação vertical senoidal. A cena inclui visualização do caminho (linha), um tubo colorido por altitude, controles de câmera e painel de parâmetros (lil-gui).

## Arquitetura da Aplicação

- Renderização: `THREE.WebGLRenderer` + `Scene` + `PerspectiveCamera`.
- Controles de câmera: `OrbitControls` (com fallback “BasicOrbitControls” dentro de `script.js`).
- Iluminação e guias: `HemisphereLight`, `DirectionalLight`, `GridHelper`, `AxesHelper`.
- Módulos lógicos em `script.js`:
  - Parâmetros (`params`) e GUI (lil-gui)
  - Construção da curva: geração de pontos, spline Catmull-Rom, linha e tubo
  - Reparametrização por comprimento de arco (tabela + busca binária)
  - Loop de animação (atualiza posição e orientação do “pássaro”)
  - Responsividade (resize) e descarte seguro de geometrias

Fluxo principal:
1) Inicializa cena e câmera → 2) Gera pontos paramétricos → 3) Constrói `CatmullRomCurve3` → 4) Constrói linha/tubo → 5) Constrói tabela de comprimento de arco → 6) Loop anima posição por arco constante e orienta por tangente.

## Algoritmos Utilizados

- Crescimento radial pelo número áureo: r(k) = baseRadius + radiusScale · φ^k, com k = t / 2π.
- Oscilação vertical: y(t) = sin(ωt) com ω = 2π / `verticalPeriod`.
- Interpolação da trajetória: `THREE.CatmullRomCurve3` sobre pontos amostrados do perfil helicoidal.
- Reparametrização por comprimento de arco:
  - Amostragem discreta da curva → tabela cumulativa de comprimentos (sTable)
  - Busca binária para mapear s desejado → parâmetro u em [0,1]
  - Garante velocidade aparente constante ao longo do caminho
- Orientação do “pássaro”: quaternions a partir de `setFromUnitVectors(up, tangent)`.
- Colorização por altitude: mapeamento de `y` normalizado → gradiente RGB aplicado em `TubeGeometry` via `vertexColors`.

## Principais Decisões de Projeto

- Catmull-Rom sobre a parametrização direta: facilita `TubeGeometry`, tangentes suaves e amostragem uniforme visual.
- Reparametrização por arco: melhora percepção de velocidade, independente da curvatura local.
- Fallback de controles: implementação leve de “orbit/pan/zoom” para robustez quando `OrbitControls` não carrega.
- Gerenciamento de recursos: ao reconstruir, remove e `dispose()` de geometrias/materiais para evitar vazamentos.
- Segmentação alta (ex.: 1200) por padrão: prioriza suavidade; pode reduzir para desempenho em dispositivos modestos.

## Estrutura de Arquivos

- `index.html`: bootstrap da página, libs (Three, OrbitControls, lil-gui) e container.
- `styles.css`: tema escuro, overlay e rodapé de instruções.
- `script.js`: toda a lógica (cena, curva, GUI, reparametrização, fallback de controles, animação).

## Execução

- Abra `index.html` em um servidor estático (evite file:// para evitar CORS de alguns browsers).
- Ajuste parâmetros na GUI (direção, raio base, velocidade, tubo, etc.).
- Use o mouse para orbitar/zoom; botão “Centralizar Alus” reposiciona a câmera.