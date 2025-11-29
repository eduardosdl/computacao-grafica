# Curvas Paramétricas (Bézier & B-Spline) — Documentação Técnica

## Visão Geral

Ferramenta interativa em Canvas 2D para criação e edição de curvas:
- Bézier racional (via pesos), avaliada por De Casteljau em coordenadas homogêneas;
- B-Spline (base Cox–de Boor) com vetor de nós uniforme aberto;
- UI para adicionar/mover/remover pontos, ajustar grau (Spline), passo de amostragem (Δt) e exportar JSON.

## Arquitetura da Aplicação

- Canvas e Renderização: desenho imediato 2D com `CanvasRenderingContext2D`.
- Estado: `points` (x,y,w), `selectedIndex`, `mode` (bezier|spline), `step`.
- Camadas lógicas em `script.js`:
  - Desenho: `drawGrid`, `drawControlPolygon`, `drawControlPoints`, `drawBezier`, `drawBSpline`
  - Algoritmos: `deCasteljauRational`, `bsplineBasis` (Cox–de Boor), `uniformKnotVector`, `evalBSpline`
  - Interação: seleção/arraste, tabs, inputs de UI, teclado (Delete), exportação
  - Layout/resize: `resizeSimple` mantém canvas sincronizado ao retângulo CSS

Ciclo de interação:
1) Usuário clica/adiciona/move pontos → 2) Estado muda → 3) Rebuild de lista/labels → 4) Draw (grid, polígono, curva, pontos).

## Algoritmos Utilizados

- Bézier racional (De Casteljau):
  - Converte pontos para homogêneo (multiplica x,y por w), interpola recursivamente e divide por w ao final.
  - Permite arcos cônicos e maior controle de forma via pesos.
- B-Spline (Cox–de Boor):
  - Função base N_{i,k}(t) avaliada recursivamente com vetor de nós uniforme aberto (clamping nas extremidades).
  - `uniformKnotVector(nCtrl, degree)` gera nós em [0,1] com multiplicidades nas bordas.
  - `evalBSpline` soma bases ponderando pontos de controle.
- Desenho por amostragem: percorre t ∈ [0,1] com passo `step` (Δt ajustável) para traçar a curva.

## Principais Decisões de Projeto

- Suporte a pesos em Bézier: amplia expressividade sem complexidade extra na UI.
- Nó uniforme aberto em B-Spline: comportamento mais “clamped” nas extremidades, esperado para modelagem.
- Passo fixo (Δt) para simplicidade: suficiente para uso didático; evita métricas mais caras (ex.: reparam. por arco).
- `resizeSimple` em vez de DPI scaling complexo: mantém coordenadas 1:1 com pixels CSS, simplificando interações.
- Exportação leve (JSON): facilita salvar/compartilhar cenários e reutilizar em outras ferramentas.

## Estrutura de Arquivos

- `index.html`: layout com painel lateral, abas (Bézier/Spline) e canvas central.
- `styles.css`: tema, componentes de UI, acessibilidade visual.
- `script.js`: renderização 2D, algoritmos, gerenciamento de estado, eventos.

## Execução

- Abra `index.html` em um servidor estático.
- Interações:
  - Clique no canvas: adiciona ponto
  - Arrastar ponto: move
  - Seleção: clique sobre o ponto (edite X/Y/Peso no painel)
  - Delete/Backspace: remove ponto selecionado
  - Tabs alternam Bézier/Spline; Δt controla suavidade/amostragem
  - Exportar JSON salva o cenário atual