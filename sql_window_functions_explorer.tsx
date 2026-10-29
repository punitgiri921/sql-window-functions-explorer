import React, { useState, useMemo, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Database,
  Code2,
  Eye,
  Sparkles,
  Info,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Video,
  ArrowUpDown,
  Brackets,
  Calculator,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

// ============================================================================
// 1. DATASETS FROM BRUCE MOMJIAN'S PRESENTATION
// ============================================================================

const SERIES_DATA = Array.from({ length: 10 }, (_, idx) => ({
  _id: `s-${idx + 1}`,
  origRow: idx + 1,
  x: idx + 1,
}));

const DUP_DATA = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5].map((val, idx) => ({
  _id: `d-${idx + 1}`,
  origRow: idx + 1,
  x: val,
}));

const EMPLOYEE_DATA = [
  { _id: 'e-1', origRow: 1, id: 1, name: 'Mike', department: 'Sales', salary: 7100 },
  { _id: 'e-2', origRow: 2, id: 2, name: 'James', department: 'Engineering', salary: 6600 },
  { _id: 'e-3', origRow: 3, id: 3, name: 'Betty', department: 'Sales', salary: 6300 },
  { _id: 'e-4', origRow: 4, id: 4, name: 'Andy', department: 'Engineering', salary: 5400 },
  { _id: 'e-5', origRow: 5, id: 5, name: 'Sandy', department: 'Sales', salary: 5400 },
  { _id: 'e-6', origRow: 6, id: 6, name: 'Tracy', department: 'Engineering', salary: 4800 },
  { _id: 'e-7', origRow: 7, id: 7, name: 'Carol', department: 'Sales', salary: 4600 },
];

// ============================================================================
// 2. CURATED VIDEO PRESETS (DIRECT SCENARIOS FROM THE TALK)
// ============================================================================

const VIDEO_PRESETS = [
  {
    id: '3-preceding-1898',
    title: '3 PRECEDING (Video @ 31:38)',
    timestamp: '31:38',
    badge: 'Video Link Match',
    description:
      'From your exact video timestamp (t=1898s): ROWS BETWEEN 3 PRECEDING AND CURRENT ROW. Watch the frame bracket slide across at most 4 rows (current row + up to 3 preceding rows), so COUNT grows 1, 2, 3, 4, 4, 4...',
    config: {
      dataset: 'series',
      partitionBy: 'NONE',
      orderBy: 'NONE',
      frameMode: 'ROWS',
      frameStart: 'N_PRECEDING',
      startN: 3,
      frameEnd: 'CURRENT_ROW',
      endN: 1,
      activeRowIdx: 4, // Row 5 (x=5) shows 2+3+4+5 = 14
    },
  },
  {
    id: 'default-over-gotcha',
    title: 'Default OVER () Gotcha',
    timestamp: '16:15',
    badge: 'Meaning #3',
    description:
      'Why does SUM(x) OVER () return 55 for every single row? Because the invisible default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and without ORDER BY, all rows are peers—making CURRENT ROW mean the ENTIRE PARTITION!',
    config: {
      dataset: 'series',
      partitionBy: 'NONE',
      orderBy: 'NONE',
      frameMode: 'RANGE',
      frameStart: 'UNBOUNDED_PRECEDING',
      startN: 3,
      frameEnd: 'CURRENT_ROW',
      endN: 1,
      activeRowIdx: 3,
    },
  },
  {
    id: 'range-vs-rows-no-order',
    title: 'RANGE vs ROWS (No ORDER BY)',
    timestamp: '23:50',
    badge: 'Meaning #1',
    description:
      'Even without ORDER BY, switching from RANGE to ROWS changes CURRENT ROW from "entire partition" to "literal current row", producing a true running sum (1, 3, 6, 10... 55).',
    config: {
      dataset: 'series',
      partitionBy: 'NONE',
      orderBy: 'NONE',
      frameMode: 'ROWS',
      frameStart: 'UNBOUNDED_PRECEDING',
      startN: 3,
      frameEnd: 'CURRENT_ROW',
      endN: 1,
      activeRowIdx: 3,
    },
  },
  {
    id: 'sliding-1-prec-1-foll',
    title: '1 PRECEDING & 1 FOLLOWING',
    timestamp: '32:25',
    badge: 'Centered Window',
    description:
      'A 3-row sliding window centered on the active row (1 row before, current row, 1 row after). Notice how the first and last rows only capture 2 rows in their frame!',
    config: {
      dataset: 'series',
      partitionBy: 'NONE',
      orderBy: 'NONE',
      frameMode: 'ROWS',
      frameStart: 'N_PRECEDING',
      startN: 1,
      frameEnd: 'N_FOLLOWING',
      endN: 1,
      activeRowIdx: 0,
    },
  },
  {
    id: 'peers-in-range',
    title: 'Duplicates in RANGE Mode',
    timestamp: '25:10',
    badge: 'Meaning #2 (Peers)',
    description:
      'With duplicate values (1,1,2,2...) and ORDER BY x, RANGE treats CURRENT ROW as "current row + all peers with the same x". Notice COUNT jumps 2, 2, 4, 4, 6, 6 and SUM jumps 2, 2, 6, 6!',
    config: {
      dataset: 'dup',
      partitionBy: 'NONE',
      orderBy: 'X_ASC',
      frameMode: 'RANGE',
      frameStart: 'UNBOUNDED_PRECEDING',
      startN: 1,
      frameEnd: 'CURRENT_ROW',
      endN: 1,
      activeRowIdx: 2, // first x=2 row
    },
  },
  {
    id: 'peers-in-rows',
    title: 'Duplicates in ROWS Mode',
    timestamp: '27:40',
    badge: 'Row-by-Row',
    description:
      'Same duplicate dataset and ORDER BY x, but using ROWS mode. Now Postgres ignores peers for the frame end and stops strictly at the physical current row: COUNT goes 1, 2, 3, 4, 5, 6!',
    config: {
      dataset: 'dup',
      partitionBy: 'NONE',
      orderBy: 'X_ASC',
      frameMode: 'ROWS',
      frameStart: 'UNBOUNDED_PRECEDING',
      startN: 1,
      frameEnd: 'CURRENT_ROW',
      endN: 1,
      activeRowIdx: 2,
    },
  },
  {
    id: 'red-blue-partitions',
    title: 'Red vs Blue Partitions (x >= 3)',
    timestamp: '35:10',
    badge: 'Partition Boundaries',
    description:
      'Demonstrates PARTITION BY x >= 3 on the duplicate table. The table splits into two independent worlds: the Red partition (x < 3, boolean false) and the Blue partition (x >= 3, boolean true). Window frames never cross partition walls!',
    config: {
      dataset: 'dup',
      partitionBy: 'X_GTE_3',
      orderBy: 'X_ASC',
      frameMode: 'RANGE',
      frameStart: 'UNBOUNDED_PRECEDING',
      startN: 1,
      frameEnd: 'CURRENT_ROW',
      endN: 1,
      activeRowIdx: 4, // first row of Blue partition (x=3)
    },
  },
  {
    id: 'employee-analytics',
    title: 'Employee Dept Salaries',
    timestamp: '41:00',
    badge: 'Real-World Table',
    description:
      'The 7-row employee table from the talk partitioned by department and ordered by salary DESC. Compare departmental running totals, averages, RANK(), and DENSE_RANK().',
    config: {
      dataset: 'employee',
      partitionBy: 'DEPT',
      orderBy: 'SALARY_DESC',
      frameMode: 'RANGE',
      frameStart: 'UNBOUNDED_PRECEDING',
      startN: 1,
      frameEnd: 'UNBOUNDED_FOLLOWING',
      endN: 1,
      activeRowIdx: 1,
    },
  },
];

// ============================================================================
// 3. MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  // --- Window Configuration State ---
  const [dataset, setDataset] = useState('series'); // 'series' | 'dup' | 'employee'
  const [partitionBy, setPartitionBy] = useState('NONE'); // 'NONE' | 'X_GTE_3' | 'X_VAL' | 'DEPT'
  const [orderBy, setOrderBy] = useState('NONE'); // 'NONE' | 'X_ASC' | 'X_DESC' | 'SALARY_DESC' | 'SALARY_ASC'
  const [frameMode, setFrameMode] = useState('ROWS'); // 'RANGE' | 'ROWS'
  const [frameStart, setFrameStart] = useState('N_PRECEDING'); // 'UNBOUNDED_PRECEDING' | 'N_PRECEDING' | 'CURRENT_ROW'
  const [startN, setStartN] = useState(3); // 1..5
  const [frameEnd, setFrameEnd] = useState('CURRENT_ROW'); // 'CURRENT_ROW' | 'N_FOLLOWING' | 'UNBOUNDED_FOLLOWING'
  const [endN, setEndN] = useState(1); // 1..5

  // --- UI & Inspection State ---
  const [activePresetId, setActivePresetId] = useState('3-preceding-1898');
  const [activeRowIdx, setActiveRowIdx] = useState(4); // Default to 5th row (index 4) to clearly show 3 PRECEDING
  const [isPlaying, setIsPlaying] = useState(false);
  const [showImplicitRed, setShowImplicitRed] = useState(true);
  const [useNamedWindow, setUseNamedWindow] = useState(true);
  const [columnFilter, setColumnFilter] = useState('ALL'); // 'ALL' | 'FRAME_ONLY' | 'PARTITION_ONLY'

  // Apply a preset
  const applyPreset = (preset) => {
    setIsPlaying(false);
    setActivePresetId(preset.id);
    setDataset(preset.config.dataset);
    setPartitionBy(preset.config.partitionBy);
    setOrderBy(preset.config.orderBy);
    setFrameMode(preset.config.frameMode);
    setFrameStart(preset.config.frameStart);
    setStartN(preset.config.startN);
    setFrameEnd(preset.config.frameEnd);
    setEndN(preset.config.endN);
    setActiveRowIdx(preset.config.activeRowIdx ?? 0);
  };

  // Switch dataset safely and reset incompatible partition/order settings
  const handleDatasetChange = (newDataset) => {
    setIsPlaying(false);
    setActivePresetId(null);
    setDataset(newDataset);
    setActiveRowIdx(0);

    if (newDataset === 'employee') {
      setPartitionBy('DEPT');
      setOrderBy('SALARY_DESC');
    } else {
      if (partitionBy === 'DEPT') setPartitionBy('NONE');
      if (orderBy === 'SALARY_DESC' || orderBy === 'SALARY_ASC') {
        setOrderBy(newDataset === 'dup' ? 'X_ASC' : 'NONE');
      }
    }
  };

  // Helper to wrap manual control modifications and clear preset highlight
  const updateConfig = (setter, value) => {
    setIsPlaying(false);
    setActivePresetId(null);
    setter(value);
  };

  // ============================================================================
  // 4. POSTGRESQL WINDOW EXECUTION ENGINE (SIMULATION)
  // ============================================================================

  const executionResult = useMemo(() => {
    const rawRows =
      dataset === 'series'
        ? SERIES_DATA
        : dataset === 'dup'
        ? DUP_DATA
        : EMPLOYEE_DATA;

    const valueCol = dataset === 'employee' ? 'salary' : 'x';

    // 1. Assign Partition Keys & Metadata
    const rowsWithPart = rawRows.map((r) => {
      let partKey = 'ALL';
      let partLabel = 'Single Partition (All Rows)';
      let partTheme = 'slate';

      if (dataset !== 'employee') {
        if (partitionBy === 'X_GTE_3') {
          const isBlue = r.x >= 3;
          partKey = isBlue ? 'TRUE_BLUE' : 'FALSE_RED';
          partLabel = isBlue ? 'x >= 3 : true (Blue Partition)' : 'x >= 3 : false (Red Partition)';
          partTheme = isBlue ? 'blue' : 'rose';
        } else if (partitionBy === 'X_VAL') {
          partKey = `X_${r.x}`;
          partLabel = `x = ${r.x}`;
          const themes = ['rose', 'amber', 'emerald', 'sky', 'violet', 'indigo', 'teal', 'orange', 'pink', 'cyan'];
          partTheme = themes[(r.x - 1) % themes.length];
        }
      } else {
        if (partitionBy === 'DEPT') {
          partKey = r.department;
          partLabel = `Dept: ${r.department}`;
          partTheme = r.department === 'Engineering' ? 'indigo' : 'emerald';
        }
      }

      return {
        ...r,
        val: r[valueCol],
        partKey,
        partLabel,
        partTheme,
      };
    });

    // 2. Group into Partitions in Postgres order
    const partitionGroupsMap = new Map();
    const sortedForGrouping = [...rowsWithPart].sort((a, b) => {
      if (partitionBy === 'X_GTE_3') {
        // In Postgres boolean false < true
        const aBool = a.x >= 3 ? 1 : 0;
        const bBool = b.x >= 3 ? 1 : 0;
        if (aBool !== bBool) return aBool - bBool;
      } else if (partitionBy === 'X_VAL') {
        if (a.x !== b.x) return a.x - b.x;
      } else if (partitionBy === 'DEPT') {
        if (a.department !== b.department) return a.department.localeCompare(b.department);
      }
      return a.origRow - b.origRow;
    });

    sortedForGrouping.forEach((row) => {
      if (!partitionGroupsMap.has(row.partKey)) {
        partitionGroupsMap.set(row.partKey, []);
      }
      partitionGroupsMap.get(row.partKey).push(row);
    });

    // 3. Sort each partition by ORDER BY clause and compute window functions
    const processedRows = [];
    let globalIndex = 0;

    // Check if RANGE + N_PRECEDING/N_FOLLOWING without ORDER BY is attempted
    const isRangeOffsetWithoutOrder =
      frameMode === 'RANGE' &&
      orderBy === 'NONE' &&
      (frameStart === 'N_PRECEDING' || frameEnd === 'N_FOLLOWING');

    for (const [, partRows] of partitionGroupsMap.entries()) {
      // Sort within partition
      partRows.sort((a, b) => {
        if (orderBy === 'X_ASC') {
          if (a.x !== b.x) return a.x - b.x;
        } else if (orderBy === 'X_DESC') {
          if (a.x !== b.x) return b.x - a.x;
        } else if (orderBy === 'SALARY_DESC') {
          if (a.salary !== b.salary) return b.salary - a.salary;
        } else if (orderBy === 'SALARY_ASC') {
          if (a.salary !== b.salary) return a.salary - b.salary;
        }
        return a.origRow - b.origRow;
      });

      const P = partRows.length;

      // Precalculate distinct values for DENSE_RANK
      const distinctOrderVals = [];
      partRows.forEach((r) => {
        if (distinctOrderVals.length === 0 || distinctOrderVals[distinctOrderVals.length - 1] !== r.val) {
          distinctOrderVals.push(r.val);
        }
      });

      partRows.forEach((row, partIdx) => {
        // Determine Peers within this partition
        let peerIndices = [];
        if (orderBy === 'NONE') {
          // Without ORDER BY, every row in the partition is a peer of every other row
          peerIndices = partRows.map((_, idx) => idx);
        } else {
          partRows.forEach((candidate, idx) => {
            if (candidate.val === row.val) peerIndices.push(idx);
          });
        }
        const firstPeerPartIdx = peerIndices[0];
        const lastPeerPartIdx = peerIndices[peerIndices.length - 1];

        // Determine Window Frame Indices (within partRows)
        let framePartIndices = [];

        if (frameMode === 'ROWS') {
          let startIdx = 0;
          if (frameStart === 'UNBOUNDED_PRECEDING') startIdx = 0;
          else if (frameStart === 'N_PRECEDING') startIdx = Math.max(0, partIdx - startN);
          else if (frameStart === 'CURRENT_ROW') startIdx = partIdx;

          let endIdx = P - 1;
          if (frameEnd === 'CURRENT_ROW') endIdx = partIdx;
          else if (frameEnd === 'N_FOLLOWING') endIdx = Math.min(P - 1, partIdx + endN);
          else if (frameEnd === 'UNBOUNDED_FOLLOWING') endIdx = P - 1;

          for (let k = startIdx; k <= endIdx; k++) {
            framePartIndices.push(k);
          }
        } else {
          // RANGE mode
          if (orderBy === 'NONE') {
            // Without ORDER BY, all rows are peers, so CURRENT ROW and UNBOUNDED cover the whole partition
            framePartIndices = partRows.map((_, idx) => idx);
          } else {
            const isDesc = orderBy === 'X_DESC' || orderBy === 'SALARY_DESC';
            const unitMultiplier = dataset === 'employee' ? 500 : 1; // For salary range offsets, 1 step = 500

            partRows.forEach((candidate, candIdx) => {
              let afterStart = true;
              if (frameStart === 'UNBOUNDED_PRECEDING') {
                afterStart = true;
              } else if (frameStart === 'CURRENT_ROW') {
                afterStart = candIdx >= firstPeerPartIdx;
              } else if (frameStart === 'N_PRECEDING') {
                const offsetVal = startN * unitMultiplier;
                afterStart = isDesc
                  ? candidate.val <= row.val + offsetVal
                  : candidate.val >= row.val - offsetVal;
              }

              let beforeEnd = true;
              if (frameEnd === 'UNBOUNDED_FOLLOWING') {
                beforeEnd = true;
              } else if (frameEnd === 'CURRENT_ROW') {
                beforeEnd = candIdx <= lastPeerPartIdx;
              } else if (frameEnd === 'N_FOLLOWING') {
                const offsetVal = endN * unitMultiplier;
                beforeEnd = isDesc
                  ? candidate.val >= row.val - offsetVal
                  : candidate.val <= row.val + offsetVal;
              }

              if (afterStart && beforeEnd) {
                framePartIndices.push(candIdx);
              }
            });
          }
        }

        const frameRows = framePartIndices.map((idx) => partRows[idx]);
        const frameValues = frameRows.map((r) => r.val);

        // Compute Frame-Dependent Functions
        const fnCount = frameValues.length;
        const fnSum = frameValues.reduce((acc, v) => acc + v, 0);
        const fnAvg = fnCount > 0 ? (fnSum / fnCount).toFixed(1) : 'NULL';
        const fnFirstVal = fnCount > 0 ? frameValues[0] : 'NULL';
        const fnLastVal = fnCount > 0 ? frameValues[fnCount - 1] : 'NULL';
        const fnNthVal3 = fnCount >= 3 ? frameValues[2] : 'NULL';

        // Compute Partition-Scoped Functions (IGNORE FRAME!)
        const fnRowNumber = partIdx + 1;
        const fnRank = orderBy === 'NONE' ? 1 : firstPeerPartIdx + 1;
        const fnDenseRank =
          orderBy === 'NONE' ? 1 : distinctOrderVals.indexOf(row.val) + 1;
        const fnLag = partIdx > 0 ? partRows[partIdx - 1].val : 'NULL';
        const fnLead = partIdx < P - 1 ? partRows[partIdx + 1].val : 'NULL';

        // Postgres NTILE(3) calculation
        const buckets = 3;
        const baseSize = Math.floor(P / buckets);
        const remainder = P % buckets;
        let fnNtile = 1;
        let boundary = 0;
        for (let b = 1; b <= buckets; b++) {
          const bSize = baseSize + (b <= remainder ? 1 : 0);
          if (partIdx < boundary + bSize) {
            fnNtile = b;
            break;
          }
          boundary += bSize;
        }

        processedRows.push({
          ...row,
          globalIdx: globalIndex,
          partIdx,
          partSize: P,
          isFirstInPart: partIdx === 0,
          isLastInPart: partIdx === P - 1,
          peerPartIndices: peerIndices,
          framePartIndices,
          frameValues,
          // Outputs
          fnCount,
          fnSum,
          fnAvg,
          fnFirstVal,
          fnLastVal,
          fnNthVal3,
          fnRowNumber,
          fnRank,
          fnDenseRank,
          fnLag,
          fnLead,
          fnNtile,
        });

        globalIndex++;
      });
    }

    // Map partition-local indices to global table indices for easy visual highlighting
    const finalRows = processedRows.map((r) => {
      const partStartGlobalIdx = r.globalIdx - r.partIdx;
      return {
        ...r,
        peerGlobalIndices: r.peerPartIndices.map((pi) => partStartGlobalIdx + pi),
        frameGlobalIndices: r.framePartIndices.map((fi) => partStartGlobalIdx + fi),
        partGlobalStart: partStartGlobalIdx,
        partGlobalEnd: partStartGlobalIdx + r.partSize - 1,
      };
    });

    return {
      rows: finalRows,
      valueCol,
      isRangeOffsetWithoutOrder,
    };
  }, [dataset, partitionBy, orderBy, frameMode, frameStart, startN, frameEnd, endN]);

  // Keep activeRowIdx in bounds when dataset changes
  const safeActiveRowIdx = Math.min(
    activeRowIdx,
    Math.max(0, executionResult.rows.length - 1)
  );
  const activeRow = executionResult.rows[safeActiveRowIdx] || executionResult.rows[0];

  // Auto-step animation timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveRowIdx((prev) => (prev + 1) % executionResult.rows.length);
    }, 1300);
    return () => clearInterval(timer);
  }, [isPlaying, executionResult.rows.length]);

  // ============================================================================
  // 5. DETERMINE CURRENT MEANING OF "CURRENT ROW" (FROM THE TALK)
  // ============================================================================

  const currentRowMeaning = useMemo(() => {
    if (frameMode === 'ROWS') {
      return {
        number: 1,
        title: 'Meaning #1: The Literal Current Row',
        short: 'Strictly stops at the physical row being evaluated',
        detail:
          'Because Frame Mode is ROWS, PostgreSQL counts physical rows one by one. Even if multiple rows have identical values (or if ORDER BY is omitted), CURRENT ROW means strictly the single row currently being processed.',
        color: 'emerald',
      };
    }
    if (orderBy !== 'NONE') {
      return {
        number: 2,
        title: 'Meaning #2: Current Row + All Peer Rows',
        short: 'Includes all tied rows sharing the same ORDER BY value',
        detail:
          'Because Frame Mode is RANGE and ORDER BY is active, CURRENT ROW expands to include all "peer" rows that share the exact same ORDER BY value as the active row.',
        color: 'amber',
      };
    }
    return {
      number: 3,
      title: 'Meaning #3: The Entire Partition!',
      short: 'No ORDER BY in RANGE mode means ALL partition rows are peers',
      detail:
        'Because Frame Mode is RANGE and ORDER BY is omitted, PostgreSQL treats every row in the partition as having equal ordering (all rows are peers of each other). Therefore, CURRENT ROW stretches to the very end of the partition!',
      color: 'rose',
    };
  }, [frameMode, orderBy]);

  // ============================================================================
  // 6. SQL QUERY FORMATTER WITH IMPLICIT DEFAULTS HIGHLIGHTING
  // ============================================================================

  const sqlParts = useMemo(() => {
    const valCol = dataset === 'employee' ? 'salary' : 'x';
    const fromClause =
      dataset === 'series'
        ? 'generate_series(1, 10) AS f(x)'
        : dataset === 'dup'
        ? 'dup'
        : 'employee';

    let partText = '';
    if (partitionBy === 'X_GTE_3') partText = 'PARTITION BY x >= 3';
    else if (partitionBy === 'X_VAL') partText = 'PARTITION BY x';
    else if (partitionBy === 'DEPT') partText = 'PARTITION BY department';

    let orderText = '';
    if (orderBy === 'X_ASC') orderText = 'ORDER BY x ASC';
    else if (orderBy === 'X_DESC') orderText = 'ORDER BY x DESC';
    else if (orderBy === 'SALARY_DESC') orderText = 'ORDER BY salary DESC';
    else if (orderBy === 'SALARY_ASC') orderText = 'ORDER BY salary ASC';

    const unitMult = dataset === 'employee' && frameMode === 'RANGE' ? 500 : 1;
    const startText =
      frameStart === 'UNBOUNDED_PRECEDING'
        ? 'UNBOUNDED PRECEDING'
        : frameStart === 'N_PRECEDING'
        ? `${startN * unitMult} PRECEDING`
        : 'CURRENT ROW';

    const endText =
      frameEnd === 'CURRENT_ROW'
        ? 'CURRENT ROW'
        : frameEnd === 'N_FOLLOWING'
        ? `${endN * unitMult} FOLLOWING`
        : 'UNBOUNDED FOLLOWING';

    const isDefaultMode = frameMode === 'RANGE';
    const isDefaultStart = frameStart === 'UNBOUNDED_PRECEDING';
    const isDefaultEnd = frameEnd === 'CURRENT_ROW';
    const isEntireFrameDefault = isDefaultMode && isDefaultStart && isDefaultEnd;

    return {
      valCol,
      fromClause,
      partText,
      orderText,
      frameMode,
      startText,
      endText,
      isDefaultMode,
      isDefaultStart,
      isDefaultEnd,
      isEntireFrameDefault,
    };
  }, [dataset, partitionBy, orderBy, frameMode, frameStart, startN, frameEnd, endN]);

  // Helper for partition color badges
  const getPartitionBadgeClasses = (theme) => {
    switch (theme) {
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'blue':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'indigo':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'sky':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'violet':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/40';
      default:
        return 'bg-slate-700/60 text-slate-300 border-slate-600';
    }
  };

  const getPartitionBarColor = (theme) => {
    switch (theme) {
      case 'rose':
        return 'bg-rose-500';
      case 'blue':
        return 'bg-blue-500';
      case 'emerald':
        return 'bg-emerald-500';
      case 'indigo':
        return 'bg-indigo-500';
      case 'amber':
        return 'bg-amber-500';
      case 'sky':
        return 'bg-sky-500';
      case 'violet':
        return 'bg-violet-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white pb-12">
      {/* ====================================================================
          TOP HEADER
      ==================================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Brackets className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  The Magic of Window Functions in Postgres
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <Video className="w-3 h-3" /> Bruce Momjian Talk Explorer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive visual laboratory for{' '}
                <code className="text-sky-400">PARTITION BY</code>,{' '}
                <code className="text-amber-400">ORDER BY</code>,{' '}
                <code className="text-emerald-400">ROWS vs RANGE</code> &amp; the 3 Meanings of{' '}
                <code className="text-rose-400">CURRENT ROW</code>
              </p>
            </div>
          </div>

          {/* Dataset Quick Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleDatasetChange('series')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                dataset === 'series'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              1..10 Series
            </button>
            <button
              onClick={() => handleDatasetChange('dup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                dataset === 'dup'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Duplicates (1,1..5,5)
            </button>
            <button
              onClick={() => handleDatasetChange('employee')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                dataset === 'employee'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Employee Table (7 rows)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* ====================================================================
            CURATED VIDEO PRESETS BAR
        ==================================================================== */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Video Walkthrough Presets (Click to Load Exact Slide Scenarios)
              </h2>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Starts at your link timestamp <strong className="text-sky-400">@ 31:38 (3 PRECEDING)</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {VIDEO_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500/50 shadow-lg shadow-sky-950/50'
                      : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        {isSelected && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />}
                        {preset.title}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                        {preset.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      {preset.badge}
                    </span>
                    <span className="text-[11px] text-sky-400 font-medium flex items-center">
                      Load <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ====================================================================
            WINDOW CLAUSE BUILDER & LIVE SQL + "CURRENT ROW" MEANING
        ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT 7 COLS: INTERACTIVE CLAUSE CONTROLS */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Interactive Window Specification Builder
                </h2>
              </div>
              <button
                onClick={() => applyPreset(VIDEO_PRESETS[0])}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 transition"
              >
                <RotateCcw className="w-3 h-3" /> Reset to 31:38 Slide
              </button>
            </div>

            {/* Row 1: PARTITION BY & ORDER BY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PARTITION BY */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    1. PARTITION BY
                  </label>
                  <span className="text-[11px] text-slate-400">Splits table into groups</span>
                </div>

                {dataset !== 'employee' ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'NONE', label: 'None (Single Partition)', desc: 'All 10 rows in one partition' },
                      {
                        id: 'X_GTE_3',
                        label: 'PARTITION BY x >= 3',
                        desc: 'Red (< 3) vs Blue (>= 3) from slides',
                      },
                      { id: 'X_VAL', label: 'PARTITION BY x', desc: 'Each distinct value of x is its own partition' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => updateConfig(setPartitionBy, opt.id)}
                        className={`px-3 py-2 rounded-lg text-left border transition-all flex items-center justify-between ${
                          partitionBy === opt.id
                            ? 'bg-sky-500/15 border-sky-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold font-mono">{opt.label}</div>
                          <div className="text-[10px] text-slate-400">{opt.desc}</div>
                        </div>
                        {partitionBy === opt.id && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'NONE', label: 'None (Company-Wide)', desc: 'All 7 employees in one partition' },
                      {
                        id: 'DEPT',
                        label: 'PARTITION BY department',
                        desc: 'Engineering (3) vs Sales (4)',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => updateConfig(setPartitionBy, opt.id)}
                        className={`px-3 py-2 rounded-lg text-left border transition-all flex items-center justify-between ${
                          partitionBy === opt.id
                            ? 'bg-sky-500/15 border-sky-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold font-mono">{opt.label}</div>
                          <div className="text-[10px] text-slate-400">{opt.desc}</div>
                        </div>
                        {partitionBy === opt.id && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ORDER BY */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    2. ORDER BY
                  </label>
                  <span className="text-[11px] text-slate-400">Defines sort &amp; peers</span>
                </div>

                {dataset !== 'employee' ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      {
                        id: 'NONE',
                        label: 'Omitted (No ORDER BY)',
                        desc: 'All rows in partition are treated as peers!',
                      },
                      { id: 'X_ASC', label: 'ORDER BY x ASC', desc: 'Sorts ascending; equal x values are peers' },
                      { id: 'X_DESC', label: 'ORDER BY x DESC', desc: 'Sorts descending (10 down to 1)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => updateConfig(setOrderBy, opt.id)}
                        className={`px-3 py-2 rounded-lg text-left border transition-all flex items-center justify-between ${
                          orderBy === opt.id
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold font-mono">{opt.label}</div>
                          <div className="text-[10px] text-slate-400">{opt.desc}</div>
                        </div>
                        {orderBy === opt.id && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'NONE', label: 'Omitted (No ORDER BY)', desc: 'All employees in partition are peers' },
                      {
                        id: 'SALARY_DESC',
                        label: 'ORDER BY salary DESC',
                        desc: 'Highest paid first (Andy & Sandy tie at 5400)',
                      },
                      { id: 'SALARY_ASC', label: 'ORDER BY salary ASC', desc: 'Lowest paid first' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => updateConfig(setOrderBy, opt.id)}
                        className={`px-3 py-2 rounded-lg text-left border transition-all flex items-center justify-between ${
                          orderBy === opt.id
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold font-mono">{opt.label}</div>
                          <div className="text-[10px] text-slate-400">{opt.desc}</div>
                        </div>
                        {orderBy === opt.id && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: FRAME MODE (RANGE vs ROWS) & FRAME BOUNDS */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    3. Window Frame Clause (Mode &amp; Bounds)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Controls which subset of rows in the partition feeds into Frame-Based functions (COUNT, SUM, AVG, etc.)
                  </p>
                </div>

                {/* RANGE vs ROWS Mode Toggle */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => updateConfig(setFrameMode, 'RANGE')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      frameMode === 'RANGE'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    RANGE
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 font-sans font-normal">
                      SQL Default
                    </span>
                  </button>
                  <button
                    onClick={() => updateConfig(setFrameMode, 'ROWS')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      frameMode === 'ROWS'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ROWS
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 font-sans font-normal">
                      Physical
                    </span>
                  </button>
                </div>
              </div>

              {/* Warning if RANGE + N PRECEDING/FOLLOWING without ORDER BY */}
              {executionResult.isRangeOffsetWithoutOrder && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-200">
                      <strong>PostgreSQL Note:</strong> Using <code className="font-mono">{startN} PRECEDING</code> or{' '}
                      <code className="font-mono">{endN} FOLLOWING</code> without <code className="font-mono">ORDER BY</code> requires{' '}
                      <code className="font-mono font-bold">ROWS</code> mode (since <code className="font-mono">RANGE</code> offsets compare{' '}
                      <code className="font-mono">ORDER BY</code> values).
                    </div>
                  </div>
                  <button
                    onClick={() => updateConfig(setFrameMode, 'ROWS')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shrink-0 hover:bg-amber-400 transition"
                  >
                    Switch to ROWS
                  </button>
                </div>
              )}

              {/* BETWEEN Frame Start AND Frame End */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* FRAME START */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Frame Start (<code className="text-sky-400">BETWEEN ...</code>)
                    </span>
                    {frameStart === 'UNBOUNDED_PRECEDING' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Default Start
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { id: 'UNBOUNDED_PRECEDING', label: 'UNBOUNDED PRECEDING', desc: 'Starts at first row of partition' },
                      {
                        id: 'N_PRECEDING',
                        label: `${startN * (dataset === 'employee' && frameMode === 'RANGE' ? 500 : 1)} PRECEDING`,
                        desc: frameMode === 'ROWS' ? `Starts ${startN} row(s) before current row` : 'Value range offset before current row',
                      },
                      { id: 'CURRENT_ROW', label: 'CURRENT ROW', desc: 'Starts at current row (or first peer)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => updateConfig(setFrameStart, opt.id)}
                        className={`w-full px-3 py-1.5 rounded-lg text-left border transition-all flex items-center justify-between ${
                          frameStart === opt.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono font-bold">{opt.label}</div>
                          <div className="text-[10px] text-slate-400">{opt.desc}</div>
                        </div>
                        {frameStart === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {/* Stepper for N PRECEDING */}
                  {frameStart === 'N_PRECEDING' && (
                    <div className="pt-1 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-300 font-medium">Offset N:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => updateConfig(setStartN, n)}
                            className={`w-7 h-7 rounded-md text-xs font-mono font-bold transition ${
                              startN === n
                                ? 'bg-emerald-500 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* FRAME END */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Frame End (<code className="text-sky-400">AND ...</code>)
                    </span>
                    {frameEnd === 'CURRENT_ROW' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Default End
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { id: 'CURRENT_ROW', label: 'CURRENT ROW', desc: 'Stops at current row (see 3 meanings!)' },
                      {
                        id: 'N_FOLLOWING',
                        label: `${endN * (dataset === 'employee' && frameMode === 'RANGE' ? 500 : 1)} FOLLOWING`,
                        desc: frameMode === 'ROWS' ? `Extends ${endN} row(s) after current row` : 'Value range offset after current row',
                      },
                      { id: 'UNBOUNDED_FOLLOWING', label: 'UNBOUNDED FOLLOWING', desc: 'Extends to last row of partition' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => updateConfig(setFrameEnd, opt.id)}
                        className={`w-full px-3 py-1.5 rounded-lg text-left border transition-all flex items-center justify-between ${
                          frameEnd === opt.id
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono font-bold">{opt.label}</div>
                          <div className="text-[10px] text-slate-400">{opt.desc}</div>
                        </div>
                        {frameEnd === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {/* Stepper for N FOLLOWING */}
                  {frameEnd === 'N_FOLLOWING' && (
                    <div className="pt-1 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-300 font-medium">Offset N:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => updateConfig(setEndN, n)}
                            className={`w-7 h-7 rounded-md text-xs font-mono font-bold transition ${
                              endN === n
                                ? 'bg-emerald-500 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: LIVE SQL QUERY & THE 3 MEANINGS OF "CURRENT ROW" */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-5">
            {/* LIVE POSTGRESQL QUERY CARD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Generated PostgreSQL Query
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImplicitRed(!showImplicitRed)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1.5 ${
                        showImplicitRed
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title="In Bruce Momjian's slides, default clauses are highlighted in red to show what Postgres adds behind the scenes"
                    >
                      <Eye className="w-3 h-3" />
                      {showImplicitRed ? 'Defaults in Red: ON' : 'Defaults in Red: OFF'}
                    </button>
                    <button
                      onClick={() => setUseNamedWindow(!useNamedWindow)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                    >
                      {useNamedWindow ? 'Named WINDOW w' : 'Inline OVER (...)'}
                    </button>
                  </div>
                </div>

                {/* Code Block */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto">
                  <div className="text-slate-300">
                    <span className="text-sky-400 font-bold">SELECT</span>{' '}
                    {dataset === 'employee' ? 'name, department, salary,' : 'x,'}
                  </div>
                  <div className="pl-4 text-slate-300">
                    <span className="text-emerald-400">COUNT</span>({sqlParts.valCol}){' '}
                    <span className="text-sky-400 font-bold">OVER</span> {useNamedWindow ? 'w' : '(...)'},{' '}
                    <span className="text-emerald-400">SUM</span>({sqlParts.valCol}){' '}
                    <span className="text-sky-400 font-bold">OVER</span> {useNamedWindow ? 'w' : '(...)'},
                  </div>
                  <div className="pl-4 text-slate-300">
                    <span className="text-violet-400">ROW_NUMBER</span>(){' '}
                    <span className="text-sky-400 font-bold">OVER</span> {useNamedWindow ? 'w' : '(...)'},{' '}
                    <span className="text-violet-400">RANK</span>(){' '}
                    <span className="text-sky-400 font-bold">OVER</span> {useNamedWindow ? 'w' : '(...)'}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-sky-400 font-bold">FROM</span> {sqlParts.fromClause}
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-800/80 text-slate-200">
                    <span className="text-sky-400 font-bold">WINDOW</span> w{' '}
                    <span className="text-sky-400 font-bold">AS</span> (
                    <div className="pl-4 space-y-1 my-1">
                      {sqlParts.partText && (
                        <div className="text-sky-300 font-bold">{sqlParts.partText}</div>
                      )}
                      {sqlParts.orderText && (
                        <div className="text-amber-300 font-bold">{sqlParts.orderText}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-1.5">
                        <span
                          className={
                            showImplicitRed && sqlParts.isDefaultMode
                              ? 'text-rose-400 font-bold underline decoration-rose-500/50 decoration-dotted'
                              : 'text-emerald-300 font-bold'
                          }
                        >
                          {sqlParts.frameMode}
                        </span>
                        <span className="text-slate-400">BETWEEN</span>
                        <span
                          className={
                            showImplicitRed && sqlParts.isDefaultStart
                              ? 'text-rose-400 font-bold underline decoration-rose-500/50 decoration-dotted'
                              : 'text-emerald-300 font-bold'
                          }
                        >
                          {sqlParts.startText}
                        </span>
                        <span className="text-slate-400">AND</span>
                        <span
                          className={
                            showImplicitRed && sqlParts.isDefaultEnd
                              ? 'text-rose-400 font-bold underline decoration-rose-500/50 decoration-dotted'
                              : 'text-emerald-300 font-bold'
                          }
                        >
                          {sqlParts.endText}
                        </span>
                      </div>
                    </div>
                    );
                  </div>
                </div>
              </div>

              {showImplicitRed && (
                <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-2 bg-rose-950/20 border border-rose-500/20 px-3 py-2 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <span>
                    Clauses highlighted in <strong className="text-rose-400">red</strong> match PostgreSQL&apos;s
                    implicit defaults (used automatically even if omitted from <code className="text-slate-300">OVER ()</code>).
                  </span>
                </div>
              )}
            </div>

            {/* THE 3 MEANINGS OF "CURRENT ROW" CALLOUT */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Bruce Momjian&apos;s Key Insight: The 3 Meanings of <code className="text-rose-400">CURRENT ROW</code>
                  </h3>
                </div>
              </div>

              {/* 3 Pill Indicators */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { num: 1, label: '1. Literal Row', sub: 'ROWS mode' },
                  { num: 2, label: '2. Peer Group', sub: 'RANGE + ORDER BY' },
                  { num: 3, label: '3. Whole Partition', sub: 'RANGE + No ORDER' },
                ].map((item) => {
                  const isActive = currentRowMeaning.number === item.num;
                  return (
                    <div
                      key={item.num}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isActive
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-950'
                          : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] opacity-80">{item.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Active Meaning Explanation */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  Active Now: {currentRowMeaning.title}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{currentRowMeaning.detail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            INTERACTIVE VISUALIZER TABLE & LIVE STEP-BY-STEP INSPECTOR
        ==================================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT 8 COLS: INTERACTIVE WINDOW FRAME & PARTITION TABLE */}
          <div className="xl:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Interactive Row Stepper:
                </span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveRowIdx((prev) =>
                        prev > 0 ? prev - 1 : executionResult.rows.length - 1
                      );
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="Previous Row"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                      isPlaying
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-sky-600 text-white hover:bg-sky-500'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Auto-Step Rows
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveRowIdx((prev) => (prev + 1) % executionResult.rows.length);
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="Next Row"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  (Or click any row below to inspect its window frame)
                </span>
              </div>

              {/* Function Column Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {[
                  { id: 'ALL', label: 'All Functions' },
                  { id: 'FRAME_ONLY', label: 'Frame Functions Only' },
                  { id: 'PARTITION_ONLY', label: 'Ranking / Offset Only' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setColumnFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      columnFilter === tab.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Legend Bar */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-3 h-3 rounded bg-sky-500 inline-block ring-2 ring-sky-400/50" />
                  <strong>Active Current Row</strong> (Row #{safeActiveRowIdx + 1})
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400 inline-block" />
                  <strong>Inside Window Frame</strong> ({activeRow?.frameGlobalIndices.length || 0} rows)
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    PEER
                  </span>
                  Same ORDER BY value
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Partition: <strong className="text-slate-200">{activeRow?.partLabel}</strong>
              </div>
            </div>

            {/* Interactive Result Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Top Category Grouping Header */}
                  <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] uppercase tracking-wider">
                    <th colSpan={dataset === 'employee' ? 5 : 3} className="py-2 px-3 text-slate-400 font-bold border-r border-slate-800">
                      Partition, Frame Bracket &amp; Input Data
                    </th>
                    {columnFilter !== 'PARTITION_ONLY' && (
                      <th
                        colSpan={6}
                        className="py-2 px-3 bg-emerald-950/30 text-emerald-300 font-bold border-r border-slate-800"
                      >
                        <div className="flex items-center justify-between">
                          <span>Frame-Dependent Functions (Use Green Bracket Rows)</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px]">
                            Affected by ROWS/RANGE &amp; Bounds
                          </span>
                        </div>
                      </th>
                    )}
                    {columnFilter !== 'FRAME_ONLY' && (
                      <th colSpan={6} className="py-2 px-3 bg-violet-950/30 text-violet-300 font-bold">
                        <div className="flex items-center justify-between">
                          <span>Partition-Scoped Functions (Ignore Frame Bounds!)</span>
                          <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[9px]">
                            Whole Partition Only
                          </span>
                        </div>
                      </th>
                    )}
                  </tr>

                  {/* Column Names Header */}
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-mono text-slate-300">
                    <th className="py-2.5 pl-3 pr-2 w-24">Partition</th>
                    <th className="py-2.5 px-2 w-36">Window Frame</th>
                    {dataset === 'employee' ? (
                      <>
                        <th className="py-2.5 px-3">name</th>
                        <th className="py-2.5 px-3">dept</th>
                        <th className="py-2.5 px-3 font-bold text-amber-300 border-r border-slate-800">
                          salary
                        </th>
                      </>
                    ) : (
                      <th className="py-2.5 px-4 font-bold text-amber-300 border-r border-slate-800">
                        x
                      </th>
                    )}

                    {/* Frame-Based Columns */}
                    {columnFilter !== 'PARTITION_ONLY' && (
                      <>
                        <th className="py-2.5 px-3 text-emerald-300 font-bold bg-emerald-950/10">
                          count
                        </th>
                        <th className="py-2.5 px-3 text-emerald-300 font-bold bg-emerald-950/10">
                          sum
                        </th>
                        <th className="py-2.5 px-3 text-emerald-300 bg-emerald-950/10">avg</th>
                        <th className="py-2.5 px-3 text-emerald-300 bg-emerald-950/10">
                          first_val
                        </th>
                        <th className="py-2.5 px-3 text-emerald-300 bg-emerald-950/10">
                          last_val
                        </th>
                        <th className="py-2.5 px-3 text-emerald-300 bg-emerald-950/10 border-r border-slate-800">
                          nth_val(3)
                        </th>
                      </>
                    )}

                    {/* Partition-Based Columns */}
                    {columnFilter !== 'FRAME_ONLY' && (
                      <>
                        <th className="py-2.5 px-3 text-violet-300 bg-violet-950/10">row_num</th>
                        <th className="py-2.5 px-3 text-violet-300 font-bold bg-violet-950/10">
                          rank
                        </th>
                        <th className="py-2.5 px-3 text-violet-300 font-bold bg-violet-950/10">
                          dense_rank
                        </th>
                        <th className="py-2.5 px-3 text-violet-300 bg-violet-950/10">lag</th>
                        <th className="py-2.5 px-3 text-violet-300 bg-violet-950/10">lead</th>
                        <th className="py-2.5 px-3 text-violet-300 bg-violet-950/10">ntile(3)</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                  {executionResult.rows.map((row) => {
                    const isCurrentRow = row.globalIdx === safeActiveRowIdx;
                    const isInActivePartition =
                      row.partKey === activeRow?.partKey;
                    const isInFrame =
                      activeRow?.frameGlobalIndices.includes(row.globalIdx) ?? false;
                    const isFrameStart =
                      isInFrame &&
                      activeRow?.frameGlobalIndices[0] === row.globalIdx;
                    const isFrameEnd =
                      isInFrame &&
                      activeRow?.frameGlobalIndices[
                        activeRow.frameGlobalIndices.length - 1
                      ] === row.globalIdx;
                    const isPeerOfActive =
                      !isCurrentRow &&
                      (activeRow?.peerGlobalIndices.includes(row.globalIdx) ?? false);

                    return (
                      <tr
                        key={row._id}
                        onClick={() => {
                          setIsPlaying(false);
                          setActiveRowIdx(row.globalIdx);
                        }}
                        className={`cursor-pointer transition-colors relative ${
                          row.isFirstInPart && row.globalIdx > 0
                            ? 'border-t-2 border-t-sky-500/60'
                            : ''
                        } ${
                          isCurrentRow
                            ? 'bg-sky-500/20 hover:bg-sky-500/25'
                            : isInFrame
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                            : !isInActivePartition
                            ? 'opacity-45 hover:opacity-80 bg-slate-950/40'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        {/* 1. PARTITION INDICATOR */}
                        <td className="py-2.5 pl-3 pr-2 relative">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-7 rounded-full ${getPartitionBarColor(
                                row.partTheme
                              )}`}
                            />
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-sans font-semibold ${getPartitionBadgeClasses(
                                row.partTheme
                              )}`}
                            >
                              {partitionBy === 'NONE'
                                ? `P1 (#${row.partIdx + 1})`
                                : partitionBy === 'X_GTE_3'
                                ? row.x >= 3
                                  ? 'BLUE >=3'
                                  : 'RED <3'
                                : partitionBy === 'DEPT'
                                ? row.department.slice(0, 5)
                                : `x=${row.x}`}
                            </span>
                          </div>
                        </td>

                        {/* 2. VISUAL WINDOW FRAME BRACKET */}
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5 h-7">
                            {/* Visual Bracket Bar */}
                            <div className="w-4 h-full flex items-center justify-center relative">
                              {isInFrame && (
                                <div
                                  className={`w-2.5 bg-emerald-400/90 h-full ${
                                    isFrameStart && isFrameEnd
                                      ? 'rounded-md border-2 border-emerald-200'
                                      : isFrameStart
                                      ? 'rounded-t-md border-t-2 border-x-2 border-emerald-200'
                                      : isFrameEnd
                                      ? 'rounded-b-md border-b-2 border-x-2 border-emerald-200'
                                      : 'border-x-2 border-emerald-300/80'
                                  }`}
                                />
                              )}
                            </div>

                            {/* Status Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {isCurrentRow && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-sky-500 text-slate-950 shadow">
                                  CURRENT ROW
                                </span>
                              )}
                              {isPeerOfActive && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  PEER
                                </span>
                              )}
                              {!isCurrentRow && !isPeerOfActive && isInFrame && (
                                <span className="text-[10px] font-sans text-emerald-300/90 font-medium">
                                  In Frame
                                </span>
                              )}
                              {!isInFrame && isInActivePartition && (
                                <span className="text-[10px] font-sans text-slate-500">
                                  Outside Frame
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. INPUT COLUMNS */}
                        {dataset === 'employee' ? (
                          <>
                            <td className="py-2.5 px-3 font-sans font-medium text-white">
                              {row.name}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-xs text-slate-300">
                              {row.department}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-amber-300 border-r border-slate-800">
                              {row.salary}
                            </td>
                          </>
                        ) : (
                          <td className="py-2.5 px-4 font-bold text-base text-amber-300 border-r border-slate-800">
                            {row.x}
                          </td>
                        )}

                        {/* 4. FRAME-DEPENDENT FUNCTION OUTPUTS */}
                        {columnFilter !== 'PARTITION_ONLY' && (
                          <>
                            <td
                              className={`py-2.5 px-3 font-bold ${
                                isCurrentRow
                                  ? 'text-emerald-300 bg-emerald-500/20'
                                  : 'text-emerald-200'
                              }`}
                            >
                              {row.fnCount}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-bold ${
                                isCurrentRow
                                  ? 'text-emerald-300 bg-emerald-500/20'
                                  : 'text-emerald-200'
                              }`}
                            >
                              {row.fnSum}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">{row.fnAvg}</td>
                            <td className="py-2.5 px-3 text-slate-300">{row.fnFirstVal}</td>
                            <td className="py-2.5 px-3 text-slate-300">{row.fnLastVal}</td>
                            <td className="py-2.5 px-3 text-slate-400 border-r border-slate-800">
                              {row.fnNthVal3}
                            </td>
                          </>
                        )}

                        {/* 5. PARTITION-SCOPED FUNCTION OUTPUTS */}
                        {columnFilter !== 'FRAME_ONLY' && (
                          <>
                            <td className="py-2.5 px-3 text-violet-200">{row.fnRowNumber}</td>
                            <td className="py-2.5 px-3 font-bold text-violet-300">
                              {row.fnRank}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-violet-300">
                              {row.fnDenseRank}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{row.fnLag}</td>
                            <td className="py-2.5 px-3 text-slate-400">{row.fnLead}</td>
                            <td className="py-2.5 px-3 text-slate-300">{row.fnNtile}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT 4 COLS: LIVE ROW-BY-ROW MATH & LOGIC INSPECTOR */}
          <div className="xl:col-span-4 space-y-5">
            {activeRow && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Active Row Inspector (Row #{safeActiveRowIdx + 1})
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500 text-slate-950">
                    {dataset === 'employee'
                      ? `${activeRow.name} (${activeRow.salary})`
                      : `x = ${activeRow.x}`}
                  </span>
                </div>

                {/* Step 1: Partition Scope */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 uppercase">
                      Step 1: Partition Boundary
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {activeRow.partSize} rows in partition
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    This row belongs to <strong>{activeRow.partLabel}</strong> (Row{' '}
                    <code className="text-sky-300">#{activeRow.partIdx + 1}</code> of{' '}
                    <code className="text-sky-300">{activeRow.partSize}</code> inside its partition).
                    Window functions never see rows outside this partition.
                  </p>
                </div>

                {/* Step 2: Frame Bracket & Step-by-Step Arithmetic */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase">
                      Step 2: Active Window Frame Math
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                      {activeRow.frameValues.length} row(s) in frame
                    </span>
                  </div>

                  {/* Visual Pills of Values inside the Frame */}
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1.5">
                      Values captured inside the green frame bracket:
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeRow.frameValues.map((v, idx) => (
                        <React.Fragment key={idx}>
                          <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                            {v}
                          </span>
                          {idx < activeRow.frameValues.length - 1 && (
                            <span className="text-slate-500 font-mono text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Step-by-Step Formulas */}
                  <div className="space-y-1.5 pt-2 border-t border-emerald-500/20 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">COUNT({executionResult.valueCol}):</span>
                      <span className="text-emerald-300 font-bold">
                        {activeRow.fnCount} row(s)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">SUM({executionResult.valueCol}):</span>
                      <span className="text-emerald-300 font-bold">
                        {activeRow.frameValues.join(' + ')} = {activeRow.fnSum}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">AVG({executionResult.valueCol}):</span>
                      <span className="text-slate-200">
                        {activeRow.fnSum} / {activeRow.fnCount} = {activeRow.fnAvg}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">FIRST / LAST_VALUE:</span>
                      <span className="text-slate-200">
                        first = <strong>{activeRow.fnFirstVal}</strong>, last ={' '}
                        <strong>{activeRow.fnLastVal}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3: Partition-Scoped Ranking & Offset Explanation */}
                <div className="bg-violet-950/20 border border-violet-500/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-300 uppercase">
                      Step 3: Ranking &amp; Offset (Ignores Frame!)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                      Partition-Wide
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    As Bruce Momjian highlights, <code className="text-violet-300">ROW_NUMBER</code>,{' '}
                    <code className="text-violet-300">RANK</code>,{' '}
                    <code className="text-violet-300">DENSE_RANK</code>,{' '}
                    <code className="text-violet-300">LAG</code>, and{' '}
                    <code className="text-violet-300">LEAD</code> completely ignore{' '}
                    <code className="text-emerald-300">ROWS/RANGE BETWEEN...</code> and operate across
                    the entire partition:
                  </p>

                  <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                    <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">ROW_NUMBER</div>
                      <div className="text-sm font-bold text-violet-300">
                        {activeRow.fnRowNumber}
                      </div>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">RANK</div>
                      <div className="text-sm font-bold text-violet-300">
                        {activeRow.fnRank}
                      </div>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">DENSE_RANK</div>
                      <div className="text-sm font-bold text-violet-300">
                        {activeRow.fnDenseRank}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Cheat-Sheet Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                <Info className="w-4 h-4 text-sky-400" />
                Quick Takeaway Summary
              </div>
              <ul className="space-y-2 text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Why <code className="text-amber-300">LAST_VALUE(x)</code> often surprises people:</strong>{' '}
                    With the default frame ending at <code className="text-rose-300">CURRENT ROW</code>,{' '}
                    <code className="text-emerald-300">LAST_VALUE</code> just returns the current row&apos;s value! Change Frame End to{' '}
                    <code className="text-emerald-300">UNBOUNDED FOLLOWING</code> to get the partition&apos;s true last value.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>When to choose <code className="text-emerald-300">ROWS</code> vs <code className="text-rose-300">RANGE</code>:</strong>{' '}
                    Use <code className="text-emerald-300">ROWS</code> when you want a deterministic row-by-row running total or moving average (like <code className="text-emerald-300">3 PRECEDING</code>), and <code className="text-rose-300">RANGE</code> when tied values should receive identical cumulative totals.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}