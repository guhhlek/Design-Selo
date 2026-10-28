// Draws FrameState onto a canvas. WebGL (2, then 1) does the real work; a
// Canvas2D renderer keeps the camera moves when WebGL is unavailable.

import { resolveCamera, type FrameState, type Vec2 } from './timeline'

export interface Renderer {
  readonly kind: 'webgl2' | 'webgl' | '2d'
  setImage(id: string, image: HTMLImageElement | ImageBitmap): void
  hasImage(id: string): boolean
  /** size in device pixels */
  resize(width: number, height: number): void
  render(frame: FrameState): void
  dispose(): void
}

const INK: [number, number, number] = [0.043, 0.039, 0.035]

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_res;      // viewport, device px
uniform vec2 u_img;      // image, px
uniform vec2 u_center;   // image px under viewport centre
uniform float u_k;       // image px per viewport px
uniform float u_roll;
uniform float u_exposure;
uniform float u_ignite;
uniform float u_glint;
uniform float u_reveal;
uniform float u_seed;

vec3 toLinear(vec3 c) { return c * c; }
vec3 toGamma(vec3 c) { return sqrt(max(c, 0.0)); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec2 project(vec2 screen) {
  vec2 d = (screen - 0.5) * u_res;
  float c = cos(u_roll), s = sin(u_roll);
  d = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  return (u_center + d * u_k) / u_img;
}

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

void main() {
  vec2 uv = project(v_uv);
  vec3 col = toLinear(texture2D(u_tex, uv).rgb);
  float l = luma(col);

  // The lamp's own light: bright pixels (diffuser slits and the halo they cast).
  // Behind the ignition front they are dimmed back to an unlit wall.
  float emissive = smoothstep(0.02, 0.32, l);
  float front = 1.0 - smoothstep(u_ignite - 0.07, u_ignite + 0.03, uv.x);
  float lit = mix(0.035, 1.0, front);
  col *= mix(1.0, lit, emissive);

  // Raking light: catches edges of the steel rods as a band sweeps the frame.
  vec2 px = 1.6 * max(u_k, 1.0) / u_img;
  float gx = luma(texture2D(u_tex, uv + vec2(px.x, 0.0)).rgb) - luma(texture2D(u_tex, uv - vec2(px.x, 0.0)).rgb);
  float gy = luma(texture2D(u_tex, uv + vec2(0.0, px.y)).rgb) - luma(texture2D(u_tex, uv - vec2(0.0, px.y)).rgb);
  float edge = smoothstep(0.02, 0.16, length(vec2(gx, gy)));
  float band = exp(-pow((v_uv.x + 0.35 * v_uv.y - u_glint) / 0.11, 2.0));
  col += edge * band * vec3(1.0, 0.78, 0.55) * 0.55;
  col += band * vec3(0.012, 0.009, 0.006) * (1.0 - emissive);

  col *= u_exposure;

  // Luminance-ordered dissolve: light appears before shadow.
  float th = 1.0 - u_reveal * 1.3;
  float alpha = smoothstep(th, th + 0.3, sqrt(l) * 0.9 + 0.05);

  vec3 outc = toGamma(col);
  vec2 q = v_uv - 0.5;
  outc *= 1.0 - 0.38 * smoothstep(0.25, 0.85, length(q * vec2(1.0, 1.15)));
  outc += (hash(gl_FragCoord.xy + u_seed) - 0.5) * 0.028;

  gl_FragColor = vec4(outc * alpha, alpha);
}`

interface Tex {
  tex: WebGLTexture
  size: Vec2
}

class GLRenderer implements Renderer {
  readonly kind: 'webgl2' | 'webgl'
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private buffer: WebGLBuffer
  private textures = new Map<string, Tex>()
  private u: Record<string, WebGLUniformLocation | null> = {}
  private size: Vec2 = [1, 1]

  constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, kind: 'webgl2' | 'webgl') {
    this.gl = gl
    this.kind = kind
    const vs = this.compile(gl.VERTEX_SHADER, VERT)
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link failed')
    this.program = program
    gl.useProgram(program)
    for (const name of ['u_tex', 'u_res', 'u_img', 'u_center', 'u_k', 'u_roll', 'u_exposure', 'u_ignite', 'u_glint', 'u_reveal', 'u_seed']) {
      this.u[name] = gl.getUniformLocation(program, name)
    }
    this.buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform1i(this.u.u_tex, 0)
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault())
  }

  private compile(type: number, src: string) {
    const gl = this.gl
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'compile failed')
    return sh
  }

  hasImage(id: string) {
    return this.textures.has(id)
  }

  setImage(id: string, image: HTMLImageElement | ImageBitmap) {
    const gl = this.gl
    const existing = this.textures.get(id)
    const tex = existing?.tex ?? gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    // NPOT mipmaps need WebGL2; WebGL1 falls back to plain linear filtering.
    if (this.kind === 'webgl2') {
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    }
    this.textures.set(id, { tex, size: [image.width, image.height] })
  }

  resize(width: number, height: number) {
    const canvas = this.gl.canvas as HTMLCanvasElement
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    this.size = [width, height]
    this.gl.viewport(0, 0, width, height)
  }

  render(frame: FrameState) {
    const gl = this.gl
    gl.clearColor(INK[0], INK[1], INK[2], 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)
    const seed = Math.random() * 100
    for (const layer of frame.layers) {
      const t = this.textures.get(layer.image)
      if (!t) continue
      const cam = resolveCamera(layer, this.size, t.size)
      gl.bindTexture(gl.TEXTURE_2D, t.tex)
      gl.uniform2f(this.u.u_res, this.size[0], this.size[1])
      gl.uniform2f(this.u.u_img, t.size[0], t.size[1])
      gl.uniform2f(this.u.u_center, cam.center[0], cam.center[1])
      gl.uniform1f(this.u.u_k, cam.k)
      gl.uniform1f(this.u.u_roll, cam.roll)
      gl.uniform1f(this.u.u_exposure, layer.exposure)
      gl.uniform1f(this.u.u_ignite, layer.ignite)
      gl.uniform1f(this.u.u_glint, layer.glint)
      gl.uniform1f(this.u.u_reveal, layer.reveal)
      gl.uniform1f(this.u.u_seed, seed)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }

  dispose() {
    const gl = this.gl
    for (const t of this.textures.values()) gl.deleteTexture(t.tex)
    this.textures.clear()
    gl.deleteBuffer(this.buffer)
    gl.deleteProgram(this.program)
    // No loseContext(): the same canvas may be re-initialised (React StrictMode remount).
  }
}

/** Keeps the camera choreography; approximates light with exposure and opacity. */
class CanvasRenderer implements Renderer {
  readonly kind = '2d' as const
  private ctx: CanvasRenderingContext2D
  private images = new Map<string, HTMLImageElement | ImageBitmap>()
  private size: Vec2 = [1, 1]

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('no 2d context')
    this.ctx = ctx
  }

  hasImage(id: string) {
    return this.images.has(id)
  }

  setImage(id: string, image: HTMLImageElement | ImageBitmap) {
    this.images.set(id, image)
  }

  resize(width: number, height: number) {
    const canvas = this.ctx.canvas
    canvas.width = width
    canvas.height = height
    this.size = [width, height]
  }

  render(frame: FrameState) {
    const { ctx } = this
    const [W, H] = this.size
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgb(11,10,9)'
    ctx.fillRect(0, 0, W, H)
    for (const layer of frame.layers) {
      const img = this.images.get(layer.image)
      if (!img) continue
      const cam = resolveCamera(layer, this.size, [img.width, img.height])
      const light = Math.min(1, layer.exposure * (0.25 + 0.75 * Math.min(1, Math.max(0, layer.ignite))))
      ctx.globalAlpha = layer.reveal
      ctx.setTransform(1, 0, 0, 1, W / 2, H / 2)
      ctx.rotate(layer.roll)
      ctx.scale(1 / cam.k, 1 / cam.k)
      ctx.translate(-cam.center[0], -cam.center[1])
      ctx.drawImage(img, 0, 0)
      if (light < 1) {
        ctx.globalAlpha = layer.reveal * (1 - light)
        ctx.fillStyle = 'rgb(11,10,9)'
        ctx.fillRect(0, 0, img.width, img.height)
      }
    }
  }

  dispose() {
    this.images.clear()
  }
}

export function createRenderer(canvas: HTMLCanvasElement, prefer: 'auto' | '2d' = 'auto'): Renderer {
  if (prefer === 'auto') {
    const opts: WebGLContextAttributes = { alpha: false, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' }
    try {
      const gl2 = canvas.getContext('webgl2', opts)
      if (gl2) return new GLRenderer(canvas, gl2 as unknown as WebGLRenderingContext, 'webgl2')
      const gl1 = canvas.getContext('webgl', opts)
      if (gl1) return new GLRenderer(canvas, gl1, 'webgl')
    } catch (err) {
      console.warn('[hero] WebGL unavailable, using Canvas2D', err)
    }
  }
  return new CanvasRenderer(canvas)
}
