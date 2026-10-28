// Act I of the opening: the Contrapeso recreated in 3D and assembled by the scroll.
// Everything is a pure function of act progress `a` (0–1); there is no clock, so
// scrolling backwards un-assembles the piece exactly.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildContrapeso, LENGTH, ROD_DIAMETER, WALL_Z } from './contrapeso-model'

export type Vec2 = [number, number]

/** Where the photograph (act II) shows the piece, so act I can end on the same framing. */
export interface PhotoFraming {
  /** screen positions (0–1, y down) of the piece's left and right ends */
  left: Vec2
  right: Vec2
}

const INK = new THREE.Color('#0b0a09')
const LIGHT_2700 = new THREE.Color('#ffb46b')
const STEEL = new THREE.Color('#3a3631')
// the wall stays black until the lamp itself lights it
const WALL_DARK = new THREE.Color('#000000')
const WALL_LIT = new THREE.Color('#4a3e35')
const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c1 = 1.25
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const range = (a: number, a0: number, a1: number) => clamp01((a - a0) / (a1 - a0))
const lerp = THREE.MathUtils.lerp

// ---------- choreography (act progress) ----------

/** rods land between these, each in its own short window */
const ASSEMBLE = { from: 0.06, to: 0.5, each: 0.13 }
/** a raking light travels the length of the piece while it is being built */
const RAKE = { from: 0.04, to: 0.62 }
/** the lamp ignites from end to end */
const IGNITE = { from: 0.66, to: 0.86 }
/** final move into the photograph's framing */
const MATCH = { from: 0.84, to: 1 }

interface Pose {
  target: THREE.Vector3
  yaw: number
  pitch: number
  dist: number
}

const DEG = Math.PI / 180
const CAMERA_KEYS: { a: number; pose: Pose }[] = [
  // macro among the loose rods, near the splayed ends
  { a: 0, pose: { target: new THREE.Vector3(-620, 10, 120), yaw: 64 * DEG, pitch: 10 * DEG, dist: 230 } },
  { a: 0.2, pose: { target: new THREE.Vector3(-380, 0, 60), yaw: 44 * DEG, pitch: 7 * DEG, dist: 520 } },
  // the bundle closes in front of the camera
  { a: 0.46, pose: { target: new THREE.Vector3(-60, 0, 0), yaw: 30 * DEG, pitch: 15 * DEG, dist: 1120 } },
  // the unlit object: a grazing view down its length, splayed ends in the foreground
  { a: 0.58, pose: { target: new THREE.Vector3(-430, 0, 0), yaw: 78 * DEG, pitch: 7 * DEG, dist: 660 } },
  // it swings to face the camera while it ignites
  { a: 0.72, pose: { target: new THREE.Vector3(0, 0, 0), yaw: -14 * DEG, pitch: 3 * DEG, dist: 1380 } },
  { a: 0.84, pose: { target: new THREE.Vector3(0, 0, 0), yaw: -9 * DEG, pitch: 2 * DEG, dist: 1450 } },
]

function samplePose(a: number): Pose {
  const keys = CAMERA_KEYS
  // always a copy: callers adjust the pose per frame
  const copy = (p: Pose): Pose => ({ ...p, target: p.target.clone() })
  if (a <= keys[0].a) return copy(keys[0].pose)
  const last = keys[keys.length - 1]
  if (a >= last.a) return copy(last.pose)
  let i = 1
  while (keys[i].a < a) i++
  const k0 = keys[i - 1]
  const k1 = keys[i]
  const t = ease.inOut((a - k0.a) / (k1.a - k0.a))
  return {
    target: k0.pose.target.clone().lerp(k1.pose.target, t),
    yaw: lerp(k0.pose.yaw, k1.pose.yaw, t),
    pitch: lerp(k0.pose.pitch, k1.pose.pitch, t),
    dist: Math.exp(lerp(Math.log(k0.pose.dist), Math.log(k1.pose.dist), t)),
  }
}

// ---------- scene ----------

interface RodState {
  scatterPos: THREE.Vector3
  scatterRot: THREE.Quaternion
  drift: THREE.Vector3
  spin: THREE.Quaternion
  finalPos: THREE.Vector3
  length: number
  start: number
}

export class ContrapesoScene {
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(32, 1, 10, 12000)
  private rods: THREE.InstancedMesh
  private rodStates: RodState[] = []
  private openings: { mesh: THREE.Mesh; center: number }[] = []
  private areaLights: { light: THREE.RectAreaLight; center: number }[] = []
  private rake: THREE.PointLight
  private rim: THREE.DirectionalLight
  private sculpt: THREE.SpotLight
  private wallMaterial: THREE.MeshStandardMaterial
  private wall: THREE.Mesh
  private fog = new THREE.Fog(INK, 900, 3200)
  private size: Vec2 = [1, 1]
  private finalRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2)
  private tmp = { m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }

  constructor(canvas: HTMLCanvasElement, mobile: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(INK, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    RectAreaLightUniformsLib.init()
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.22
    pmrem.dispose()
    this.scene.background = INK
    this.scene.fog = this.fog

    const model = buildContrapeso()

    // wall: only ever seen where the lamp lights it
    this.wallMaterial = new THREE.MeshStandardMaterial({ color: '#4a3e35', roughness: 0.95, metalness: 0 })
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5000), this.wallMaterial)
    this.wall.position.z = WALL_Z
    this.scene.add(this.wall)

    // rods
    const rodGeometry = new THREE.CylinderGeometry(ROD_DIAMETER / 2, ROD_DIAMETER / 2, 1, 14, 1)
    const rodMaterial = new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.82, roughness: 0.34 })
    this.rods = new THREE.InstancedMesh(rodGeometry, rodMaterial, model.rods.length)
    this.rods.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.rods)

    const rand = mulberry(7)
    const n = model.rods.length
    for (const rod of model.rods) {
      const length = rod.x1 - rod.x0
      const scatterRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (rand() - 0.5) * Math.PI * 0.9, (rand() - 0.5) * Math.PI, (rand() - 0.5) * Math.PI * 1.4,
      ))
      this.rodStates.push({
        scatterPos: new THREE.Vector3((rand() - 0.5) * 2200, (rand() - 0.5) * 760, 120 + rand() * 620),
        scatterRot,
        drift: new THREE.Vector3((rand() - 0.5) * 260, (rand() - 0.5) * 140, (rand() - 0.5) * 160),
        spin: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(rand(), rand(), rand()).normalize(), (rand() - 0.5) * 1.2),
        finalPos: new THREE.Vector3((rod.x0 + rod.x1) / 2, rod.y, rod.z),
        length,
        start: ASSEMBLE.from + (rod.order / (n - 1)) * (ASSEMBLE.to - ASSEMBLE.each - ASSEMBLE.from),
      })
      this.rods.setColorAt(this.rodStates.length - 1, new THREE.Color(1, 1, 1))
    }

    // light strip between bundle and wall, visible through the linear openings
    for (const o of model.openings) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(o.x1 - o.x0 + 6, ROD_DIAMETER * 0.72, 1),
        new THREE.MeshBasicMaterial({ color: LIGHT_2700.clone(), toneMapped: false }),
      )
      mesh.position.set((o.x0 + o.x1) / 2, o.y, -ROD_DIAMETER * 0.45)
      this.scene.add(mesh)
      this.openings.push({ mesh, center: (o.x0 + o.x1) / 2 })
    }

    // indirect light onto the wall, in four segments so it can ignite end to end
    const segments = 4
    for (let i = 0; i < segments; i++) {
      const w = (LENGTH * 0.82) / segments
      const light = new THREE.RectAreaLight(LIGHT_2700, 0, w, model.height * 0.6)
      const x = -LENGTH * 0.41 + w * (i + 0.5)
      light.position.set(x, 0, -14)
      light.lookAt(x, 0, WALL_Z - 100)
      this.scene.add(light)
      this.areaLights.push({ light, center: x })
    }

    // raking key light and a cool rim to draw silhouettes in the dark
    this.rake = new THREE.PointLight('#ffd2a1', 0, 1800, 1.4)
    this.scene.add(this.rake)
    this.rim = new THREE.DirectionalLight('#9fb4c8', 0.0)
    this.rim.position.set(-300, 900, -400)
    this.scene.add(this.rim)
    // top light that carves the assembled, unlit object
    this.sculpt = new THREE.SpotLight('#ffe6cc', 0, 2600, 0.55, 1, 1.3)
    this.sculpt.position.set(-200, 900, 650)
    this.sculpt.target.position.set(-200, 0, 0)
    this.scene.add(this.sculpt, this.sculpt.target)
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.015))

    // post: bloom on the light only (threshold above the steel highlights)
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 })
    this.composer = new EffectComposer(this.renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.7, 0.9)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
  }

  resize(width: number, height: number, dpr: number) {
    this.size = [width, height]
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  render(a: number, framing: PhotoFraming | null) {
    this.updateRods(a)
    this.updateLight(a)
    this.updateCamera(a, framing)
    this.composer.render()
  }

  private updateRods(a: number) {
    const { m, p, q, s, c } = this.tmp
    this.rodStates.forEach((r, i) => {
      const k = range(a, r.start, r.start + ASSEMBLE.each)
      // loose: drifting and slowly turning as the visitor scrolls
      const loose = r.scatterPos.clone().addScaledVector(r.drift, a)
      const looseRot = r.scatterRot.clone().multiply(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), r.spin, a))
      // landing: rotation settles first, position snaps in with a small overshoot
      p.copy(loose).lerp(r.finalPos, ease.outBack(k))
      q.slerpQuaternions(looseRot, this.finalRot, ease.out(Math.min(1, k * 1.3)))
      s.set(1, r.length, 1)
      m.compose(p, q, s)
      this.rods.setMatrixAt(i, m)
      // a brief glint on landing
      const flash = Math.max(0, 1 - Math.abs(k - 0.92) / 0.08) * (k < 1 ? 1 : 0)
      c.setScalar(1 + flash * 2.2)
      this.rods.setColorAt(i, c)
    })
    this.rods.instanceMatrix.needsUpdate = true
    if (this.rods.instanceColor) this.rods.instanceColor.needsUpdate = true
  }

  private updateLight(a: number) {
    // raking light: sweeps along the piece, then hands over to the lamp itself
    const rake = range(a, RAKE.from, RAKE.to)
    const rakeLevel = Math.sin(Math.PI * clamp01(rake * 1.05)) * (1 - range(a, IGNITE.from, IGNITE.to))
    this.rake.position.set(lerp(-1100, 1100, ease.inOut(rake)), 220, 420)
    this.rake.intensity = rakeLevel * 2.6e5
    this.rim.intensity = 0.55 * (1 - range(a, IGNITE.from + 0.05, IGNITE.to))
    this.sculpt.intensity = 1.6e5 * range(a, 0.4, 0.54) * (1 - range(a, IGNITE.from + 0.04, IGNITE.to))
    // the wall does not exist until the lamp lights it (even black, it would catch specular)
    const wallLit = ease.out(range(a, IGNITE.from, IGNITE.to + 0.06))
    this.wall.visible = wallLit > 0
    this.wallMaterial.color.copy(WALL_DARK).lerp(WALL_LIT, wallLit)
    // depth fog for the loose rods; it clears as the camera backs off to the photograph's framing
    const clear = range(a, 0.58, 0.8)
    this.fog.near = lerp(900, 8000, clear)
    this.fog.far = lerp(3200, 20000, clear)

    // ignition front along x, end to end
    const front = lerp(-LENGTH * 0.62, LENGTH * 0.62, ease.inOut(range(a, IGNITE.from, IGNITE.to)))
    const on = (x: number) => clamp01((front - x) / 160 + 0.5)
    for (const o of this.openings) {
      const v = on(o.center)
      ;(o.mesh.material as THREE.MeshBasicMaterial).color.copy(LIGHT_2700).multiplyScalar(0.02 + v * 4.2)
    }
    for (const l of this.areaLights) l.light.intensity = on(l.center) * 46
    this.bloom.strength = 0.35 + 0.75 * range(a, IGNITE.from, IGNITE.to)
  }

  private updateCamera(a: number, framing: PhotoFraming | null) {
    const pose = samplePose(a)
    // a tall, narrow frame needs the camera further back once the whole piece is in shot
    const aspect = this.size[0] / this.size[1]
    const narrow = THREE.MathUtils.clamp(0.75 / aspect, 1, 2.2)
    pose.dist *= lerp(1, narrow, range(a, 0.2, 0.46))
    const orbit = new THREE.Vector3(
      Math.sin(pose.yaw) * Math.cos(pose.pitch),
      Math.sin(pose.pitch),
      Math.cos(pose.yaw) * Math.cos(pose.pitch),
    ).multiplyScalar(pose.dist).add(pose.target)

    const t = ease.inOut(range(a, MATCH.from, MATCH.to))
    if (framing && t > 0) {
      const match = this.matchPhoto(framing)
      this.camera.position.copy(orbit).lerp(match.position, t)
      this.camera.up.set(0, 1, 0).lerp(match.up, t).normalize()
      this.camera.lookAt(pose.target.clone().lerp(match.target, t))
    } else {
      this.camera.position.copy(orbit)
      this.camera.up.set(0, 1, 0)
      this.camera.lookAt(pose.target)
    }
  }

  /**
   * Front-on camera that puts the piece's ends exactly where the photograph shows
   * them — so the cross-dissolve from render to photograph registers.
   */
  private matchPhoto({ left, right: rightEnd }: PhotoFraming) {
    const [W, H] = this.size
    const fpx = H / 2 / Math.tan((this.camera.fov * DEG) / 2)
    const ax = left[0] * W, ay = left[1] * H
    const bx = rightEnd[0] * W, by = rightEnd[1] * H
    const lenPx = Math.hypot(bx - ax, by - ay)
    const dist = (LENGTH * fpx) / lenPx
    // Camera looks down −z. With up U in the xy plane, right R = forward × U = (Uy, −Ux).
    // The piece's +x axis must appear along screen direction d (y down):
    //   R·x̂ = dx, U·x̂ = −dy  →  U = (−dy, dx), R = (dx, dy)
    const dx = (bx - ax) / lenPx
    const dy = (by - ay) / lenPx
    const up = new THREE.Vector3(-dy, dx, 0)
    const right = new THREE.Vector3(dx, dy, 0)
    // the piece centre (world origin) must land at screen offset (mx, my) px from centre
    const mx = (ax + bx) / 2 - W / 2
    const my = (ay + by) / 2 - H / 2
    const k = dist / fpx
    const target = right.multiplyScalar(-mx * k).addScaledVector(up, my * k)
    const position = target.clone().add(new THREE.Vector3(0, 0, dist))
    return { position, target, up }
  }

  dispose() {
    this.rods.geometry.dispose()
    ;(this.rods.material as THREE.Material).dispose()
    this.openings.forEach((o) => { o.mesh.geometry.dispose(); (o.mesh.material as THREE.Material).dispose() })
    this.wallMaterial.dispose()
    this.scene.environment?.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}

function mulberry(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
