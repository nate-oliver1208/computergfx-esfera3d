# Renderização de Esfera 3D em WebGL 2.0: Texturização, Iluminação e Sombreamento Dinâmico

*Leia isto em outros idiomas: [English 🇺🇸](README.md)*

Este repositório apresenta um motor de renderização 3D em tempo real construído diretamente sobre a API gráfica de baixo nível **WebGL 2.0** (GLSL `#version 300 es`). A aplicação gera matematicamente uma esfera tridimensional, aplica mapeamento de textura assíncrona, simula iluminação física por fragmento (Phong Shading) e projeta sombras realistas em tempo real utilizando a técnica avançada de **Shadow Mapping** (mapeamento de sombras por múltiplas passagens).

O projeto conta com controles interativos que permitem manipular, em tempo real, a posição tridimensional da câmera virtual e da fonte de luz pontual através de sliders na interface.

Este trabalho foi desenvolvido como projeto final para a disciplina de **Computação Gráfica**, no primeiro semestre de 2026, no curso de **Bacharelado em Engenharia da Computação** do **Instituto Federal de São Paulo (IFSP) - Campus Guarulhos**.

<img width="1000" alt="Captura de tela 2026-07-15 215741" src="https://github.com/user-attachments/assets/c031a025-a07d-4499-b340-601995a1dac1" />

---

## Principais Fundamentos e Funcionalidades Técnicas

### 1. Modelagem Geométrica Paramétrica
*   **Geração Matemática Dinâmica:** A malha (mesh) poligonal da esfera não depende do carregamento de arquivos de modelos externos (como `.obj` ou `.gltf`). Ela é gerada puramente via programação matemática através de equações trigonométricas latitudinais e longitudinais no script `esfera.js`.
*   **Otimização de Memória da GPU:** Dado que a esfera possui raio Unitário ($1.0$) e está centrada na origem, a posição espacial de qualquer vértice coincide perfeitamente com a direção do seu vetor normal. O código aproveita essa simetria física para popular simultaneamente o Buffer de Posições e o Buffer de Normais, otimizando o envio de dados para os barramentos da placa de vídeo.

### 2. Câmera Virtual Interativa - Espaço de Visualização
*   **Cálculo Matricial em Tempo Real:** A movimentação da câmera utiliza um modelo interativo cuja matriz de Visualização (View Matrix) é gerada via funções de álgebra linear `lookAt` da biblioteca matemática `MVnew.js`.
*   As matrizes de Modelo, Visão e Projeção Perspectiva são recalculadas dinamicamente e injetadas de forma contínua no ciclo de renderização (`requestAnimationFrame`) através de variáveis `uniform` no Vertex Shader.

### 3. Texturização Assíncrona e Contorne de Bloqueio CORS
*   **Renderização Não Bloqueante:** Para evitar gargalos de carregamento, o mapeamento de textura 2D ocorre de forma assíncrona. O sistema cria um buffer temporário de cor sólida (placeholder) e, após o evento de download do bitmap definitivo, renderiza a imagem real e executa a otimização de nível de detalhe via Mipmapping (`gl.generateMipmap`).
*   **Ajuste de Eixos e CORS:** Para que o navegador consiga carregar as imagens de satélite do globo terrestre sem bloqueios de segurança locais, foram implementadas políticas dinâmicas de CORS (`anonymous`) e a inversão do eixo Y (`UNPACK_FLIP_Y_WEBGL`) para compatibilizar a textura com a orientação geométrica do WebGL.

### 4. Iluminação por Fragmento - Phong Shading
*   **Cálculo Per-Pixel:** Diferente do método tradicional Gouraud (iluminação calculada nos vértices), toda a equação matemática de reflexão ocorre diretamente no Fragment Shader, assegurando suavidade de transição nas cores.
*   O modelo simula três propriedades da física da luz:
    *   **Componente Ambiente:** Constante para iluminação indireta global.
    *   **Componente Difusa:** Baseada no produto escalar (dot product) entre o vetor de normal e a direção do feixe de luz (Lambertian Reflection).
    *   **Componente Especular:** Reflexo pontual intenso baseado na posição da câmera, angulação dos feixes reflexivos e coeficiente de brilho (shininess).

### 5. Sombreamento Dinâmico - Shadow Mapping
A projeção física da sombra da esfera sobre o plano utiliza uma abordagem de renderização em duas etapas (Multipass Rendering):
1.  **Passagem de Oclusão (FBO):** A cena é primeiramente renderizada sob o ponto de vista tridimensional da Luz. Através de um *Framebuffer Object* (FBO), a informação de profundidade (Z-buffer) é gravada diretamente em uma textura do tipo `gl.DEPTH_COMPONENT24`. O buffer de cores é desativado nesta etapa para poupar recursos.
2.  **Passagem de Renderização:** O Shader final avalia se a coordenada do fragmento atual está mais distante do que o valor registrado na textura de profundidade gerada na primeira etapa. Caso positivo, as contribuições difusas e especulares do fragmento são suprimidas (projetando a sombra). O cálculo conta com um fator de compensação adaptativo (*Shadow Bias*) para eliminar o efeito indesejado de *Shadow Acne*.

---

## Desafios Técnicos de Engenharia de Baixo Nível Superados

*   **Tipagem Estrita de Memória na GPU:** A API WebGL 2.0 não aceita arrays flexíveis nativos do JavaScript no envio de variáveis do tipo uniform. Para contornar crashes silenciosos, os arrays matemáticos foram serializados e mapeados na memória da placa através do método de casting `flatten()`, forçando a gravação em buffers estáticos do tipo `Float32Array`.
*   **Consistência de Mapeamento de Layout:** Para garantir que os dois programas GLSL independentes (o do buffer de profundidade e o do renderer final) utilizassem os mesmos indexadores de memória física na GPU, os layouts de entrada foram fixados diretamente no código do shader compilado via diretiva `layout(location = x)`.
*   **Vazamento de Texturas (Máquina de Estados do WebGL):** Devido à natureza do WebGL de operar como uma máquina de estados, a textura aplicada à esfera vazava e recobria o piso do cenário. O problema foi solucionado de forma altamente performática sem a necessidade de alternar programas de Shaders: declarou-se uma flag condicional `uniform bool` que comuta o estado dinamicamente no render loop, instruindo a GPU a amostrar a textura para a esfera e renderizar cor sólida neutra para o plano de fundo.

---

## Como Executar o Projeto Localmente

Devido às restrições modernas de segurança dos navegadores web para leitura de texturas locais (políticas de CORS e arquivos locais), o arquivo `esfera.html` **não deve** ser aberto clicando duas vezes sobre ele no gerenciador de arquivos (isso bloqueará a renderização).

Para rodar o projeto perfeitamente:

1.  Abra a pasta do projeto no **VS Code**.
2.  Instale a extensão **Live Server** (caso já não possua).
3.  Abra o arquivo principal `esfera.html`.
4.  Clique no botão **"Go Live"** localizado no canto inferior direito do VS Code.
5.  A aplicação abrirá automaticamente no seu navegador padrão em um servidor de desenvolvimento local (normalmente `http://127.0.0.1:5500/esfera.html`), com todas as texturas e sombras funcionando fluidamente.

---

## Informações Acadêmicas e Autores

Este projeto foi apresentado para a disciplina de Computação Gráfica do IFSP - Campus Guarulhos.

*   **Professor Orientador:** Dr. Thiago Schumacher Barcelos.
*   **Autor (Aluno):**
    *   Nathan Iglesias Gomes de Oliveira
