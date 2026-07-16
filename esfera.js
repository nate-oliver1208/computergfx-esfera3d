"use strict";

var canvas, gl;

var shadowProgram, renderProgram;

var sphereData = { positions: [], normals: [], texCoords: [], numVertices: 0 };
var planeData = { positions: [], normals: [], texCoords: [], numVertices: 0 };

var sphereVAO, planeVAO;
var depthFramebuffer, depthTexture;
const SHADOW_MAP_SIZE = 1024;
var mainTexture;

var camX = 0.0, camY = 2.0, camZ = 4.0;
var lightX = 2.0, lightY = 4.0, lightZ = 2.0;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) { alert("WebGL 2.0 isn't available"); return; }

    gl.enable(gl.DEPTH_TEST);

    shadowProgram = initShaders(gl, "shadow-vertex-shader", "shadow-fragment-shader");
    renderProgram = initShaders(gl, "render-vertex-shader", "render-fragment-shader");

    generateSphere(1.0, 64, 64);
    generatePlane(10.0); 

    sphereVAO = setupGeometry(sphereData, renderProgram);
    planeVAO = setupGeometry(planeData, renderProgram);

    setupShadowFBO();

    mainTexture = configureTexturaDaURL("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg");

    setupUI();

    render();
}

function generateSphere(radius, latBands, longBands) {
    for (var latNumber = 0; latNumber <= latBands; latNumber++) {
        var theta = latNumber * Math.PI / latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longBands);
            var v = 1 - (latNumber / latBands);

            sphereData.positions.push(vec4(radius * x, radius * y, radius * z, 1.0));
            sphereData.normals.push(vec3(x, y, z));
            sphereData.texCoords.push(vec2(u, v));
        }
    }

    var indexData = [];
    for (var latNumber = 0; latNumber < latBands; latNumber++) {
        for (var longNumber = 0; longNumber < longBands; longNumber++) {
            var first = (latNumber * (longBands + 1)) + longNumber;
            var second = first + longBands + 1;

            indexData.push(first); indexData.push(second); indexData.push(first + 1);
            indexData.push(second); indexData.push(second + 1); indexData.push(first + 1);
        }
    }

    var finalPositions = [], finalNormals = [], finalTexCoords = [];
    for(var i=0; i<indexData.length; i++) {
        finalPositions.push(sphereData.positions[indexData[i]]);
        finalNormals.push(sphereData.normals[indexData[i]]);
        finalTexCoords.push(sphereData.texCoords[indexData[i]]);
    }
    
    sphereData.positions = finalPositions;
    sphereData.normals = finalNormals;
    sphereData.texCoords = finalTexCoords;
    sphereData.numVertices = indexData.length;
}

function generatePlane(size) {
    var half = size / 2;
    planeData.positions = [
        vec4(-half, -1.0, -half, 1.0), vec4(-half, -1.0, half, 1.0), vec4(half, -1.0, half, 1.0),
        vec4(-half, -1.0, -half, 1.0), vec4(half, -1.0, half, 1.0), vec4(half, -1.0, -half, 1.0)
    ];
    var n = vec3(0.0, 1.0, 0.0);
    planeData.normals = [n, n, n, n, n, n];
    planeData.texCoords = [
        vec2(0.0, 1.0), vec2(0.0, 0.0), vec2(1.0, 0.0),
        vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0, 1.0)
    ];
    planeData.numVertices = 6;
}

function setupGeometry(geomData, program) {
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    var posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geomData.positions), gl.STATIC_DRAW);
    var vPosition = 0;
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geomData.normals), gl.STATIC_DRAW);
    var vNormal = 1;
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geomData.texCoords), gl.STATIC_DRAW);
    var vTexCoord = 2;
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.bindVertexArray(null);
    return vao;
}

function setupShadowFBO() {
    depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);

    depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    gl.readBuffer(gl.NONE);
    gl.drawBuffers([gl.NONE]);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("Erro na criação do Framebuffer de Sombras.");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function configureTexturaDaURL(url) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([150, 150, 150, 255]));

    var img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = function() {
        console.log("Sucesso: A textura foi baixada e aplicada!");
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        
        // Garante a filtragem correta
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };

    img.onerror = function() {
        console.error("ERRO DE CORS: O navegador bloqueou o download da textura de: " + url);
        alert("Erro ao carregar a imagem. Verifique o console (F12).");
    };

    img.src = url;
    return texture;
}

function setupUI() {
    function linkSlider(id, varName) {
        document.getElementById(id).oninput = function(event) {
            window[varName] = parseFloat(event.target.value);
            document.getElementById(id + "-val").innerText = window[varName];
        };
    }
    linkSlider("camX", "camX"); linkSlider("camY", "camY"); linkSlider("camZ", "camZ");
    linkSlider("lightX", "lightX"); linkSlider("lightY", "lightY"); linkSlider("lightZ", "lightZ");
}

function render() {
    var cameraProjMatrix = perspective(45.0, canvas.width / canvas.height, 0.1, 100.0);
    var cameraViewMatrix = lookAt(vec3(camX, camY, camZ), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));

    var lightProjMatrix = perspective(90.0, 1.0, 1.0, 20.0);
    var lightViewMatrix = lookAt(vec3(lightX, lightY, lightZ), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));

    var modelMatrix = mat4(); 

    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    gl.clear(gl.DEPTH_BUFFER_BIT); 

    gl.useProgram(shadowProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, "uLightProjectionMatrix"), false, flatten(lightProjMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, "uLightViewMatrix"), false, flatten(lightViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram, "uModelMatrix"), false, flatten(modelMatrix));

    gl.bindVertexArray(sphereVAO);
    gl.drawArrays(gl.TRIANGLES, 0, sphereData.numVertices);
    
    gl.bindVertexArray(planeVAO);
    gl.drawArrays(gl.TRIANGLES, 0, planeData.numVertices);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.2, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(renderProgram);

    gl.uniformMatrix4fv(gl.getUniformLocation(renderProgram, "uProjectionMatrix"), false, flatten(cameraProjMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(renderProgram, "uViewMatrix"), false, flatten(cameraViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(renderProgram, "uModelMatrix"), false, flatten(modelMatrix));
    
    gl.uniformMatrix4fv(gl.getUniformLocation(renderProgram, "uLightProjectionMatrix"), false, flatten(lightProjMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(renderProgram, "uLightViewMatrix"), false, flatten(lightViewMatrix));

    gl.uniform3fv(gl.getUniformLocation(renderProgram, "uLightPos"), flatten(vec3(lightX, lightY, lightZ)));
    gl.uniform3fv(gl.getUniformLocation(renderProgram, "uViewPos"), flatten(vec3(camX, camY, camZ)));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mainTexture);
    gl.uniform1i(gl.getUniformLocation(renderProgram, "uTexture"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.uniform1i(gl.getUniformLocation(renderProgram, "uShadowMap"), 1);

    var uIsFloorLoc = gl.getUniformLocation(renderProgram, "uIsFloor");

    gl.uniform1i(uIsFloorLoc, 0);
    gl.bindVertexArray(sphereVAO);
    gl.drawArrays(gl.TRIANGLES, 0, sphereData.numVertices);

    gl.uniform1i(uIsFloorLoc, 1);
    gl.bindVertexArray(planeVAO);
    gl.drawArrays(gl.TRIANGLES, 0, planeData.numVertices);

    requestAnimationFrame(render);
}