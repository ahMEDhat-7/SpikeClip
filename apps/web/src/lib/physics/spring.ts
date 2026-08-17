/**
 * Lightweight 2D spring physics engine for the Alignment Grid Hero.
 * iOS-like spring feel: fast attack, gentle overshoot, quick settle.
 */

export interface SpringBody {
  /** Current position */
  x: number;
  y: number;
  /** Current velocity */
  vx: number;
  vy: number;
  /** Target (rest) position */
  tx: number;
  ty: number;
  /** Current rotation (degrees) */
  rotation: number;
  /** Rotation velocity */
  vr: number;
  /** Target rotation */
  tr: number;
  /** Current scale */
  scale: number;
  /** Scale velocity */
  vs: number;
  /** Target scale */
  ts: number;
}

export interface SpringConfig {
  /** Spring stiffness (higher = snappier). Default: 180 */
  stiffness: number;
  /** Damping coefficient (higher = less bounce). Default: 14 */
  damping: number;
  /** Mass of each body. Default: 1 */
  mass: number;
  /** Threshold for considering body at rest */
  restThreshold: number;
}

const DEFAULT_CONFIG: SpringConfig = {
  stiffness: 180,
  damping: 14,
  mass: 1,
  restThreshold: 0.01,
};

export function createSpringBody(
  x: number,
  y: number,
  tx: number,
  ty: number,
  rotation = 0,
  tr = 0,
  scale = 1,
  ts = 1
): SpringBody {
  return { x, y, vx: 0, vy: 0, tx, ty, rotation, vr: 0, tr, scale, vs: 0, ts };
}

/**
 * Advance a spring body by dt seconds using semi-implicit Euler integration.
 * Returns true if the body is at rest (all axes settled).
 */
export function stepSpring(
  body: SpringBody,
  dt: number,
  config: Partial<SpringConfig> = {}
): boolean {
  const { stiffness, damping, mass, restThreshold } = { ...DEFAULT_CONFIG, ...config };

  // Position spring: F = -kx - cv
  const dx = body.x - body.tx;
  const dvx = body.vx;
  const ax = (-stiffness * dx - damping * dvx) / mass;
  body.vx += ax * dt;
  body.x += body.vx * dt;

  const dy = body.y - body.ty;
  const dvy = body.vy;
  const ay = (-stiffness * dy - damping * dvy) / mass;
  body.vy += ay * dt;
  body.y += body.vy * dt;

  // Rotation spring
  const dr = body.rotation - body.tr;
  const dvr = body.vr;
  const ar = (-stiffness * dr - damping * dvr) / mass;
  body.vr += ar * dt;
  body.rotation += body.vr * dt;

  // Scale spring
  const ds = body.scale - body.ts;
  const dvs = body.vs;
  const as = (-stiffness * ds - damping * dvs) / mass;
  body.vs += as * dt;
  body.scale += body.vs * dt;

  // Check if at rest
  const posAtRest =
    Math.abs(dx) < restThreshold &&
    Math.abs(dvx) < restThreshold &&
    Math.abs(dy) < restThreshold &&
    Math.abs(dvy) < restThreshold;
  const rotAtRest =
    Math.abs(dr) < restThreshold &&
    Math.abs(dvr) < restThreshold;
  const scaleAtRest =
    Math.abs(ds) < restThreshold * 0.1 &&
    Math.abs(dvs) < restThreshold * 0.1;

  return posAtRest && rotAtRest && scaleAtRest;
}

/**
 * Check if a spring body has effectively settled (velocity near zero, close to target).
 */
export function isSpringAtRest(body: SpringBody, threshold = 0.1): boolean {
  const dx = Math.abs(body.x - body.tx);
  const dy = Math.abs(body.y - body.ty);
  const vx = Math.abs(body.vx);
  const vy = Math.abs(body.vy);
  return dx < threshold && dy < threshold && vx < threshold && vy < threshold;
}

/**
 * Snap a spring body to its target (instant settle).
 */
export function snapToTarget(body: SpringBody): void {
  body.x = body.tx;
  body.y = body.ty;
  body.vx = 0;
  body.vy = 0;
  body.rotation = body.tr;
  body.vr = 0;
  body.scale = body.ts;
  body.vs = 0;
}
