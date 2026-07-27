# 3D Sphere Rendering in WebGL 2.0: Texturing, Lighting, and Dynamic Shadowing

*Read this in other languages: [Português 🇧🇷](README_PT.md)*

This repository features a real-time 3D rendering engine built directly on top of the low-level **WebGL 2.0** graphics API (GLSL `#version 300 es`). The application mathematically generates a three-dimensional sphere, applies asynchronous texture mapping, simulates per-fragment physical lighting (Phong Shading), and projects realistic real-time shadows using the advanced multi-pass **Shadow Mapping** technique.

The project includes interactive controls that allow real-time manipulation of the three-dimensional position of both the virtual camera and the point light source via user interface sliders.

This work was developed as the final course project for **Computer Graphics** during the first semester of 2026, in the **Bachelor's Degree in Computer Engineering** program at **Instituto Federal de São Paulo (IFSP) – Campus Guarulhos**.

<img width="1000" alt="Captura de tela 2026-07-15 215741" src="https://github.com/user-attachments/assets/c031a025-a07d-4499-b340-601995a1dac1" />

---

## Key Technical Fundamentals & Features

### 1. Parametric Geometric Modeling
*   **Dynamic Mathematical Generation:** The sphere's polygonal mesh does not rely on loading external model files (such as `.obj` or `.gltf`). It is generated purely via mathematical programming using latitudinal and longitudinal trigonometric equations in the `esfera.js` script.
*   **GPU Memory Optimization:** Since the sphere has a Unit Radius ($1.0$) and is centered at the origin, the spatial position of any vertex perfectly coincides with its normal vector direction. The code leverages this physical symmetry to simultaneously populate both the Position Buffer and the Normal Buffer, optimizing data transfer across graphics card buses.

### 2. Interactive Virtual Camera – View Space
*   **Real-Time Matrix Calculation:** Camera movement utilizes an interactive model whose View Matrix is generated via `lookAt` linear algebra functions from the `MVnew.js` math library.
*   The Model, View, and Perspective Projection matrices are recalculated dynamically and continuously injected into the render loop (`requestAnimationFrame`) through `uniform` variables in the Vertex Shader.

### 3. Asynchronous Texturing & CORS Bypass
*   **Non-Blocking Rendering:** To prevent loading bottlenecks, 2D texture mapping occurs asynchronously. The system creates a temporary solid-color buffer (placeholder), and upon completing the final bitmap download event, renders the actual image and applies Level of Detail (LOD) optimization via Mipmapping (`gl.generateMipmap`).
*   **Axis Adjustment & CORS:** To allow the browser to load Earth satellite images without local security blocks, dynamic CORS policies (`anonymous`) and Y-axis flipping (`UNPACK_FLIP_Y_WEBGL`) were implemented to align the texture with WebGL's geometric orientation.

### 4. Per-Fragment Lighting – Phong Shading
*   **Per-Pixel Computation:** Unlike traditional Gouraud shading (lighting calculated at vertices), the entire mathematical reflection equation executes directly in the Fragment Shader, ensuring smooth color transitions.
*   The model simulates three properties of light physics:
    *   **Ambient Component:** Constant global indirect lighting.
    *   **Diffuse Component:** Based on the dot product between the normal vector and the light ray direction (Lambertian Reflection).
    *   **Specular Component:** Intense point reflection based on camera position, reflection beam angles, and shininess coefficient.

### 5. Dynamic Shadowing – Shadow Mapping
The physical projection of the sphere's shadow onto the plane uses a two-pass rendering approach (Multipass Rendering):
1.  **Occlusion Pass (FBO):** The scene is first rendered from the 3D perspective of the Light source. Using a *Framebuffer Object* (FBO), depth information (Z-buffer) is written directly into a `gl.DEPTH_COMPONENT24` texture. The color buffer is disabled in this step to conserve resources.
2.  **Render Pass:** The final Shader evaluates whether the current fragment's coordinate is further away than the value stored in the depth texture generated during the first pass. If so, the fragment's diffuse and specular contributions are suppressed (projecting the shadow). The calculation incorporates an adaptive compensation factor (*Shadow Bias*) to eliminate undesirable *Shadow Acne* artifacts.

---

## Low-Level Engineering Technical Challenges Overcome

*   **Strict Memory Typing on the GPU:** The WebGL 2.0 API does not accept native JavaScript flexible arrays when passing uniform variables. To circumvent silent crashes, mathematical arrays were serialized and mapped to GPU memory using the `flatten()` casting method, forcing them into static `Float32Array` buffers.
*   **Layout Mapping Consistency:** To guarantee that the two independent GLSL programs (the depth buffer shader and the final renderer) used the same physical memory indexers on the GPU, input layouts were fixed directly in the compiled shader code via the `layout(location = x)` directive.
*   **Texture Leakage (WebGL State Machine):** Due to WebGL's state machine nature, the texture applied to the sphere leaked and covered the floor plane. This issue was resolved in a highly performant manner without switching Shader programs: a conditional `uniform bool` flag was declared to dynamically toggle state in the render loop, instructing the GPU to sample the texture for the sphere and render a neutral solid color for the background floor.

---

## How to Run the Project Locally

Due to modern web browser security restrictions regarding local texture loading (CORS policies and local files), the `esfera.html` file **should not** be opened by double-clicking it in your file manager (this will block rendering).

To run the project properly:

1.  Open the project folder in **VS Code**.
2.  Install the **Live Server** extension (if not already installed).
3.  Open the main file `esfera.html`.
4.  Click the **"Go Live"** button located in the bottom-right corner of VS Code.
5.  The application will automatically open in your default browser on a local development server (typically `http://127.0.0.1:5500/esfera.html`), with all textures and shadows rendering smoothly.

---

## Academic Information & Authors

This project was presented for the Computer Graphics course at IFSP – Campus Guarulhos.

*   **Course Advisor / Professor:** Dr. Thiago Schumacher Barcelos.
*   **Author (Student):**
    *   Nathan Iglesias Gomes de Oliveira
