import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useSheetData } from '@/hooks/useSheetData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  PackageCheck,
  MapPin,
  Map,
  Truck,
  CalendarClock,
  Eye,
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

// ─── Status tabs ────────────────────────────────────────────────────

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'history', label: 'History' },
];

// ─── Component ──────────────────────────────────────────────────────

export function ReadyProductPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Ready product records (read directly from FMS sheet)
  const [readyProducts, setReadyProducts] = useSheetData('fms-2', 'poNumber');

  // Locations & Transporters from master sheet
  const [locationData] = useSheetData('Locations', 'name');
  const locations = locationData.map((l) => l.name);
  const [transporters] = useSheetData('Transporters', 'id');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, item: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, item: null });
  const [cancelDialog, setCancelDialog] = useState({ open: false, item: null });

  // Transport and details inputs
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [deliveryQty, setDeliveryQty] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [extraQtyInput, setExtraQtyInput] = useState('');

  // Auto populate values when dialog opens
  useEffect(() => {
    if (confirmDialog.item) {
      setTransporterName(confirmDialog.item.transporterName || confirmDialog.item.transporter || '');
      setVehicleNumber(confirmDialog.item.vehicleNumber || '');
      setDeliveryQty(String(confirmDialog.item.quantity || confirmDialog.item.totalQuantity || ''));
      setDeliveryLocation(confirmDialog.item.deliveryLocation || confirmDialog.item.location || '');
      setDeliveryAddress(confirmDialog.item.deliveryAddress || confirmDialog.item.address || '');
      setExtraQtyInput(String(confirmDialog.item.extraQty || ''));
    } else {
      setTransporterName('');
      setVehicleNumber('');
      setDeliveryQty('');
      setDeliveryLocation('');
      setDeliveryAddress('');
      setExtraQtyInput('');
    }
  }, [confirmDialog.item]);

  // ── Pending   = planned2 (col S) NOT null  AND  actual2 (col T) IS null
  // ── Completed = planned2 (col S) NOT null  AND  actual2 (col T) NOT null
  const isPending = (row) => hasValue(row.planned2) && !hasValue(row.actual2);
  const isCompleted = (row) => hasValue(row.planned2) && hasValue(row.actual2);

  // ── Mark product as ready & verify transport ──────────────────────
  const handleMarkReady = (item) => {
    if (!transporterName || !transporterName.trim()) {
      toast('Please select a transporter name', 'error');
      return;
    }
    if (!vehicleNumber || !vehicleNumber.trim()) {
      toast('Please enter a vehicle number', 'error');
      return;
    }
    const enteredQty = parseInt(deliveryQty, 10);
    if (isNaN(enteredQty) || enteredQty <= 0) {
      toast('Please enter a valid quantity greater than 0', 'error');
      return;
    }
    if (!deliveryLocation) {
      toast('Please select a delivery location', 'error');
      return;
    }
    if (!deliveryAddress || !deliveryAddress.trim()) {
      toast('Please enter a delivery address', 'error');
      return;
    }

    const now = new Date();
    const nowTimestamp = makeTimestamp(now); // M/D/YYYY H:mm:ss format
    const planned3Date = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const planned3Timestamp = makeTimestamp(planned3Date);
    const userName = currentUser ? currentUser.name || currentUser.username : 'System';
    const parsedExtra = extraQtyInput !== '' && !isNaN(parseInt(extraQtyInput, 10)) ? parseInt(extraQtyInput, 10) : 0;

    const selectedTransporter = transporterName.trim();
    const updated = readyProducts.map((r) =>
      r.poNumber === item.poNumber
        ? {
            ...r,
            actual2: nowTimestamp,
            updatedBy: userName,
            transporterName: selectedTransporter,
            'Transporter name': selectedTransporter,
            'Transporter Name': selectedTransporter,
            'Transporter': selectedTransporter,
            vehicleNumber: vehicleNumber.trim(),
            'Vehicle Number': vehicleNumber.trim(),
            quantity: enteredQty,
            deliveryLocation: deliveryLocation,
            'Delivery location': deliveryLocation,
            'Delivery Location': deliveryLocation,
            deliveryAddress: deliveryAddress.trim(),
            'Delivery address': deliveryAddress.trim(),
            'Delivery Address': deliveryAddress.trim(),
            'Extra Qty': parsedExtra,
            'Extra Quantity': parsedExtra,
            extraQty: parsedExtra,
            'BF': parsedExtra,
            BF: parsedExtra,
            planned3: planned3Timestamp,
            'Planned 3': planned3Timestamp,
          }
        : r
    );
    setReadyProducts(updated);

    toast(`Product & transport for ${item.poNumber} verified!`, 'success');
    setConfirmDialog({ open: false, item: null });
  };

  const isDeleted = (r) => String(r['Delete Status'] || r.deleteStatus || '').trim().toLowerCase() === 'deleted';

  // ── Filtered & searched list ───────────────────────────────────────
  const filteredItems = useMemo(() => {
    // Only show rows that have planned2 set and are not deleted
    let list = readyProducts.filter((r) => hasValue(r.planned2) && !isDeleted(r));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyProducts, activeTab, searchTerm]);

  // ── Tab counts ─────────────────────────────────────────────────────
  const counts = useMemo(
    () => {
      const staged = readyProducts.filter((r) => hasValue(r.planned2) && !isDeleted(r));
      const pendingCount = staged.filter(isPending).length;
      const historyCount = staged.filter(isCompleted).length;
      return {
        all: staged.length,
        pending: pendingCount,
        history: historyCount,
        completed: historyCount,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readyProducts]
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Ready Product & Transport
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Verify product readiness after billing is complete. Mark products as ready for the next stage.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total */}
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Products</p>
              <p className="text-xl font-bold text-foreground">{counts.all}</p>
            </div>
          </CardContent>
        </Card>
        {/* Pending */}
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
        {/* Completed */}
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed</p>
              <p className="text-xl font-bold text-foreground">{counts.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border bg-card shadow-sm rounded-2xl">
        <CardHeader className="py-4 px-4 md:px-6 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Left: search + record count */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-input bg-background h-9 text-xs sm:text-sm max-w-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground hidden md:inline-block">
              {filteredItems.length} record(s)
            </div>
          </div>

          {/* Right: status tabs + add button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl self-end sm:self-center">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] opacity-70">({counts[tab.key]})</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/10 border-b border-border">
                <TableRow>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider pl-4 md:pl-6 py-3 text-left">
                    Actions
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider pl-4 md:pl-6 py-3 text-left">
                    PO Number
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    Vendor
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    PO Quantity
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    Pending Quantity
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    Canceled Quantity
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    Location
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    Planned
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    Status
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-bold uppercase tracking-wider py-3 text-left">
                    Updated By
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow
                      key={item.poNumber}
                      className="hover:bg-accent/40 border-b border-border transition-colors"
                    >
                      {/* Actions */}
                      <TableCell className="pl-4 md:pl-6 py-4 text-left">
                        <div className="flex items-center gap-1.5">

                          {!hasValue(item.actual2) && (
                            <>
                              <Button
                                onClick={() => {
                                  setConfirmDialog({ open: true, item });
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-[11px] rounded-xl px-3 h-8 cursor-pointer shadow-sm"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                Mark Ready & Transport
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
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pl-4 md:pl-6 py-4 text-left font-semibold text-primary text-xs sm:text-sm">
                        {item.poNumber}
                      </TableCell>

                      {/* Vendor Name */}
                      <TableCell className="py-4 text-left text-xs sm:text-sm font-medium text-foreground">
                        {item.vendorName}
                      </TableCell>

                      {/* PO Quantity */}
                      <TableCell className="py-4 text-left font-bold text-xs sm:text-sm text-foreground">
                        {Number(item.totalQuantity || item['Total Quantity'] || 0).toLocaleString()}
                      </TableCell>

                      {/* Pending Quantity (Col AV) */}
                      <TableCell className="py-4 text-left font-semibold text-xs sm:text-sm text-foreground">
                        {(item['Pending Qty'] != null && item['Pending Qty'] !== '')
                          ? Number(item['Pending Qty']).toLocaleString()
                          : (item.pendingQty != null && item.pendingQty !== '' ? Number(item.pendingQty).toLocaleString() : '0')}
                      </TableCell>

                      {/* Canceled Quantity (Col AW) */}
                      <TableCell className="py-4 text-left font-semibold text-xs sm:text-sm text-foreground">
                        {(item['Cancel Qty'] != null && item['Cancel Qty'] !== '')
                          ? Number(item['Cancel Qty']).toLocaleString()
                          : (item.cancelQty != null && item.cancelQty !== '' ? Number(item.cancelQty).toLocaleString() : '0')}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-4 text-left">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-border">
                          <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                          {item.location}
                        </span>
                      </TableCell>

                      {/* Planned Date */}
                      <TableCell className="py-4 text-left">
                        <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(item.planned2)}
                        </span>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="py-4 text-left">
                        {item.actual2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </TableCell>

                      {/* Updated By */}
                      <TableCell className="py-4 text-left">
                        {item.updatedBy ? (
                          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.updatedBy}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>

                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="p-3 bg-primary/5 rounded-full">
                          <PackageCheck className="h-8 w-8 text-primary/40" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground/70">No ready products</p>
                          <p className="text-xs">
                            {readyProducts.length === 0
                              ? 'No ready products yet. Complete a bill in the Create Bill page first.'
                              : 'No records match your current filters.'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Confirm Ready Dialog ───────────────────────────────────── */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, item: null })}>
        <DialogContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-[540px] bg-card border-border shadow-xl rounded-2xl p-6"
        >
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-500" />
              Confirm Product & Transport Ready
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Verify quantities and transport details before moving this order to the next stage.
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.item && (
            <div className="space-y-4 py-1 text-left">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-0.5 pb-3 border-b border-border">
                <div className="flex justify-between"><span className="text-muted-foreground">PO Number:</span> <span className="font-semibold text-primary truncate ml-1">{confirmDialog.item.poNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vendor:</span> <span className="font-medium truncate ml-1">{confirmDialog.item.vendorName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Planned 2:</span> <span className="font-medium ml-1">{formatDate(confirmDialog.item.planned2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Processed By:</span> <span className="font-medium ml-1">{currentUser ? currentUser.name || currentUser.username : 'System'}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Row 1: Transporter & Vehicle */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Transporter Name*
                  </Label>
                  <select
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="" disabled>Select transporter</option>
                    {transporters.map((t) => (
                      <option key={t.id || t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                    {transporterName && !transporters.some(t => t.name === transporterName) && (
                      <option value={transporterName}>{transporterName}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Vehicle Number*
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. CG06GB34XX"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="rounded-xl bg-background border-input text-xs h-9"
                  />
                </div>

                {/* Row 2: Delivery Qty & Extra Qty */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Delivery Quantity*</Label>
                  <Input
                    type="number"
                    min="1"
                    value={deliveryQty}
                    onChange={(e) => setDeliveryQty(e.target.value)}
                    className="rounded-xl bg-background border-input text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Extra Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={extraQtyInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        setExtraQtyInput(val);
                      }
                    }}
                    placeholder="e.g. 100"
                    className="rounded-xl bg-background border-input text-xs h-9"
                  />
                </div>

                {/* Row 3: Location & Address */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Delivery Location*
                  </Label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="" disabled>Select location</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Map className="h-3 w-3" />
                    Delivery Address*
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter delivery address..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="rounded-xl bg-background border-input text-xs h-9"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-5 gap-2 flex-row justify-end border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, item: null })}
              className="border-border hover:bg-accent rounded-xl cursor-pointer text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmDialog.item && handleMarkReady(confirmDialog.item)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer gap-1.5 text-xs h-9 px-4"
            >
              <Truck className="h-4 w-4" />
              Confirm Ready & Transport
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail View Dialog ─────────────────────────────────────── */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && setDetailDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-xl rounded-2xl p-6">
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Product Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Full details for this ready product record.
            </DialogDescription>
          </DialogHeader>

          {detailDialog.item && (
            <div className="space-y-3 py-3">
              {[
                { label: 'PO Number', value: detailDialog.item.poNumber },
                { label: 'Vendor', value: detailDialog.item.vendorName },
                { label: 'Quantity', value: detailDialog.item.totalQuantity?.toLocaleString() },
                { label: 'Location', value: detailDialog.item.location },
                { label: 'Address', value: detailDialog.item.address },
                { label: 'Planned Date', value: formatDate(detailDialog.item.planned2) },
                { label: 'Actual Date', value: detailDialog.item.actual2 ? formatDate(detailDialog.item.actual2) : 'Not yet' },
                ...(detailDialog.item.actual2 ? [
                  { label: 'Transporter', value: detailDialog.item.transporterName || detailDialog.item.transporter || '—' },
                  { label: 'Vehicle Number', value: detailDialog.item.vehicleNumber || '—' },
                  { label: 'Delivery Qty', value: detailDialog.item.quantity?.toLocaleString() || '—' },
                  { label: 'Delivery Location', value: detailDialog.item.deliveryLocation || '—' },
                  { label: 'Delivery Address', value: detailDialog.item.deliveryAddress || '—' },
                  { label: 'Extra Qty', value: detailDialog.item.extraQty?.toLocaleString() || '0' },
                ] : []),
                { label: 'Status', value: detailDialog.item.actual2 ? 'Completed' : 'Pending' },
                { label: 'Delay', value: detailDialog.item.actual2 ? ((detailDialog.item.delay2 || 0) === 0 ? 'On time' : `${detailDialog.item.delay2} day(s)`) : '—' },
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
            <Button
              variant="outline"
              onClick={() => setDetailDialog({ open: false, item: null })}
              className="border-border hover:bg-accent rounded-xl cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ open: false, item: null })}
        item={cancelDialog.item}
        stageName="Ready Product"
      />

    </div>
  );
}
