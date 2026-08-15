export interface WebGLEffectsContext {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
  texture: WebGLTexture;
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_image;
uniform int u_effectType;
uniform float u_intensity;
uniform float u_time;

void main() {
  vec4 color = texture(u_image, v_texCoord);
  
  if (u_effectType == 0) {
    outColor = color;
    return;
  }
  
  if (u_effectType == 1) {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(v_texCoord, center);
    float vignette = smoothstep(0.8, 0.3, dist * (1.0 + u_intensity));
    outColor = vec4(color.rgb * vignette, color.a);
    return;
  }
  
  if (u_effectType == 2) {
    vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
    vec4 sum = vec4(0.0);
    int radius = int(u_intensity * 10.0);
    float total = 0.0;
    for (int x = -radius; x <= radius; x++) {
      for (int y = -radius; y <= radius; y++) {
        float weight = 1.0 / float((2 * radius + 1) * (2 * radius + 1));
        sum += texture(u_image, v_texCoord + vec2(float(x), float(y)) * texelSize) * weight;
        total += weight;
      }
    }
    outColor = vec4(sum.rgb / total, color.a);
    return;
  }
  
  if (u_effectType == 3) {
    float gray = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 sepia = vec3(
      gray * 1.2 + 0.1,
      gray * 1.0 + 0.05,
      gray * 0.8
    );
    outColor = vec4(mix(color.rgb, sepia, u_intensity), color.a);
    return;
  }
  
  if (u_effectType == 4) {
    float gray = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    outColor = vec4(vec3(gray), color.a);
    return;
  }
  
  if (u_effectType == 5) {
    vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
    vec4 center = texture(u_image, v_texCoord);
    vec4 top = texture(u_image, v_texCoord + vec2(0.0, texelSize.y));
    vec4 bottom = texture(u_image, v_texCoord - vec2(0.0, texelSize.y));
    vec4 left = texture(u_image, v_texCoord - vec2(texelSize.x, 0.0));
    vec4 right = texture(u_image, v_texCoord + vec2(texelSize.x, 0.0));
    vec4 sharpened = center * (1.0 + u_intensity * 4.0) - (top + bottom + left + right) * u_intensity;
    outColor = clamp(sharpened, 0.0, 1.0);
    return;
  }
  
  if (u_effectType == 6) {
    vec3 shifted = color.rgb;
    shifted.r = texture(u_image, v_texCoord + vec2(u_intensity * 0.01, 0.0)).r;
    shifted.b = texture(u_image, v_texCoord - vec2(u_intensity * 0.01, 0.0)).b;
    float noise = fract(sin(dot(v_texCoord * u_time, vec2(12.9898, 78.233))) * 43758.5453);
    shifted += (noise - 0.5) * u_intensity * 0.3;
    outColor = vec4(shifted, color.a);
    return;
  }
  
  if (u_effectType == 7) {
    vec2 texelSize = 1.0 / vec2(textureSize(u_image, 0));
    vec4 sum = vec4(0.0);
    int radius = 8;
    for (int x = -radius; x <= radius; x++) {
      for (int y = -radius; y <= radius; y++) {
        float weight = 1.0 / float((2 * radius + 1) * (2 * radius + 1));
        sum += texture(u_image, v_texCoord + vec2(float(x), float(y)) * texelSize) * weight;
      }
    }
    vec4 blurred = sum / float((2 * radius + 1) * (2 * radius + 1));
    outColor = color + blurred * u_intensity * 0.5;
    return;
  }
  
  outColor = color;
}`;

export function initWebGL(canvas: HTMLCanvasElement): WebGLEffectsContext | null {
  const gl = canvas.getContext("webgl2", {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertexShader, VERTEX_SHADER);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(vertexShader) ?? "unknown";
    gl.deleteShader(vertexShader);
    return null;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragmentShader, FRAGMENT_SHADER);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(fragmentShader) ?? "unknown";
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const positionBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const texCoordBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
    gl.STATIC_DRAW
  );

  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return { gl, program, positionBuffer, texCoordBuffer, texture };
}

export function renderWithEffects(
  ctx: WebGLEffectsContext,
  frame: VideoFrame,
  effectType: number,
  intensity: number,
  time: number
): void {
  const { gl, program, positionBuffer, texCoordBuffer, texture } = ctx;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(program);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);

  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const texLoc = gl.getAttribLocation(program, "a_texCoord");
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

  gl.uniform1i(gl.getUniformLocation(program, "u_effectType"), effectType);
  gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), intensity);
  gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function renderPassthrough(ctx: WebGLEffectsContext, frame: VideoFrame): void {
  renderWithEffects(ctx, frame, 0, 0, 0);
}

export const EFFECT_TYPES = {
  NONE: 0,
  VIGNETTE: 1,
  BLUR: 2,
  SEPIA: 3,
  BW: 4,
  SHARPEN: 5,
  GLITCH: 6,
  GLOW: 7,
} as const;

export function getEffectType(type: string): number {
  switch (type) {
    case "vignette": return EFFECT_TYPES.VIGNETTE;
    case "blur": return EFFECT_TYPES.BLUR;
    case "sepia": return EFFECT_TYPES.SEPIA;
    case "bw": return EFFECT_TYPES.BW;
    case "sharpen": return EFFECT_TYPES.SHARPEN;
    case "glitch": return EFFECT_TYPES.GLITCH;
    case "glow": return EFFECT_TYPES.GLOW;
    default: return EFFECT_TYPES.NONE;
  }
}
