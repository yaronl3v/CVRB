/*
 * BenchmarkReporter – Collects timing and count statistics for CVRB benchmark scripts.
 *
 * Usage:
 *   const reporter = new BenchmarkReporter();
 *   reporter.startCreator('CreatorModelName');
 *   // ... after worlds created
 *   reporter.finishCreatePhase({ valid: 3, invalid: 1 });
 *   // ... after worlds solved
 *   reporter.finishSolvePhase({ solved: 3 });
 *   reporter.endCreator();
 *   // ... after all creators processed
 *   reporter.report();
 */

export class BenchmarkReporter {
  constructor () {
    this._scriptStart = process.hrtime.bigint();
    this._creators = [];
  }

  /**
   * Mark the beginning of processing for a creator model.
   * @param {string} name – Human-readable creator identifier.
   */
  startCreator (name) {
    if (this._current) {
      throw new Error('Previous creator not finished. Call endCreator() first.');
    }

    this._current = {
      name,
      start: process.hrtime.bigint(),
      createTime: 0n,
      solveTime: 0n,
      validWorlds: 0,
      invalidWorlds: 0,
      solvedWorlds: 0,
    };
  }

  /**
   * Mark the end of the creation phase.
   * @param {object} counts – { valid: number, invalid: number }
   */
  finishCreatePhase ({ valid = 0, invalid = 0 } = {}) {
    if (!this._current) throw new Error('startCreator() must be called first');
    const now = process.hrtime.bigint();
    this._current.createTime = now - this._current.start;
    this._current.validWorlds = valid;
    this._current.invalidWorlds = invalid;
    this._current._solveStart = now; // hidden prop for internal timing
  }

  /**
   * Mark the end of the solve phase.
   * @param {object} counts – { solved: number }
   */
  finishSolvePhase ({ solved = 0 } = {}) {
    if (!this._current || !this._current._solveStart) {
      throw new Error('finishCreatePhase() must be called before finishSolvePhase()');
    }
    const now = process.hrtime.bigint();
    this._current.solveTime = now - this._current._solveStart;
    this._current.solvedWorlds = solved;
  }

  /**
   * Finish processing for the current creator.
   */
  endCreator () {
    if (!this._current) throw new Error('startCreator() must be called first');
    this._creators.push(this._current);
    this._current = null;
  }

  /**
   * Output collected statistics to console.
   */
  report () {
    const scriptDuration = process.hrtime.bigint() - this._scriptStart;

    console.log('\n================ Benchmark Summary ================');
    for (const c of this._creators) {
      const totalCreatorTime = c.createTime + c.solveTime;
      console.log(`Creator: ${c.name}`);
      console.log(`  Worlds created: ${c.validWorlds + c.invalidWorlds}`);
      console.log(`    ▸ valid  : ${c.validWorlds}`);
      console.log(`    ▸ invalid: ${c.invalidWorlds}`);
      console.log(`  Create time  : ${this._formatNs(c.createTime)}`);
      console.log(`  Worlds solved: ${c.solvedWorlds}`);
      console.log(`  Solve time   : ${this._formatNs(c.solveTime)}`);
      console.log(`  Total time   : ${this._formatNs(totalCreatorTime)}`);
      console.log('--------------------------------------------------');
    }
    console.log(`Script total time: ${this._formatNs(scriptDuration)}`);
    console.log('==================================================\n');
  }

  /* ------------------------------------------------
   * Helpers
   * ----------------------------------------------*/

  /**
   * Convert bigint nanoseconds to human-readable ms or s.
   * @param {bigint} ns – nanoseconds
   * @returns {string}
   */
  _formatNs (ns) {
    const ms = Number(ns) / 1e6;
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)} s`;
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(0).padStart(2, '0');
    return `${m}:${sec} min`;
  }
}

