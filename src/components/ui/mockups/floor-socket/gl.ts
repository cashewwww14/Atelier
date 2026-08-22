/**
 * A tiny WebGL renderer, written the way the original project was: raw GL,
 * hand-rolled matrices, Phong in the fragment shader, no helper library.
 *
 * Keeping the mockup honest matters here — the project's whole point was not
 * using Three.js, so demonstrating it with Three.js would misrepresent it.
 */

export interface Params {
  lightX: number;
  lightY: number;
  lightZ: number;
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
  texture: "checker" | "flat";
  textureLit: boolean;
}

type Mat4 = Float32Array;

const mat4 = {
  identity(): Mat4 {
    // prettier-ignore
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  },
  perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    // prettier-ignore
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  },
  multiply(a: Mat4, b: Mat4): Mat4 {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        out[c * 4 + r] = s;
      }
    }
    return out;
  },
  translate(x: number, y: number, z: number): Mat4 {
    const m = mat4.identity();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
  },
  rotateY(rad: number): Mat4 {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const m = mat4.identity();
    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;
    return m;
  },
  rotateX(rad: number): Mat4 {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const m = mat4.identity();
    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;
    return m;
  },
};

const VERT = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uModel, uView, uProj;
varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vPos = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vUv = aUv;
  gl_Position = uProj * uView * world;
}`;

const FRAG = `
precision mediump float;
varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec3 uLightPos, uEye, uBase;
uniform float uAmbient, uDiffuse, uSpecular, uShininess;
uniform float uChecker, uTextureLit;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vPos);
  vec3 V = normalize(uEye - vPos);
  vec3 R = reflect(-L, N);

  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(R, V), 0.0), uShininess);

  // Procedural checkerboard, the same one the original generated.
  float c = mod(floor(vUv.x * 8.0) + floor(vUv.y * 8.0), 2.0);
  vec3 tex = mix(uBase, mix(uBase * 0.72, uBase * 1.18, c), uChecker);

  // With texture-lighting integration off, the map is pasted on flat.
  vec3 lit = tex * (uAmbient + uDiffuse * diff) + vec3(1.0) * uSpecular * spec;
  gl_FragColor = vec4(mix(tex, lit, uTextureLit), 1.0);
}`;

/** A floor socket: a shallow box with a recessed well in its lid. */
function buildGeometry() {
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];

  const box = (
    cx: number, cy: number, cz: number,
    hx: number, hy: number, hz: number,
  ) => {
    const faces: [number[], number[]][] = [
      [[1, 0, 0], [0, 1, 2]],
      [[-1, 0, 0], [0, 1, 2]],
      [[0, 1, 0], [0, 2, 1]],
      [[0, -1, 0], [0, 2, 1]],
      [[0, 0, 1], [0, 1, 2]],
      [[0, 0, -1], [0, 1, 2]],
    ];
    const h = [hx, hy, hz];
    const c = [cx, cy, cz];

    for (const [n] of faces) {
      const axis = n.findIndex((v) => v !== 0);
      const s = n[axis];
      const a = (axis + 1) % 3;
      const b = (axis + 2) % 3;

      const corner = (ua: number, ub: number) => {
        const p = [0, 0, 0];
        p[axis] = c[axis] + s * h[axis];
        p[a] = c[a] + ua * h[a];
        p[b] = c[b] + ub * h[b];
        return p;
      };

      const quad = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, -1],
        [1, 1],
        [-1, 1],
      ];
      for (const [ua, ub] of quad) {
        pos.push(...corner(ua, ub));
        nrm.push(...n);
        uv.push((ua + 1) / 2, (ub + 1) / 2);
      }
    }
  };

  box(0, 0, 0, 1.0, 0.22, 1.0);          // body
  box(0, 0.24, 0, 0.55, 0.06, 0.55);     // recessed lid
  box(0, 0.3, 0, 0.16, 0.05, 0.16);      // centre boss

  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    uv: new Float32Array(uv),
    count: pos.length / 3,
  };
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  gl.useProgram(program);

  const geo = buildGeometry();
  const bind = (name: string, data: Float32Array, size: number) => {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  bind("aPos", geo.pos, 3);
  bind("aNormal", geo.nrm, 3);
  bind("aUv", geo.uv, 2);

  const u = (n: string) => gl.getUniformLocation(program, n);
  const uni = {
    model: u("uModel"), view: u("uView"), proj: u("uProj"),
    lightPos: u("uLightPos"), eye: u("uEye"), base: u("uBase"),
    ambient: u("uAmbient"), diffuse: u("uDiffuse"),
    specular: u("uSpecular"), shininess: u("uShininess"),
    checker: u("uChecker"), textureLit: u("uTextureLit"),
  };

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let raf = 0;
  let params: Params;
  let angle = 0;

  const frame = (t: number) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    angle = t * 0.00018;
    const model = mat4.multiply(mat4.rotateX(-0.42), mat4.rotateY(angle));
    // Far enough back that the 2-unit-wide socket sits inside the frame once
    // its diagonal swings through the turntable rotation.
    const view = mat4.translate(0, -0.05, -8.2);
    const proj = mat4.perspective(Math.PI / 5, canvas.width / canvas.height || 1, 0.1, 50);

    gl.uniformMatrix4fv(uni.model, false, model);
    gl.uniformMatrix4fv(uni.view, false, view);
    gl.uniformMatrix4fv(uni.proj, false, proj);

    gl.uniform3f(uni.lightPos, params.lightX, params.lightY, params.lightZ);
    gl.uniform3f(uni.eye, 0, 0.05, 8.2);
    gl.uniform3f(uni.base, 0.55, 0.58, 0.72);
    gl.uniform1f(uni.ambient, params.ambient);
    gl.uniform1f(uni.diffuse, params.diffuse);
    gl.uniform1f(uni.specular, params.specular);
    gl.uniform1f(uni.shininess, Math.max(1, params.shininess));
    gl.uniform1f(uni.checker, params.texture === "checker" ? 1 : 0);
    gl.uniform1f(uni.textureLit, params.textureLit ? 1 : 0);

    gl.drawArrays(gl.TRIANGLES, 0, geo.count);
    raf = requestAnimationFrame(frame);
  };

  return {
    start(initial: Params) {
      params = initial;
      raf = requestAnimationFrame(frame);
    },
    update(next: Params) {
      params = next;
    },
    dispose() {
      // Only stop the loop. Forcing WEBGL_lose_context here kills the context
      // for good: getContext returns the *same* object for a given canvas, so
      // React's double-invoked effects in development hand the second mount an
      // already-lost context and the viewport stays blank.
      cancelAnimationFrame(raf);
    },
  };
}
