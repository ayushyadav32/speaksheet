import React, { useState, useEffect, useMemo } from 'react';
import { LeadRecord, DealStage, LeadStatus, IndustryType, SortConfig } from '../../types/spreadsheet';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  CheckSquare, 
  Square, 
  Search, 
  Download, 
  Plus, 
  RotateCcw, 
  RotateCw, 
  SlidersHorizontal,
  Mail,
  Filter,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SpreadsheetTableProps {
  data: LeadRecord[];
  initialTotal?: number;
  removedCount?: number;
  datasetId?: string;
  modifiedRowIds: Set<string>;
  selectedRowIds: Set<string>;
  onSelectRow: (id: string) => void;
  onSelectAll: () => void;
  onUpdateCell: (id: string, field: keyof LeadRecord, value: any) => void;
  onDeleteSelected: () => void;
  onBulkStatusChange: (status: LeadStatus) => void;
  onSendToOutreach: () => void;
  onAddRow: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportCsv: () => void;
  resetSignal?: number;
}

export const SpreadsheetTable: React.FC<SpreadsheetTableProps> = ({
  data,
  initialTotal = 20,
  removedCount = 0,
  datasetId = 'sales_pipeline',
  modifiedRowIds,
  selectedRowIds,
  onSelectRow,
  onSelectAll,
  onUpdateCell,
  onDeleteSelected,
  onBulkStatusChange,
  onSendToOutreach,
  onAddRow,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportCsv,
  resetSignal
}) => {
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof LeadRecord } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  // Clean, honest single-page display for 20-row datasets (no fake dropdowns)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Reset filters, search, sort, and inline edit when reset signal is received
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setSearchTerm('');
      setFilterStage('all');
      setFilterIndustry('all');
      setSortConfig({ key: null, direction: null });
      setEditingCell(null);
      setCurrentPage(1);
    }
  }, [resetSignal]);

  // Dynamic schema column headers based on dataset
  const isBirthData = datasetId === 'birth_registration';
  const isBudgetData = datasetId === 'event_budget';
  const nameLabel = isBirthData ? 'Child Name' : isBudgetData ? 'Expense Item' : 'Contact Name';
  const orgLabel = isBirthData ? 'Mother' : isBudgetData ? 'Department' : 'Company';
  const emailLabel = isBirthData ? 'Registry ID' : isBudgetData ? 'Budget Code' : 'Email Address';
  const phoneLabel = isBirthData ? 'Birth Hour' : isBudgetData ? 'Vendor' : 'Phone';
  const valLabel = isBirthData ? 'Weight (Grams)' : isBudgetData ? 'Allocated ($)' : 'Deal Valuation';
  const stageLabel = isBirthData ? 'Registration Status' : isBudgetData ? 'Approval Stage' : 'Pipeline Stage';
  const scoreLabel = isBirthData ? 'APGAR Score' : isBudgetData ? 'Spent ($)' : 'AI Score';
  const industryLabel = isBirthData ? 'Department' : isBudgetData ? 'Category' : 'Industry';

  // Handle inline cell editing
  const handleStartEdit = (id: string, field: keyof LeadRecord, currentVal: any) => {
    setEditingCell({ id, field });
    setEditValue(String(currentVal ?? ''));
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    let finalVal: any = editValue;
    if (field === 'dealValue' || field === 'leadScore') {
      finalVal = Number(editValue.replace(/[^0-9.-]+/g, '')) || 0;
    }
    onUpdateCell(id, field, finalVal);
    setEditingCell(null);
  };

  // Sorting
  const handleSort = (key: keyof LeadRecord) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  // Filtered & Sorted Records (Memoized for zero-lag 60fps performance on heavy datasets)
  const filteredData = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    return data.filter(item => {
      const matchesSearch = !lowerSearch ||
        item.name.toLowerCase().includes(lowerSearch) ||
        item.company.toLowerCase().includes(lowerSearch) ||
        item.email.toLowerCase().includes(lowerSearch) ||
        item.phone.toLowerCase().includes(lowerSearch);

      const matchesStage = filterStage === 'all' || item.stage === filterStage;
      const matchesIndustry = filterIndustry === 'all' || item.industry === filterIndustry;

      return matchesSearch && matchesStage && matchesIndustry;
    });
  }, [data, searchTerm, filterStage, filterIndustry]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData;
    const key = sortConfig.key;
    const direction = sortConfig.direction;

    return [...filteredData].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }
      return direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortConfig]);

  // Calculate pagination windows (active for files > 50 rows, memoized)
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedData.length);
  
  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  const allSelected = useMemo(() => {
    return sortedData.length > 0 && sortedData.every(d => selectedRowIds.has(d.id));
  }, [sortedData, selectedRowIds]);

  const getStageBadge = (stage: DealStage) => {
    switch (stage) {
      case 'Won':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
      case 'Negotiation':
        return 'bg-amber-950/80 text-gold border-amber-800/60';
      case 'Proposal':
        return 'bg-terracotta/20 text-terracotta border-terracotta/40';
      case 'Discovery':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'Lost':
        return 'bg-stone-surface text-sand-muted border-border-gold';
      default:
        return 'bg-stone-surface text-sand-subtext border-border-gold';
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'Qualified':
        return 'bg-gold/15 text-gold border-gold/40';
      case 'Contacted':
        return 'bg-terracotta/15 text-terracotta border-terracotta/40';
      case 'Closed':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700/50';
      default:
        return 'bg-charcoal text-sand-muted border-border-gold';
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Table Action Controls Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-stone-card/90 p-3 rounded-xl border border-border-gold shadow-lg">
        {/* Left: Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sand-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Search ${nameLabel.toLowerCase()}, ${orgLabel.toLowerCase()}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-charcoal text-white text-xs rounded-lg border border-border-gold focus:outline-none focus:border-gold transition-colors font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sand-muted" />
            <select
              value={filterStage}
              onChange={e => {
                setFilterStage(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by stage"
              className="bg-charcoal text-sand-subtext text-xs rounded-lg border border-border-gold px-2.5 py-1.5 focus:outline-none focus:border-gold"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Discovery">Discovery</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Verified / Won</option>
              <option value="Lost">Lost / Flagged</option>
            </select>
          </div>

          {/* Active Row Count Indicator in Toolbar */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-charcoal border border-border-gold text-xs font-mono text-sand-subtext select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-gold font-bold">{data.length}</span>
            <span className="text-[11px] text-sand-muted">Rows Active</span>
          </div>
        </div>

        {/* Right: Actions (Undo, Redo, Add Row, Export) */}
        <div className="flex items-center gap-2 justify-end">
          <div className="flex items-center border border-border-gold rounded-lg overflow-hidden bg-charcoal">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-sand-subtext hover:text-white hover:bg-stone-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Undo last modification"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-border-gold" />
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-sand-subtext hover:text-white hover:bg-stone-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Redo modification"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onAddRow}
            className="btn-gold-outline px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-gold" />
            <span>Add Row</span>
          </button>

          <button
            onClick={onExportCsv}
            className="btn-gold-outline px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5 text-gold" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Operations Bar (shown when 1+ rows selected) */}
      {selectedRowIds.size > 0 && (
        <div className="flex items-center justify-between bg-stone-elevated border border-terracotta/60 rounded-xl px-4 py-2.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
            <span className="font-semibold text-white">
              {selectedRowIds.size} row{selectedRowIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkStatusChange('Contacted')}
              className="px-2.5 py-1 rounded-lg bg-charcoal hover:bg-stone-surface border border-border-gold text-xs text-sand-subtext hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle className="w-3 h-3 text-gold" />
              Mark Contacted / Verified
            </button>

            <button
              onClick={onSendToOutreach}
              className="btn-terracotta px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3 h-3" />
              Push to Outreach Studio
            </button>

            <button
              onClick={onDeleteSelected}
              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 transition-colors cursor-pointer"
              title="Delete selected rows"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Spreadsheet Grid */}
      <div className="w-full overflow-x-auto rounded-xl border border-border-gold bg-stone-card shadow-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-charcoal/95 border-b border-border-gold text-sand-subtext uppercase tracking-wider font-mono text-[11px] select-none sticky top-0 z-10">
              <th className="py-3 px-3 w-10 text-center">
                <button
                  onClick={onSelectAll}
                  className="text-sand-muted hover:text-gold transition-colors"
                  title="Select / Deselect All"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-gold" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>{nameLabel}</span>
                  {sortConfig.key === 'name' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-gold" /> : <ArrowDown className="w-3 h-3 text-gold" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-border-goldLight" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('company')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>{orgLabel}</span>
                  {sortConfig.key === 'company' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-gold" /> : <ArrowDown className="w-3 h-3 text-gold" />
                  )}
                </div>
              </th>

              <th className="py-3 px-3">{emailLabel}</th>
              <th className="py-3 px-3">{phoneLabel}</th>

              <th
                onClick={() => handleSort('dealValue')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>{valLabel}</span>
                  {sortConfig.key === 'dealValue' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-gold" /> : <ArrowDown className="w-3 h-3 text-gold" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('stage')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>{stageLabel}</span>
                  {sortConfig.key === 'stage' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-gold" /> : <ArrowDown className="w-3 h-3 text-gold" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('leadScore')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{scoreLabel}</span>
                  {sortConfig.key === 'leadScore' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-gold" /> : <ArrowDown className="w-3 h-3 text-gold" />
                  )}
                </div>
              </th>

              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">{industryLabel}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-gold/50 font-sans">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sand-muted text-sm">
                  No matching records found. Use the voice command bar or clear filters to view data.
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const isSelected = selectedRowIds.has(row.id);
                const isModified = modifiedRowIds.has(row.id);

                return (
                  <tr
                    key={row.id}
                    className={`transition-all duration-300 group hover:bg-stone-surface/80 ${
                      isModified ? 'animate-amber-glow' : ''
                    } ${isSelected ? 'bg-terracotta/10' : ''}`}
                  >
                    {/* Row Select Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onSelectRow(row.id)}
                        className="text-sand-muted hover:text-gold transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-terracotta" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Name Cell */}
                    <td
                      onDoubleClick={() => handleStartEdit(row.id, 'name', row.name)}
                      className="py-2.5 px-3 font-semibold text-white tracking-tight cursor-pointer"
                      title="Double click to edit"
                    >
                      {editingCell?.id === row.id && editingCell.field === 'name' ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full bg-charcoal px-2 py-1 text-white border border-gold rounded focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>{row.name}</span>
                          {row.isDuplicate && (
                            <span className="text-[10px] bg-red-900/60 text-red-300 border border-red-700/50 px-1.5 py-0.2 rounded font-mono">
                              DUP
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Company Cell */}
                    <td
                      onDoubleClick={() => handleStartEdit(row.id, 'company', row.company)}
                      className="py-2.5 px-3 text-sand-subtext cursor-pointer"
                      title="Double click to edit"
                    >
                      {editingCell?.id === row.id && editingCell.field === 'company' ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full bg-charcoal px-2 py-1 text-white border border-gold rounded focus:outline-none"
                        />
                      ) : (
                        row.company
                      )}
                    </td>

                    {/* Email Cell */}
                    <td
                      onDoubleClick={() => handleStartEdit(row.id, 'email', row.email)}
                      className="py-2.5 px-3 font-mono text-[11px] text-sand-muted cursor-pointer group-hover:text-sand-subtext"
                      title="Double click to edit"
                    >
                      {editingCell?.id === row.id && editingCell.field === 'email' ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full bg-charcoal px-2 py-1 text-white border border-gold rounded focus:outline-none"
                        />
                      ) : (
                        row.email
                      )}
                    </td>

                    {/* Phone Cell */}
                    <td
                      onDoubleClick={() => handleStartEdit(row.id, 'phone', row.phone)}
                      className="py-2.5 px-3 font-mono text-[11px] text-sand-muted cursor-pointer"
                      title="Double click to edit"
                    >
                      {editingCell?.id === row.id && editingCell.field === 'phone' ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full bg-charcoal px-2 py-1 text-white border border-gold rounded focus:outline-none"
                        />
                      ) : (
                        row.phone
                      )}
                    </td>

                    {/* Deal Value Cell */}
                    <td
                      onDoubleClick={() => handleStartEdit(row.id, 'dealValue', row.dealValue)}
                      className="py-2.5 px-3 font-mono font-medium text-white cursor-pointer"
                      title="Double click to edit"
                    >
                      {editingCell?.id === row.id && editingCell.field === 'dealValue' ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="w-full bg-charcoal px-2 py-1 text-white border border-gold rounded focus:outline-none"
                        />
                      ) : (
                        <span className={row.dealValue >= 50000 || (isBirthData && row.dealValue >= 3500) ? 'text-gold font-bold' : 'text-sand-subtext'}>
                          {isBirthData ? `${row.dealValue} g` : `$${row.dealValue.toLocaleString()}`}
                        </span>
                      )}
                    </td>

                    {/* Pipeline Stage Cell */}
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${getStageBadge(row.stage)}`}>
                        {row.stage}
                      </span>
                    </td>

                    {/* Apgar / AI Score / Spent Cell */}
                    <td className="py-2.5 px-3 text-center">
                      {row.leadScore > 0 ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono font-bold ${
                          isBirthData && row.leadScore < 85
                            ? 'bg-red-950/60 border-red-700/60 text-red-400'
                            : isBudgetData && row.leadScore > row.dealValue
                            ? 'bg-red-950/70 border-red-600/70 text-red-400'
                            : isBudgetData
                            ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                            : 'bg-stone-surface border-gold/40 text-gold'
                        }`}>
                          <span>{isBudgetData ? `$${row.leadScore.toLocaleString()}` : row.leadScore}</span>
                          <span className="text-[9px] text-sand-muted">
                            {isBirthData ? 'APGAR' : isBudgetData ? (row.leadScore > row.dealValue ? 'OVER' : 'SPENT') : '/100'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-sand-dark font-mono italic">
                          {isBudgetData ? '$0' : 'Unscored'}
                        </span>
                      )}
                    </td>

                    {/* Status Cell */}
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(row.status)}`}>
                        {row.status}
                      </span>
                    </td>

                    {/* Industry Cell */}
                    <td className="py-2.5 px-3 text-sand-muted text-[11px]">
                      {row.industry}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Clean Honest Reporting (No Fake Dropdowns) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sand-muted px-4 py-3 bg-stone-card/90 rounded-xl border border-border-gold shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sand-subtext text-xs">
            Showing <span className="font-bold text-white">{sortedData.length > 0 ? startIndex + 1 : 0}</span> to <span className="font-bold text-white">{endIndex}</span> of <span className="font-bold text-gold">{data.length}</span> active rows
            {removedCount > 0 && (
              <span className="text-terracotta ml-1.5 font-semibold">
                ({removedCount} duplicates filtered out)
              </span>
            )}
          </span>
        </div>

        {/* Show Page navigation ONLY if large dataset > 50 rows exists */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-sand-muted px-1.5">
              Page {safePage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1 rounded-lg bg-charcoal border border-border-gold text-sand-subtext hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1 rounded-lg bg-charcoal border border-border-gold text-sand-subtext hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
