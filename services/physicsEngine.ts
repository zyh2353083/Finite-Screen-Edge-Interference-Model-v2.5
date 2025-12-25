
import { SimParams, DataPoint } from '../types';

/**
 * 物理核心：有限尺寸屏干涉模型
 * E_total = E_slit (缝隙衍射) + E_edges (板左右边缘绕射)
 */
export const simulateDiffraction = (params: SimParams, angles: number[]): DataPoint[] => {
  const { wavelength, distL1, distL2, slitWidth, screenWidth, enableEdges } = params;
  const k = (2 * Math.PI) / wavelength;
  
  // 离散采样设置
  const N_SLIT = 100;
  const slitPoints = Array.from({ length: N_SLIT }, (_, i) => -slitWidth / 2 + (i * slitWidth) / (N_SLIT - 1));
  
  // 板边缘位置 (例如 300mm 板，边缘在 +/- 150mm)
  const edgePoints = [-screenWidth / 2, screenWidth / 2];

  const results: DataPoint[] = [];

  for (const theta of angles) {
    const thetaRad = (theta * Math.PI) / 180;
    const detX = distL2 * Math.sin(thetaRad);
    const detZ = distL2 * Math.cos(thetaRad);

    // 1. 计算缝隙贡献 E_slit
    let slitRe = 0, slitIm = 0;
    for (const xs of slitPoints) {
      const r1 = Math.sqrt(distL1 * distL1 + xs * xs);
      const r2 = Math.sqrt(detZ * detZ + (detX - xs) * (detX - xs));
      const phase = k * (r1 + r2);
      const amp = 1.0 / (Math.sqrt(r1) * Math.sqrt(r2));
      slitRe += amp * Math.cos(phase);
      slitIm += amp * Math.sin(phase);
    }

    // 2. 计算边缘贡献 E_edges
    let edgeRe = 0, edgeIm = 0;
    if (enableEdges) {
      for (const xe of edgePoints) {
        const r1 = Math.sqrt(distL1 * distL1 + xe * xe);
        const r2 = Math.sqrt(detZ * detZ + (detX - xe) * (detX - xe));
        // 边缘绕射通常伴随额外的相位滞后（约 pi/2 或由几何路径决定）
        // 在该特定装置下，边缘波与缝隙中心波在 L2=60cm 处趋于反相
        const phase = k * (r1 + r2) + Math.PI * 0.85; 
        const edgeAmp = 1.8 / (Math.sqrt(r1) * Math.sqrt(r2)); 
        edgeRe += edgeAmp * Math.cos(phase);
        edgeIm += edgeAmp * Math.sin(phase);
      }
    }

    // 矢量叠加
    const totalRe = slitRe + edgeRe;
    const totalIm = slitIm + edgeIm;
    const intensity = totalRe * totalRe + totalIm * totalIm;

    results.push({ theta, intensity });
  }

  const maxI = Math.max(...results.map(r => r.intensity));
  return results.map(r => ({ ...r, intensity: (r.intensity / (maxI || 1)) * 100 }));
};
