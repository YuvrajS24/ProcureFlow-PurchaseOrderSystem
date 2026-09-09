import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useSheetData } from '@/hooks/useSheetData';
import { usePagination } from '@/hooks/usePagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  MapPin,
  CalendarClock,
  Eye,
  FilePlus2,
  XCircle,
} from 'lucide-react';
import { CancelOrderDialog } from '@/components/shared/CancelOrderDialog';
import { makeTimestamp, formatDisplayDate, hasValue } from '@/utils/dateUtils';

// ─── Helpers ────────────────────────────────────────────────────────

const formatDate = (isoString) => {
  if (!isoString) return '—';
  const num = Number(isoString);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const baseDate = new Date(1899, 11, 30);
    const ms = num * 24 * 60 * 60 * 1000;
    const d = new Date(baseDate.getTime() + ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  }
  return formatDisplayDate(isoString, false);
};

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'history', label: 'History' },
];

// ─── Component ──────────────────────────────────────────────────────

export function ApproveProductPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Load consolidated FMS sheet
  const [fmsData, setFmsData] = useSheetData('fms-2', 'poNumber');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, item: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, item: null });
  const [cancelDialog, setCancelDialog] = useState({ open: false, item: null });
  
  const [approvePoPriceInput, setApprovePoPriceInput] = useState('');
  const [approvePoQtyInput, setApprovePoQtyInput] = useState('');

  // ── Pending   = planned4 (col AG) NOT null  AND  actual4 (col AH) IS empty
  // ── Completed = planned4 (col AG) NOT null  AND  actual4 (col AH) NOT empty
  const isPending = (row) => hasValue(row.planned4) && !hasValue(row.actual4);
  const isCompleted = (row) => hasValue(row.planned4) && hasValue(row.actual4);

  // ── Mark as approved ───────────────────────────────────────────────
  const handleMarkComplete = (item) => {
    const addWorkdays = (startDate, days) => {
      let date = new Date(startDate);
      let count = 0;
      while (count < days) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay(); // 0 is Sunday, 6 is Saturday
        if (day !== 0) {
          count++;
        }
      }
      return date;
    };
    const now = new Date();
    const nowTimestamp = makeTimestamp(now); // M/D/YYYY H:mm:ss format
    const planned5Date = addWorkdays(now, 4);
    const planned5Timestamp = makeTimestamp(planned5Date);
    const userName = currentUser ? currentUser.name || currentUser.username : 'System';
    const rawPoQty = Number(item.totalQuantity || item['Total Quantity'] || item.quantity || item['Quantity'] || 0);
    const extraQty = Number(item.extraQty ?? item['Extra Qty'] ?? item.BF ?? 0);
    const damageQty = Number(item.damageQty ?? item['Damage Qty'] ?? item.BD ?? 0);
    const returnQty = Number(item.returnQty ?? item['Return Qty'] ?? item['Supply Check Return Qty'] ?? item.BG ?? 0);
    const calculatedNetQty = rawPoQty + extraQty - damageQty - returnQty;
    const shortageQty = rawPoQty > calculatedNetQty ? (rawPoQty - calculatedNetQty) : 0;

    // Update FMS directly
    const updated = fmsData.map((r) =>
      r.poNumber === item.poNumber
        ? {
          ...r,
          approvePoPrice: parseFloat(approvePoPriceInput) || '',
          'Approve Po Price': parseFloat(approvePoPriceInput) || '',
          approvePoQty: parseFloat(approvePoQtyInput) || '',
          'Approve Po Qty': parseFloat(approvePoQtyInput) || '',
          pendingQty: 0,
          'Pending Qty': 0,
          cancelQty: shortageQty,
          'Cancel Qty': shortageQty,
          actual4: r.actual4 || nowTimestamp,
          planned5: r.planned5 || planned5Timestamp,
          'Planned 5': r['Planned 5'] || r.planned5 || planned5Timestamp,
          updatedBy: userName,
        }
        : r
    );
    setFmsData(updated);

    toast(`Product ${item.poNumber} ${isCompleted(item) ? 'revised' : 'approved'} successfully!`, 'success');
    setConfirmDialog({ open: false, item: null });
  };

  const isDeleted = (r) => String(r['Delete Status'] || r.deleteStatus || '').trim().toLowerCase() === 'deleted';

  // ── Filtered & searched list ───────────────────────────────────────
  const filteredItems = useMemo(() => {
    // Only show items where planned4 (col AG) has a value and are not deleted
    let list = fmsData.filter((r) => hasValue(r.planned4) && !isDeleted(r));

    if (activeTab === 'pending') list = list.filter(isPending);
    else if (activeTab === 'history') list = list.filter(isCompleted);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.poNumber || '').toLowerCase().includes(q) ||
          String(r.vendorName || '').toLowerCase().includes(q) ||
          String(r.location || '').toLowerCase().includes(q) ||
          String(r.updatedBy || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [fmsData, activeTab, searchTerm]);

  const counts = useMemo(() => {
    const staged = fmsData.filter((r) => hasValue(r.planned4) && !isDeleted(r));
    const pendingCount = staged.filter(isPending).length;
    const historyCount = staged.filter(isCompleted).length;
    return {
      all: staged.length,
      pending: pendingCount,
      history: historyCount,
      completed: historyCount,
    };
  }, [fmsData]);

  const { visibleItems, hasMore, loadMore, containerRef, displayedCount, totalCount } = usePagination(filteredItems, 50);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Approve Product
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Perform quality sign-off and approve products. Approved items move to Payment Processing.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Approvals</p>
              <p className="text-xl font-bold text-foreground">{counts.all}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-xl font-bold text-foreground">{counts.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Approved</p>
              <p className="text-xl font-bold text-foreground">{counts.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border bg-card shadow-sm rounded-2xl">
        <CardHeader className="py-4 px-4 md:px-6 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search approvals…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-input bg-background h-9 text-xs sm:text-sm max-w-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground hidden md:inline-block">{filteredItems.length} record(s)</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl self-end sm:self-center">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {tab.label}<span className="ml-1.5 text-[10px] opacity-70">({counts[tab.key]})</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div ref={containerRef} className="overflow-x-auto w-full max-h-[70vh]">
            <Table>
              <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/10 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider pl-4 md:pl-6 py-3 text-left">Actions</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider pl-4 md:pl-6 py-3 text-left">PO Number</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">Vendor</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">PO Quantity</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-center">Damage Qty</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-center">Extra Qty</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-center">Return Qty</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">Pending Quantity</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">Canceled Quantity</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">Location</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">Planned</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">Updated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.length > 0 ? (
                  visibleItems.map((item) => {
                    const rawPoQty = Number(item.totalQuantity || item['Total Quantity'] || item.quantity || item['Quantity'] || 0);
                    const extraQty = Number(item.extraQty ?? item['Extra Qty'] ?? item.BF ?? 0);
                    const damageQty = Number(item.damageQty ?? item['Damage Qty'] ?? item.BD ?? 0);
                    const returnQty = Number(item.returnQty ?? item['Return Qty'] ?? item['Supply Check Return Qty'] ?? item.BG ?? 0);
                    const calculatedPoQty = rawPoQty + extraQty - damageQty - returnQty;

                    const displayPendingQty = hasValue(item.actual4)
                      ? Number(item.pendingQty || item['Pending Qty'] || 0)
                      : calculatedPoQty;

                    const displayCancelQty = hasValue(item.actual4)
                      ? Number(item.cancelQty || item['Cancel Qty'] || 0)
                      : (rawPoQty > calculatedPoQty ? (rawPoQty - calculatedPoQty) : 0);

                    return (
                      <TableRow
                        key={item.poNumber}
                        onClick={() => activeTab === 'history' && setDetailDialog({ open: true, item })}
                        className={`hover:bg-accent/40 border-b border-border transition-colors ${activeTab === 'history' ? 'cursor-pointer' : ''}`}
                      >
                        {/* Actions */}
                        <TableCell className="pl-4 md:pl-6 py-4 text-left" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {activeTab === 'history' ? (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApprovePoPriceInput(item.approvePoPrice || item['Approve Po Price'] || item.perUnitPrice || item['Per Unit Price'] || '');
                                  setApprovePoQtyInput(item.approvePoQty || item['Approve Po Qty'] || item.netApprovedQty || item['Net Approved Qty'] || calculatedPoQty || '');
                                  setConfirmDialog({ open: true, item });
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-[11px] rounded-xl px-3 h-8 cursor-pointer shadow-sm"
                              >
                                <FilePlus2 className="h-3.5 w-3.5" />
                                Revise History
                              </Button>
                            ) : (
                              !hasValue(item.actual4) && (
                                <>
                                  <Button onClick={() => {
                                    setApprovePoPriceInput(item.perUnitPrice || item['Per Unit Price'] || '');
                                    setApprovePoQtyInput(calculatedPoQty || '');
                                    setConfirmDialog({ open: true, item });
                                  }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-[11px] rounded-xl px-3 h-8 cursor-pointer shadow-sm">
                                    <CheckSquare className="h-3.5 w-3.5" />Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setCancelDialog({ open: true, item })}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 gap-1 text-[11px] rounded-xl px-2.5 h-8 cursor-pointer"
                                    title="Cancel PO"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Cancel
                                  </Button>
                                </>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pl-4 md:pl-6 py-4 text-left font-semibold text-primary text-xs sm:text-sm">{item.poNumber}</TableCell>
                        <TableCell className="py-4 text-left text-xs sm:text-sm font-medium text-foreground">{item.vendorName}</TableCell>
                        <TableCell className="py-4 text-left font-bold text-xs sm:text-sm text-foreground">
                          {rawPoQty.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4 text-center font-semibold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                          {damageQty}
                        </TableCell>
                        <TableCell className="py-4 text-center font-semibold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                          {extraQty}
                        </TableCell>
                        <TableCell className="py-4 text-center font-semibold text-xs sm:text-sm text-purple-600 dark:text-purple-400">
                          {returnQty}
                        </TableCell>
                        <TableCell className="py-4 text-left font-semibold text-xs sm:text-sm text-foreground">
                          {displayPendingQty.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4 text-left font-semibold text-xs sm:text-sm text-foreground">
                          {displayCancelQty.toLocaleString()}
                        </TableCell>
                      <TableCell className="py-4 text-left">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-border">
                          <MapPin className="h-2.5 w-2.5 text-muted-foreground" />{item.location}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-left">
                        <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />{formatDate(item.planned4)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-left">
                        {hasValue(item.actual4) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3" />Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-left">
                        {item.updatedBy ? (
                          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />{item.updatedBy}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
                ) : (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'history' ? 12 : 13} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="p-3 bg-primary/5 rounded-full"><CheckSquare className="h-8 w-8 text-primary/40" /></div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground/70">No approval records</p>
                          <p className="text-xs">
                            No records match your current filters.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="py-3 px-4 text-center border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Showing <strong>{displayedCount}</strong> of <strong>{totalCount}</strong> records (50 per batch)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                className="rounded-xl text-xs px-4 h-8 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 cursor-pointer font-medium"
              >
                Load Next 50 Rows
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, item: null })}>
        <DialogContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-[540px] bg-card border-border shadow-xl rounded-2xl p-6"
        >
          <DialogHeader className="text-left mb-1 border-b border-border/40 pb-2">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
              <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />Confirm Product Approval
            </DialogTitle>
          </DialogHeader>
          {confirmDialog.item && (() => {
            const rawPoQty = Number(confirmDialog.item.totalQuantity || confirmDialog.item['Total Quantity'] || confirmDialog.item.quantity || confirmDialog.item['Quantity'] || 0);
            const extraQty = Number(confirmDialog.item.extraQty ?? confirmDialog.item['Extra Qty'] ?? confirmDialog.item.BF ?? 0);
            const damageQty = Number(confirmDialog.item.damageQty ?? confirmDialog.item['Damage Qty'] ?? confirmDialog.item.BD ?? 0);
            const returnQty = Number(confirmDialog.item.returnQty ?? confirmDialog.item['Return Qty'] ?? confirmDialog.item['Supply Check Return Qty'] ?? confirmDialog.item.BG ?? 0);
            const calculatedNetQty = rawPoQty + extraQty - damageQty - returnQty;
            const shortageQty = rawPoQty > calculatedNetQty ? (rawPoQty - calculatedNetQty) : 0;

            const priceNum = Number(approvePoPriceInput) || 0;
            const qtyNum = Number(approvePoQtyInput) || 0;
            const finalApprovedAmount = priceNum * qtyNum;

            return (
              <div className="space-y-4 py-1 text-left flex flex-col justify-between">
                {/* ── 2-Column Dashboard Details (Expanded & Larger Fonts) ── */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column: PO & Vendor Info */}
                  <div className="space-y-4 bg-neutral-50/50 dark:bg-neutral-900/30 p-5 rounded-xl border border-border/80 flex flex-col justify-between min-h-[260px]">
                    <div>
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/20 pb-1.5 mb-3">PO Details</h3>
                      
                      <div className="space-y-3.5">
                        <div>
                          <span className="text-[11px] text-muted-foreground block font-semibold">PO Number</span>
                          <span className="text-base font-extrabold text-primary">{confirmDialog.item.poNumber}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground block font-semibold">Vendor</span>
                          <span className="text-sm font-bold text-foreground truncate block">{confirmDialog.item.vendorName}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground block font-semibold">Location</span>
                          <span className="text-sm font-semibold text-foreground">{confirmDialog.item.location || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3.5 border-t border-border/20 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-semibold">Planned Date</span>
                          <span className="text-xs font-bold text-foreground">{formatDate(confirmDialog.item.planned4)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-semibold">Updated By</span>
                          <span className="text-xs font-bold text-foreground">{confirmDialog.item.updatedBy || '—'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Pending Approval
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Quantity Reconciliation */}
                  <div className="space-y-4 bg-neutral-50/50 dark:bg-neutral-900/30 p-5 rounded-xl border border-border/80 flex flex-col justify-between min-h-[260px]">
                    <div>
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/20 pb-1.5 mb-3">Quantity Details</h3>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs font-medium">PO Quantity:</span>
                          <span className="font-bold text-foreground text-sm">{rawPoQty.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs font-medium">Extra Quantity:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">+{extraQty}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs font-medium">Damage Qty:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">-{damageQty}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs font-medium">Return Qty:</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">-{returnQty}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 border-t border-border/20 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-bold text-xs">Net Approved:</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">{calculatedNetQty.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs font-semibold">Canceled Qty:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{shortageQty.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Thinner Billing Summary Card (Sticked to bottom, reduced height) ── */}
                <div className="bg-emerald-600 dark:bg-emerald-700 text-white rounded-xl p-3 px-4 flex justify-between items-center shadow-md mt-4">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[9px] text-emerald-100 font-bold uppercase tracking-wider block">Total Approved Bill Amount</span>
                    <span className="text-[11px] text-emerald-100/90 block font-medium">({calculatedNetQty.toLocaleString()} units × ₹{priceNum.toLocaleString(undefined, { minimumFractionDigits: 2 })} / unit)</span>
                  </div>
                  <span className="text-xl font-black tracking-tight">
                    ₹{finalApprovedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="mt-4 gap-2 border-t border-border/30 pt-4">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, item: null })} className="border-border hover:bg-accent rounded-xl cursor-pointer text-xs h-9 px-4">Cancel</Button>
            <Button onClick={() => confirmDialog.item && handleMarkComplete(confirmDialog.item)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer gap-1.5 text-xs h-9 px-4 font-semibold">
              <CheckSquare className="h-4 w-4" />
              {confirmDialog.item && isCompleted(confirmDialog.item) ? 'Revise Approval' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && setDetailDialog({ open: false, item: null })}>
        <DialogContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-[480px] bg-card border-border shadow-xl rounded-2xl p-6"
        >
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />Approval Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">Full details for this approval record.</DialogDescription>
          </DialogHeader>
          {detailDialog.item && (
            <div className="space-y-3 py-3">
              {[
                { label: 'PO Number', value: detailDialog.item.poNumber },
                { label: 'Vendor', value: detailDialog.item.vendorName },
                { label: 'PO Quantity', value: detailDialog.item.totalQuantity?.toLocaleString() },
                { label: 'Damage Qty', value: detailDialog.item.damageQty ?? detailDialog.item['Damage Qty'] ?? detailDialog.item.BD ?? 0 },
                { label: 'Extra Qty', value: detailDialog.item.extraQty ?? detailDialog.item['Extra Qty'] ?? detailDialog.item.BF ?? 0 },
                { label: 'Location', value: detailDialog.item.location },
                { label: 'Address', value: detailDialog.item.address },
                { label: 'Planned 4 (AG)', value: formatDate(detailDialog.item.planned4) },
                { label: 'Actual 4 (AH)', value: hasValue(detailDialog.item.actual4) ? formatDate(detailDialog.item.actual4) : 'Not yet' },
                { label: 'Status', value: hasValue(detailDialog.item.actual4) ? 'Approved' : 'Pending' },
                { label: 'Delay 4 (AI)', value: hasValue(detailDialog.item.actual4) ? (detailDialog.item.delay4 === 0 ? 'On time' : `${detailDialog.item.delay4} day(s)`) : '—' },
                { label: 'Updated By', value: detailDialog.item.updatedBy || '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between text-sm gap-4">
                  <span className="text-muted-foreground shrink-0">{row.label}</span>
                  <span className="font-medium text-foreground text-right">{row.value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDetailDialog({ open: false, item: null })} className="border-border hover:bg-accent rounded-xl cursor-pointer">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ open: false, item: null })}
        item={cancelDialog.item}
        stageName="Approve Product"
      />

    </div>
  );
}
