/**
 * CVRB World Promotion Helper
 *
 * Selects the top-scoring worlds (by quality_score) from a given list and
 * promotes them to benchmark set 1. Optionally promotes any worlds that exceed
 * an exceptional quality threshold, even if they are not in the top-N.
 *
 * Usage:
 *   await promoteWorlds([1,2,3], { promoteTop: 2, exceptionalScore: 0.4 });
 */

import { Op } from 'sequelize';
import World from '../../models/World.js';
import { WorldHelpers } from '../../models/World.js';

/**
 * Promote worlds to benchmark set 1.
 *
 * @param {number[]} worldIds           Array of world IDs to consider.
 * @param {Object}   opts
 * @param {number}   opts.promoteTop    How many of the highest quality worlds
 *                                      to promote. Default: 2.
 * @param {number}   opts.exceptionalScore Quality score threshold for automatic
 *                                      promotion. Default: 0.4.
 * @returns {Promise<Object[]>} Array of updated world records.
 */
export async function promoteWorlds (worldIds, opts = {}) {
  const promoteTop = Number.isFinite(opts.promoteTop) ? opts.promoteTop : 2;
  const exceptionalScore = Number.isFinite(opts.exceptionalScore) ? opts.exceptionalScore : 0.4;

  if (!Array.isArray(worldIds) || worldIds.length === 0) return [];

  const uniqueIds = [...new Set(worldIds)];

  const worlds = await World.findAll({
    where: { id: { [Op.in]: uniqueIds }, is_valid: true },
    order: [['quality_score', 'DESC']]
  });

  if (!worlds.length) return [];

  const topWorlds = worlds.slice(0, promoteTop);

  const additional = worlds.filter(w => w.quality_score > exceptionalScore && !topWorlds.some(t => t.id === w.id));

  const promoteTargets = [...topWorlds, ...additional];

  const updated = [];
  for (const w of promoteTargets) {
    // eslint-disable-next-line no-await-in-loop
    const rec = await WorldHelpers.updateWorldSet(w.id, 1);
    updated.push(rec);
  }

  return updated;
}

