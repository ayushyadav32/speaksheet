import React, { useMemo } from 'react';
import { LeadRecord } from '../../types/spreadsheet';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  ShieldCheck, 
  Layers, 
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Database,
  Hash,
  FileSpreadsheet
} from 'lucide-react';

interface AnalyticsViewProps {
  data: LeadRecord[];
  datasetId?: string;
  isDemo?: boolean;
}

// Convert column key to clean Human-Readable Title Case
const formatLabel = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  data, 
  datasetId = 'sales_pipeline',
  isDemo
}) => {
  const isBirth = datasetId === 'birth_registration';
  const isBudget = datasetId === 'event_budget';
  const isSales = datasetId === 'sales_pipeline';

  // Demo status: only true if explicitly flagged or matching standard demo ids
  const effectiveIsDemo = isDemo !== undefined 
    ? isDemo 
    : (isBirth || isBudget || (isSales && !datasetId.startsWith('csv_') && !datasetId.startsWith('fresh_')));

  // Dynamic column detection and schema discovery for imported CSV files
  const dynamicAnalysis = useMemo(() => {
    if (effectiveIsDemo || !data || data.length === 0) return null;

    // Discover all unique keys present across all rows (including raw CSV attributes)
    const allKeys = Array.from(new Set(data.flatMap(row => Object.keys(row))));
    const systemKeys = new Set(['id', 'isDuplicate']);

    const numericCandidates: { 
      key: string; 
      sum: number; 
      avg: number; 
      min: number; 
      max: number; 
      count: number; 
      variance: boolean 
    }[] = [];

    const categoricalCandidates: { 
      key: string; 
      uniqueCount: number; 
      valueCounts: Map<string, number> 
    }[] = [];

    allKeys.forEach(key => {
      if (systemKeys.has(key)) return;

      let numCount = 0;
      let validNumericSum = 0;
      let minVal = Infinity;
      let maxVal = -Infinity;
      const valueMap = new Map<string, number>();

      data.forEach(row => {
        const val = (row as any)[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          const strVal = String(val).trim();
          valueMap.set(strVal, (valueMap.get(strVal) || 0) + 1);

          // Check if numeric
          const parsed = typeof val === 'number' ? val : Number(strVal.replace(/[^0-9.-]+/g, ''));
          if (!isNaN(parsed) && strVal !== '' && !strVal.startsWith('+') && strVal.length < 15) {
            numCount++;
            validNumericSum += parsed;
            if (parsed < minVal) minVal = parsed;
            if (parsed > maxVal) maxVal = parsed;
          }
        }
      });

      const isPredominantlyNumeric = numCount > data.length * 0.45;

      if (isPredominantlyNumeric && minVal !== Infinity) {
        numericCandidates.push({
          key,
          sum: validNumericSum,
          avg: numCount > 0 ? validNumericSum / numCount : 0,
          min: minVal,
          max: maxVal,
          count: numCount,
          variance: minVal !== maxVal
        });
      }

      // Check categorical suitability: between 2 and 40 unique values
      if (valueMap.size >= 2 && valueMap.size <= Math.min(40, Math.max(3, data.length * 0.95))) {
        categoricalCandidates.push({
          key,
          uniqueCount: valueMap.size,
          valueCounts: valueMap
        });
      }
    });

    // Score and pick primary numeric column
    const preferredNumeric = [
      'total_runs', 'batsman_runs', 'runs', 'dealValue', 'amount', 'price', 
      'leadScore', 'score', 'quantity', 'cost', 'revenue', 'weight', 'balance'
    ];
    numericCandidates.sort((a, b) => {
      const aPref = preferredNumeric.indexOf(a.key);
      const bPref = preferredNumeric.indexOf(b.key);
      if (aPref !== -1 && bPref !== -1) return aPref - bPref;
      if (aPref !== -1) return -1;
      if (bPref !== -1) return 1;
      if (a.variance && !b.variance) return -1;
      if (!a.variance && b.variance) return 1;
      return 0;
    });

    const primaryNumeric = numericCandidates[0] || null;

    // Score and pick primary & secondary categorical columns
    const preferredCat = [
      'batting_team', 'bowling_team', 'industry', 'stage', 'department', 
      'status', 'company', 'category', 'city', 'team', 'winner', 'role'
    ];
    categoricalCandidates.sort((a, b) => {
      const aPref = preferredCat.indexOf(a.key);
      const bPref = preferredCat.indexOf(b.key);
      if (aPref !== -1 && bPref !== -1) return aPref - bPref;
      if (aPref !== -1) return -1;
      if (bPref !== -1) return 1;
      const aScore = Math.abs(a.uniqueCount - 7);
      const bScore = Math.abs(b.uniqueCount - 7);
      return aScore - bScore;
    });

    const primaryCategorical = categoricalCandidates[0] || null;
    const secondaryCategorical = categoricalCandidates.find(c => c.key !== primaryCategorical?.key) || primaryCategorical;

    // Calculate Data Completeness Score %
    let totalCells = 0;
    let filledCells = 0;
    data.forEach(row => {
      allKeys.forEach(k => {
        if (!systemKeys.has(k)) {
          totalCells++;
          const val = (row as any)[k];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            filledCells++;
          }
        }
      });
    });
    const completenessScore = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 100;
    const duplicateCount = data.filter(d => d.isDuplicate).length;

    return {
      allKeys,
      primaryNumeric,
      primaryCategorical,
      secondaryCategorical,
      completenessScore,
      duplicateCount,
      totalRecords: data.length
    };
  }, [data, effectiveIsDemo]);

  // 1. KPI Calculations (Context-Aware for Demos, Fully Dynamic for Imported CSVs)
  const metrics = useMemo(() => {
    // Demo 1: Birth Registry
    if (effectiveIsDemo && isBirth) {
      const totalWeight = data.reduce((acc, curr) => acc + curr.dealValue, 0);
      const avgWeight = data.length ? Math.round(totalWeight / data.length) : 0;
      const healthyApgarCount = data.filter(d => d.leadScore >= 85).length;
      const apgarRate = data.length ? Math.round((healthyApgarCount / data.length) * 100) : 0;
      const wonCount = data.filter(d => d.stage === 'Won').length;
      const wonRate = data.length ? Math.round((wonCount / data.length) * 100) : 0;
      const cleanIds = data.filter(d => d.email.startsWith('REG-')).length;
      const hygieneScore = data.length ? Math.round((cleanIds / data.length) * 100) : 100;

      return {
        totalMetric: `${(totalWeight / 1000).toFixed(1)} kg`,
        totalLabel: 'Cohort Weight',
        avgMetric: `${avgWeight.toLocaleString()} g`,
        avgLabel: 'Mean Infant Weight',
        vipMetric: `${apgarRate}%`,
        vipLabel: 'Optimal APGAR (≥85)',
        winMetric: `${wonRate}%`,
        winLabel: 'Verified Registration',
        hygieneScore,
        hygieneLabel: 'Registry Integrity',
        totalCount: data.length
      };
    }

    // Demo 2: Event Budget
    if (effectiveIsDemo && isBudget) {
      const totalAllocated = data.reduce((acc, curr) => acc + curr.dealValue, 0);
      const totalSpent = data.reduce((acc, curr) => acc + curr.leadScore, 0);
      const overBudgetItems = data.filter(d => d.leadScore > d.dealValue).length;
      const approvedCount = data.filter(d => d.stage === 'Won' || d.status === 'Closed').length;
      const approvedRate = data.length ? Math.round((approvedCount / data.length) * 100) : 0;
      const cleanCodes = data.filter(d => d.email.startsWith('BUD-')).length;
      const hygieneScore = data.length ? Math.round((cleanCodes / data.length) * 100) : 100;

      return {
        totalMetric: `$${totalAllocated.toLocaleString()}`,
        totalLabel: 'Total Allocated',
        avgMetric: `$${totalSpent.toLocaleString()}`,
        avgLabel: 'Actual Spend',
        vipMetric: `${overBudgetItems}`,
        vipLabel: 'Over-Budget Items',
        winMetric: `${approvedRate}%`,
        winLabel: 'Approved Rate',
        hygieneScore,
        hygieneLabel: 'Budget Integrity',
        totalCount: data.length
      };
    }

    // Demo 3: Sales Pipeline
    if (effectiveIsDemo) {
      const totalPipeline = data.reduce((acc, curr) => acc + curr.dealValue, 0);
      const avgDeal = data.length ? Math.round(totalPipeline / data.length) : 0;
      const vipCount = data.filter(d => d.dealValue >= 50000).length;
      const wonCount = data.filter(d => d.stage === 'Won').length;
      const winRate = data.length ? Math.round((wonCount / data.length) * 100) : 0;

      const cleanEmails = data.filter(d => d.email === d.email.trim().toLowerCase()).length;
      const cleanPhones = data.filter(d => d.phone.startsWith('+1') || d.phone.startsWith('+')).length;
      const scoredCount = data.filter(d => d.leadScore > 0).length;
      const hygieneScore = data.length 
        ? Math.round(((cleanEmails + cleanPhones + scoredCount) / (data.length * 3)) * 100)
        : 100;

      return {
        totalMetric: `$${totalPipeline.toLocaleString()}`,
        totalLabel: 'Total Pipeline',
        avgMetric: `$${avgDeal.toLocaleString()}`,
        avgLabel: 'Avg Deal Size',
        vipMetric: `${vipCount}`,
        vipLabel: 'VIP Deals > $50k',
        winMetric: `${winRate}%`,
        winLabel: 'Win Rate',
        hygieneScore,
        hygieneLabel: 'Data Hygiene',
        totalCount: data.length
      };
    }

    // DYNAMIC FOR IMPORTED CSV FILES
    const totalRecords = data.length;
    const completenessScore = dynamicAnalysis?.completenessScore ?? 100;
    const duplicateCount = dynamicAnalysis?.duplicateCount ?? 0;
    const primaryNumeric = dynamicAnalysis?.primaryNumeric;
    const primaryCat = dynamicAnalysis?.primaryCategorical;

    const totalMetric = primaryNumeric 
      ? primaryNumeric.sum > 999999
        ? `${(primaryNumeric.sum / 1000000).toFixed(1)}M`
        : primaryNumeric.sum > 999
        ? `${(primaryNumeric.sum / 1000).toFixed(1)}k`
        : `${Math.round(primaryNumeric.sum).toLocaleString()}`
      : `${totalRecords.toLocaleString()}`;
    const totalLabel = primaryNumeric ? `Total ${formatLabel(primaryNumeric.key)}` : 'Total Records';

    const avgMetric = primaryNumeric 
      ? primaryNumeric.avg.toFixed(1)
      : `${primaryCat ? primaryCat.uniqueCount : 0}`;
    const avgLabel = primaryNumeric ? `Mean ${formatLabel(primaryNumeric.key)}` : 'Category Groups';

    const vipMetric = `${completenessScore}%`;
    const vipLabel = 'Completeness Score';

    const winMetric = `${totalRecords - duplicateCount}`;
    const winLabel = 'Active Valid Rows';

    const hygieneScore = totalRecords > 0 
      ? Math.round(((totalRecords - duplicateCount) / totalRecords) * 100) 
      : 100;
    const hygieneLabel = 'Dataset Hygiene';

    return {
      totalMetric,
      totalLabel,
      avgMetric,
      avgLabel,
      vipMetric,
      vipLabel,
      winMetric,
      winLabel,
      hygieneScore,
      hygieneLabel,
      totalCount: totalRecords
    };
  }, [data, effectiveIsDemo, isBirth, isBudget, dynamicAnalysis]);

  // 2. Bar Chart Data: Dynamic Categorical Aggregation for Imported CSVs
  const barChartData = useMemo(() => {
    // Dynamic Bar Chart for imported CSVs
    if (!effectiveIsDemo && dynamicAnalysis && dynamicAnalysis.primaryCategorical) {
      const { primaryCategorical, primaryNumeric } = dynamicAnalysis;
      const counts = primaryCategorical.valueCounts;
      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      return sorted.map(([category, count]) => {
        let numericSum = 0;
        if (primaryNumeric) {
          data.forEach(r => {
            if (String((r as any)[primaryCategorical.key]).trim() === category) {
              const val = Number((r as any)[primaryNumeric.key]) || 0;
              numericSum += val;
            }
          });
        }
        return {
          name: category,
          count,
          value: primaryNumeric && numericSum > 0 ? Math.round(numericSum) : count,
          numericSum: Math.round(numericSum)
        };
      });
    }

    if (isBirth) {
      const departments = ['Obstetrics', 'Neonatology', 'Maternal Health', 'NICU', 'Pediatrics'];
      return departments.map(dept => {
        const deptRecords = data.filter(d => d.industry === dept);
        const count = deptRecords.length;
        const avgDeptWeight = count ? Math.round(deptRecords.reduce((acc, c) => acc + c.dealValue, 0) / count) : 0;
        return {
          name: dept,
          count,
          value: count,
          avgWeight: avgDeptWeight
        };
      });
    }

    if (isBudget) {
      const departments = ['Production', 'Hospitality', 'Logistics', 'Marketing', 'Security'];
      return departments.map(dept => {
        const deptRecords = data.filter(d => d.company === dept || d.industry === dept);
        const allocated = deptRecords.reduce((acc, c) => acc + c.dealValue, 0);
        return {
          name: dept,
          count: deptRecords.length,
          value: allocated
        };
      });
    }

    const stages = ['New', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    return stages.map(stage => {
      const stageLeads = data.filter(d => d.stage === stage);
      const totalVal = stageLeads.reduce((acc, curr) => acc + curr.dealValue, 0);
      return {
        name: stage,
        count: stageLeads.length,
        value: totalVal,
        valInThousands: Math.round(totalVal / 1000)
      };
    });
  }, [data, effectiveIsDemo, isBirth, isBudget, dynamicAnalysis]);

  // 3. Donut / Pie Chart Data: Dynamic Secondary Category Breakdown for Imported CSVs
  const donutChartData = useMemo(() => {
    // Dynamic Donut Chart for imported CSVs
    if (!effectiveIsDemo && dynamicAnalysis && dynamicAnalysis.secondaryCategorical) {
      const counts = dynamicAnalysis.secondaryCategorical.valueCounts;
      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      const top5 = sorted.slice(0, 5);
      const rest = sorted.slice(5);
      const results = top5.map(([name, value]) => ({ name, value }));
      if (rest.length > 0) {
        const restSum = rest.reduce((acc, c) => acc + c[1], 0);
        results.push({ name: 'Other', value: restSum });
      }
      return results;
    }

    if (isBirth) {
      const stages = ['Won', 'Proposal', 'Negotiation', 'New', 'Discovery'];
      return stages.map(st => ({
        name: st === 'Won' ? 'Verified (Won)' : st,
        value: data.filter(d => d.stage === st).length || 1
      }));
    }

    if (isBudget) {
      const departments = ['Production', 'Hospitality', 'Logistics', 'Marketing', 'Security'];
      return departments.map(dept => ({
        name: dept,
        value: data.filter(d => d.company === dept || d.industry === dept).reduce((acc, c) => acc + c.dealValue, 0) || 1
      }));
    }

    const map = new Map<string, number>();
    data.forEach(d => {
      map.set(d.industry, (map.get(d.industry) || 0) + d.dealValue);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [data, effectiveIsDemo, isBirth, isBudget, dynamicAnalysis]);

  // 4. Area Chart Data: Sequential Metric Trajectory for Imported CSVs
  const trajectoryData = useMemo(() => {
    // Dynamic Area Chart for imported CSVs
    if (!effectiveIsDemo && dynamicAnalysis) {
      const numKey = dynamicAnalysis.primaryNumeric?.key;
      let runningSum = 0;
      const sample = data.slice(0, 40);
      return sample.map((item, index) => {
        const rawVal = numKey ? Number((item as any)[numKey]) || 0 : (item.dealValue || index + 1);
        runningSum += rawVal;
        const itemName = item.name || (item as any).company || `Row ${index + 1}`;
        return {
          step: `#${index + 1}`,
          metric: rawVal,
          cumulative: Math.round(runningSum),
          name: String(itemName).trim()
        };
      });
    }

    if (isBirth) {
      return [...data]
        .sort((a, b) => a.dealValue - b.dealValue)
        .map((record, index) => ({
          step: `B-${index + 1}`,
          metric: record.dealValue,
          apgar: record.leadScore,
          name: record.name.trim()
        }));
    }

    if (isBudget) {
      let runningSpent = 0;
      return [...data]
        .sort((a, b) => a.leadScore - b.leadScore)
        .map((item, index) => {
          runningSpent += item.leadScore;
          return {
            step: `E-${index + 1}`,
            metric: runningSpent,
            allocated: item.dealValue,
            spent: item.leadScore,
            name: item.name.trim()
          };
        });
    }

    let runningTotal = 0;
    return [...data]
      .sort((a, b) => a.dealValue - b.dealValue)
      .map((lead, index) => {
        runningTotal += lead.dealValue;
        return {
          step: `L-${index + 1}`,
          metric: runningTotal,
          deal: lead.dealValue,
          score: lead.leadScore
        };
      });
  }, [data, effectiveIsDemo, isBirth, isBudget, dynamicAnalysis]);

  // Color Palette Constants
  const DONUT_COLORS = ['#D95338', '#D4A359', '#E5DDD0', '#8E6E3D', '#544234', '#3F342B'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-surface border border-border-gold p-3 rounded-xl shadow-2xl text-xs font-sans">
          <p className="font-semibold text-white mb-1">{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sand-subtext">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span>{entry.name}:</span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number'
                  ? isBirth
                    ? entry.name?.toLowerCase().includes('weight')
                      ? `${entry.value.toLocaleString()} g`
                      : entry.value.toLocaleString()
                    : isBudget || isSales
                    ? `$${entry.value.toLocaleString()}`
                    : entry.value.toLocaleString()
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-card p-5 rounded-2xl border border-border-gold shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-gold px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-gold" />
              BI Analytics Studio
            </span>
            {!effectiveIsDemo && (
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Dynamic CSV Model
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Tabular Aggregations &amp; Distribution Metrics
          </h2>
          <p className="text-xs text-sand-muted mt-0.5">
            {!effectiveIsDemo
              ? `Dynamically computed from active dataset (${data.length} records, ${dynamicAnalysis?.allKeys.length || 0} attributes discovered).`
              : `Computed deterministically from active rows (${metrics.totalCount} records).`}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-charcoal border border-border-gold text-xs text-sand-subtext font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Reactive Engine
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="luxury-card p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-sand-muted">
            <span className="text-xs uppercase tracking-wider font-mono">{metrics.totalLabel}</span>
            {effectiveIsDemo ? (
              <DollarSign className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
            ) : (
              <Hash className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
            )}
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {metrics.totalMetric}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-gold mt-1.5">
            <TrendingUp className="w-3 h-3" />
            <span>
              {!effectiveIsDemo 
                ? 'Cumulative column aggregate' 
                : isBirth 
                ? 'Total Registered Cohort' 
                : 'Active Enterprise Value'}
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="luxury-card p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-sand-muted">
            <span className="text-xs uppercase tracking-wider font-mono">{metrics.avgLabel}</span>
            <Target className="w-4 h-4 text-terracotta group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {metrics.avgMetric}
          </p>
          <div className="text-[11px] text-sand-muted mt-1.5">
            {!effectiveIsDemo && dynamicAnalysis?.primaryNumeric
              ? `Mean value per row`
              : `Across ${metrics.totalCount} active records`}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="luxury-card p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-sand-muted">
            <span className="text-xs uppercase tracking-wider font-mono">{metrics.vipLabel}</span>
            <Sparkles className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-mono text-gold mt-2">
            {metrics.vipMetric}
          </p>
          <div className="text-[11px] text-sand-muted mt-1.5">
            {!effectiveIsDemo 
              ? 'Populated tabular cells' 
              : isBirth 
              ? 'Score 85-100 threshold' 
              : 'High-margin opportunities'}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="luxury-card p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-sand-muted">
            <span className="text-xs uppercase tracking-wider font-mono">{metrics.winLabel}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-2">
            {metrics.winMetric}
          </p>
          <div className="text-[11px] text-emerald-400 mt-1.5">
            {!effectiveIsDemo 
              ? `${dynamicAnalysis?.duplicateCount || 0} duplicate(s) flagged` 
              : isBirth 
              ? 'Full Clinical Verification' 
              : 'Converted to Closed-Won'}
          </div>
        </div>

        {/* Metric 5 */}
        <div className="luxury-card p-4 rounded-xl relative overflow-hidden group border-gold/40">
          <div className="flex items-center justify-between text-sand-muted">
            <span className="text-xs uppercase tracking-wider font-mono">{metrics.hygieneLabel}</span>
            <ShieldCheck className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-mono text-gold mt-2">
            {metrics.hygieneScore}%
          </p>
          <div className="text-[11px] text-sand-subtext mt-1.5 flex items-center gap-1">
            <span>{!effectiveIsDemo ? 'Integrity verified' : 'Voice-cleaned & verified'}</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Bar Chart */}
        <div className="luxury-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-terracotta" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                {!effectiveIsDemo && dynamicAnalysis?.primaryCategorical
                  ? `Distribution by ${formatLabel(dynamicAnalysis.primaryCategorical.key)}`
                  : isBirth 
                  ? 'Admissions by Clinical Department' 
                  : isBudget 
                  ? 'Allocated Budget by Department' 
                  : 'Pipeline Capital by Stage'}
              </h3>
            </div>
            <span className="text-xs font-mono text-sand-muted">
              {!effectiveIsDemo && dynamicAnalysis
                ? dynamicAnalysis.primaryNumeric 
                  ? `Total ${formatLabel(dynamicAnalysis.primaryNumeric.key)}` 
                  : 'Record Count'
                : isBirth 
                ? 'Active Patient Count' 
                : isBudget 
                ? 'Total Allocated ($)' 
                : 'in $ Thousands'}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D95338" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#D4A359" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2822" vertical={false} />
                <XAxis dataKey="name" stroke="#C4B9A7" fontSize={11} tickLine={false} />
                <YAxis stroke="#C4B9A7" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  name={!effectiveIsDemo ? (dynamicAnalysis?.primaryNumeric ? formatLabel(dynamicAnalysis.primaryNumeric.key) : 'Records') : (isBirth ? "Admissions" : isBudget ? "Allocation ($)" : "Valuation ($)")} 
                  fill="url(#barGradient)" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Donut Pie Chart */}
        <div className="luxury-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                {!effectiveIsDemo && dynamicAnalysis?.secondaryCategorical
                  ? `Composition by ${formatLabel(dynamicAnalysis.secondaryCategorical.key)}`
                  : isBirth 
                  ? 'Registration Status Distribution' 
                  : isBudget 
                  ? 'Departmental Spend Allocation' 
                  : 'Market Sector Distribution'}
              </h3>
            </div>
            <span className="text-xs font-mono text-sand-muted">
              {!effectiveIsDemo
                ? 'Category Share'
                : isBirth 
                ? 'Status Breakdown' 
                : isBudget 
                ? 'Budget Share' 
                : 'Total Valuation Share'}
            </span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {donutChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                      stroke="#161412"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Legend
                  formatter={(val) => <span className="text-xs text-sand-subtext">{val}</span>}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Area Chart */}
        <div className="luxury-card p-5 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-terracotta" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                {!effectiveIsDemo && dynamicAnalysis
                  ? dynamicAnalysis.primaryNumeric 
                    ? `${formatLabel(dynamicAnalysis.primaryNumeric.key)} Trajectory (Sequential)`
                    : 'Row Sequence Trajectory'
                  : isBirth 
                  ? 'Infant Weight Spectrum (Ascending Distribution)' 
                  : isBudget 
                  ? 'Cumulative Expense Burn Trajectory' 
                  : 'Cumulative Pipeline Growth Trajectory'}
              </h3>
            </div>
            <span className="text-xs font-mono text-sand-muted">
              {!effectiveIsDemo && dynamicAnalysis?.primaryNumeric
                ? `${formatLabel(dynamicAnalysis.primaryNumeric.key)} per Record`
                : isBirth 
                ? 'Weight (Grams) per Cohort Record' 
                : isBudget 
                ? 'Cumulative Actual Spend ($)' 
                : 'Ascending Account Tiers'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D95338" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#D4A359" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2822" vertical={false} />
                <XAxis dataKey="step" stroke="#C4B9A7" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#C4B9A7" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => {
                    if (!effectiveIsDemo) {
                      if (val > 999999) return `${(val / 1000000).toFixed(1)}M`;
                      if (val > 999) return `${(val / 1000).toFixed(1)}k`;
                      return String(val);
                    }
                    return isBirth ? `${val}g` : `$${Math.round(val / 1000)}k`;
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="metric"
                  name={!effectiveIsDemo ? (dynamicAnalysis?.primaryNumeric ? formatLabel(dynamicAnalysis.primaryNumeric.key) : 'Value') : (isBirth ? "Infant Weight (g)" : isBudget ? "Cumulative Spend ($)" : "Cumulative Valuation ($)")}
                  stroke="#D95338"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
