# Superfícies de Revolução — Documentação Técnica

## Visão Geral

Aplicação interativa que combina edição 2D de um perfil (canvas) com geração e visualização 3D (Three.js) de uma superfície de revolução. Suporta perfis via Bézier (De Casteljau) e B‑Spline (Cox–de Boor), exportação de malha para OBJ/STL/JSON e múltiplos modos de renderização (aramado/sólido/suavizado).

## Arquitetura da Aplicação

Classes principais em `script.js`:
- `CurveGenerator`: gera curvas 2D a partir de pontos de controle
  - Bézier (De Casteljau)
  - B‑Spline (Cox–de Boor) com vetor de nós uniforme aberto
- `RevolutionSurface`: transforma a curva 2D em malha 3D por revolução
  - Geração de vértices/triângulos (parcial ou 360°; eixo X/Y/Z)
  - Cálculo de normais por vértice (média das normais de faces)
  - Exportação OBJ/STL (ASCII)
- `Visualization`: integra UI, canvas 2D e cena 3D Three.js
  - Scene/camera/renderer, luzes, grid/eixos, OrbitControls
  - Eventos de interação (pontos no 2D, sliders, toggles, exportação)

HTML (`index.html`): define dois canvases (`canvas2D`, `canvas3D`), importa Three.js/OrbitControls e expõe `THREE`/`OrbitControls` no escopo global para o script.

## Algoritmos Utilizados

- Bézier 2D (De Casteljau): interpolação recursiva linear até ponto único para t ∈ [0,1].
- B‑Spline 2D (Cox–de Boor): avaliação de base N_{i,k}(t) com vetor de nós uniforme aberto; domínio em [knots[degree], knots[n]].
- Normalização 2D→3D: pontos do canvas (x,y) são mapeados para um intervalo simétrico aproximado em [-2,2] antes da revolução.
- Revolução do perfil:
  - Para cada amostra do perfil e para cada ângulo θ: rotaciona em torno do eixo escolhido;
  - Gera anéis de vértices e conecta faces como tiras triangulares.
- Normais por vértice: acumula normais de faces adjacentes e normaliza ao final (iluminação Phong).

## Principais Decisões de Projeto

- Implementação própria da revolução em vez de `THREE.LatheGeometry`: caráter didático e controle total da malha/exports.
- Separação em três classes: clareza de responsabilidades (curva, malha, visualização/interação).
- Vetor de nós uniforme aberto: clamping nas extremidades para B‑Spline, comportamento esperado para modelagem.
- Exportadores embutidos (OBJ/STL): independência de bibliotecas externas e facilidade de integração com outras ferramentas.
- Modos de renderização por material único (wireframe/flat/smooth): alternância simples via flags `wireframe` e `flatShading`.

## Estrutura de Arquivos

- `index.html`: layout, import de Three.js e canvases 2D/3D.
- `styles.css`: layout em colunas, painéis e estilos dos controles.
- `script.js`: classes `CurveGenerator`, `RevolutionSurface`, `Visualization` e glue code da aplicação.

## Execução

- Abra `index.html` em um servidor estático.
- No painel esquerdo: escolha Bézier/B‑Spline, grau e resolução; clique/arraste no canvas 2D para editar o perfil.
- No painel direito: selecione eixo/ângulo/subdivisões e gere a superfície; alterne modos de visualização e exporte a malha.

## Limitações e Considerações

- Fechamentos de topo/base não são gerados automaticamente: para sólidos fechados, ajuste o perfil encostando no eixo.
- Artefatos com ângulos parciais e pouca subdivisão: aumente subdivisões para suavidade.
- B‑Spline: o vetor de nós é uniforme e aberto; não há pesos (não é NURBS).