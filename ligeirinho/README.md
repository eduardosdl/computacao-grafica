# Speedy Gonzales - Sistema de Animação 2D

Projeto acadêmico de Computação Gráfica que implementa uma cena animada 2D com espaço virtual ampliado, câmera móvel, transformações afins e iluminação local usando o modelo de Phong.

## Especificações

- **Espaço Virtual**: 1600x1200 pixels
- **Viewport**: 800x600 pixels (resolução fixa)
- **Iluminação**: Modelo de Phong (ambiente, difusa, especular)
- **Renderização**: Canvas 2D, 60 FPS

## Conceitos Implementados

### Espaço Virtual Ampliado

Espaço de 1600x1200 pixels com viewport de 800x600, permitindo navegação em um mundo maior que a área visível.

```javascript
const virtualWidth = 1600;
const virtualHeight = 1200;
const cameraWidth = 800;
const cameraHeight = 600;
```

### Sistema de Câmera - Projeção Ortográfica

Conversão de coordenadas do mundo para tela:

```
screenX = worldX - cameraX
screenY = worldY - cameraY
```

### Transformações Afins

Aplicadas ao personagem através do Canvas API:

- **Translação**: `ctx.translate(x, y)`
- **Rotação**: `ctx.rotate(angle)`
- **Escala**: `ctx.scale(sx, sy)`

### Iluminação Local - Modelo de Phong

Três componentes de iluminação:

**Ambiente**: `Ia = ka × Iambiente` (ka = 0.3)

**Difusa (Lambert)**: `Id = kd × I × (N · L)`

**Especular (Blinn-Phong)**: `Is = ks × I × (R · V)^shininess`

**Final**: `Ifinal = Ia + Id + Is`

### Z-Buffer Simplificado

Efeito de profundidade usando propriedade `depth` com paralaxe:

```javascript
const parallaxX = (element.x - cameraX) * element.depth;
```

## Decisões Técnicas

### Canvas 2D vs WebGL
Uso de Canvas 2D para simplicidade de implementação e controle direto sobre rasterização, adequado ao escopo 2D do projeto.

### Projeção Ortográfica
Escolhida por preservar proporções e distâncias, com matemática simplificada apropriada para cenas 2D.

### Z-Buffer Simplificado
Uso de propriedade `depth` com paralaxe em vez de z-buffer real, oferecendo melhor performance e sensação de profundidade.

### Modelo Phong Adaptado
Vetores normais simplificados `{x: 0, y: 0, z: 1}` para contexto 2D, mantendo demonstração conceitual efetiva.

### Interpolação de Movimento
Interpolação angular suave para evitar mudanças bruscas de direção:

```javascript
speedy.direction += normalizedAngleDiff * 0.05;
```

### Controle de FPS
`requestAnimationFrame` com deltaTime para sincronização com refresh rate do monitor.

## Como Executar

### Requisitos
- Navegador moderno com suporte a HTML5 Canvas

### Instalação

Clone o repositório:
```bash
git clone https://github.com/eduardosdl/computacao-grafica.git
cd ligeirinho
```

Abra `index.html` no navegador ou use um servidor local:
```bash
python -m http.server 8000
```

## Controles

### Teclado
- `W/↑`: Câmera para cima
- `S/↓`: Câmera para baixo
- `A/←`: Câmera para esquerda
- `D/→`: Câmera para direita

### Interface
- **Pausar Animação**: Pausa/continua animação
- **Resetar Câmera**: Volta câmera ao centro
- **Alternar Luz**: Liga/desliga iluminação
- **Modo Captura**: Ativa captura do personagem (clique nele)

## Estrutura do Projeto

```
ligeirinho/
├── index.html    # Estrutura HTML e canvas
├── styles.css    # Estilos da interface
├── script.js     # Lógica principal
└── README.md     # Documentação
```

## Funções Principais

### `applyPhongLighting(baseColor, normal, viewDirection, shininess)`
Aplica modelo de Phong com componentes ambiente, difusa e especular.

### `drawSpeedy()`
Renderiza personagem aplicando transformações afins e iluminação.

### `updateSpeedy(deltaTime)`
Atualiza posição com trajetória autônoma e detecção de colisão.

### `handleCameraMovement()`
Processa input do teclado para navegação da câmera.

## ✅ Requisitos Atendidos

### Câmera e Projeção
### Camera e Projeção
- Câmera com resolução fixa (800x600)
- Espaço virtual ampliado (1600x1200)
- Movimentação livre e suave
- Projeção ortográfica
- Z-buffer simplificado

### Personagem
- Trajetórias contínuas e variáveis
- Transformações afins (translação, rotação, escala)
- Animação parametrizada no tempo
- Detecção de colisões

### Iluminação (Phong)
- Fonte de luz direcional
- Cor RGB e intensidade K
- Componente ambiente
- Componente difusa (Lei de Lambert)
- Componente especular (Blinn-Phong)

### Interatividade
- Navegação em tempo real (WASD/setas)
- Exploração do espaço virtual
- Geração automática de trajetória
- Interface de captura (bonus)
