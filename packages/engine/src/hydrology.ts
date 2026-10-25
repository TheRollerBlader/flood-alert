export interface DepthInput {
  dischargeCfs: number;
  qBaseCfs: number;
  alpha: number;
  beta: number;
  gamma: number;
  rainfallInches: number;
}

/**
 * D(t) = max(0, alpha * max(0, Q(t - tau) - Q_base) ^ beta + gamma * P_inches)
 * Baseflow at or below Q_base stays dry when rainfall is zero.
 */
export function predictDepth(input: DepthInput): number {
  const excess = Math.max(0, input.dischargeCfs - input.qBaseCfs);
  const fromFlow = input.alpha * Math.pow(excess, input.beta);
  const fromRain = input.gamma * Math.max(0, input.rainfallInches);
  const depth = fromFlow + fromRain;
  if (!Number.isFinite(depth) || depth <= 0) return 0;
  return depth;
}

export function dischargeForDepth(input: {
  depthFt: number;
  qBaseCfs: number;
  alpha: number;
  beta: number;
}): number {
  if (input.depthFt <= 0 || input.alpha <= 0 || input.beta <= 0) {
    return input.qBaseCfs;
  }
  const excess = Math.pow(input.depthFt / input.alpha, 1 / input.beta);
  return input.qBaseCfs + excess;
}
