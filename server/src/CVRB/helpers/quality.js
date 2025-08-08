/**
 * Quality score calculation utilities.
 *
 * Computes a 0-1 quality score for a CVRB world given the score distribution
 * of all solver models. A higher value indicates better separation between
 * the top and bottom performing solvers and a larger standard deviation.
 *
 * Formula (v2):
 *   quality = (0.4 * spread + 0.4 * pair_avg + 0.2 * distinct) / Q
 * where
 *   spread   = max(scores) - min(scores)
 *   pair_avg = mean of all pair-wise absolute gaps between scores
 *   distinct = number of distinct score levels minus 1
 *   Q        = maximum possible score (default 5, use 100 for percentage inputs)
 *
 * @param {number[]} scores - Array of numeric scores for each solver.
 * @param {number} [Q=5]    - Scaling factor representing the theoretical
 *                            maximum spread. For percentage inputs (0-100)
 *                            pass Q = 100.
 * @returns {number}        - Quality score clamped to the 0-1 range.
 */
export function quality (scores = [], Q = 5) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return 0;
  }

  // Early return when there is only one score – no separation possible.
  if (scores.length === 1) {
    return 0;
  }

  const top = Math.max(...scores);
  const bot = Math.min(...scores);
  const spread = top - bot; // 0 – Q

  // Mean pair-wise distance between scores
  let pairSum = 0;
  let pairCount = 0;
  for (let i = 0; i < scores.length - 1; i++) {
    for (let j = i + 1; j < scores.length; j++) {
      pairSum += Math.abs(scores[i] - scores[j]);
      pairCount++;
    }
  }
  const pair_avg = pairCount > 0 ? pairSum / pairCount : 0;

  // Number of distinct score levels minus 1 (0‒len-1)
  const distinct = new Set(scores).size - 1;

  const qualityRaw = (0.4 * spread + 0.4 * pair_avg + 0.2 * distinct) / Q;

  // Clamp result to [0, 1] just in case of numeric edge-cases.
  return Math.max(0, Math.min(1, qualityRaw));
}

