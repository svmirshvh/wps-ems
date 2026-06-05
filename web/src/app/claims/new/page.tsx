'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Send, Save, ChevronDown, ChevronUp, Info, Loader2, X, UserCheck } from 'lucide-react';
import { claimsApi } from '@/lib/api/claims';
import { exchangeRatesApi } from '@/lib/api/exchange-rates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/store/auth-store';
import { toast } from '@/lib/hooks/use-toast';
import { EXPENSE_CATEGORIES, PILLARS, CURRENCIES, COUNTRIES, formatCurrency, formatDateInput } from '@/lib/utils';
import { ReceiptUpload } from '@/components/claims/receipt-upload';

const itemSchema = z.object({
  expenseDate: z.string().min(1, 'Date required'),
  categoryCode: z.string().min(1, 'Category required'),
  categoryName: z.string(),
  plCostTypeNr: z.string().optional(),
  plCostTypeName: z.string().optional(),
  pillarName: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  country: z.string().optional(),
  currency: z.string().default('AED'),
  originalAmount: z.number({ invalid_type_error: 'Enter valid amount' }).min(0.01, 'Amount must be > 0'),
  receiptNumber: z.string().optional(),
});

const claimSchema = z.object({
  eventName: z.string().min(1, 'Event name / purpose is required'),
  purpose: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one expense item'),
});

type ClaimFormData = z.infer<typeof claimSchema>;

const EMPTY_ITEM = {
  expenseDate: formatDateInput(new Date()),
  categoryCode: '',
  categoryName: '',
  plCostTypeNr: '',
  plCostTypeName: '',
  pillarName: '',
  description: '',
  country: 'UAE',
  currency: 'AED',
  originalAmount: 0,
  receiptNumber: '',
};

export default function NewClaimPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [savedClaimId, setSavedClaimId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  const [selectedFinanceId, setSelectedFinanceId] = useState('');
  const [showFinanceSelect, setShowFinanceSelect] = useState(false);

  const { data: exchangeRates } = useQuery({
    queryKey: ['exchange-rates-latest'],
    queryFn: exchangeRatesApi.getLatest,
  });

  const { data: financeMembers } = useQuery({
    queryKey: ['finance-members'],
    queryFn: claimsApi.getFinanceMembers,
  });

  const { register, control, handleSubmit, watch, getValues, setValue, formState: { errors, isDirty } } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      department: user?.department || '',
      items: [EMPTY_ITEM],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  const AUTOSAVE_KEY = 'wps-claim-draft';

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.eventName) setValue('eventName', parsed.eventName);
        if (parsed.purpose) setValue('purpose', parsed.purpose);
        if (parsed.department) setValue('department', parsed.department);
        if (parsed.notes) setValue('notes', parsed.notes);
        if (parsed.items?.length) {
          parsed.items.forEach((item: any, i: number) => {
            if (i === 0) {
              Object.keys(item).forEach(k => setValue(`items.0.${k}` as any, item[k]));
            } else {
              append(item);
            }
          });
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to localStorage every 60 seconds if form has content
  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = getValues();
      const hasContent = snapshot.eventName || snapshot.purpose || snapshot.items?.some(i => i.description);
      if (hasContent) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
      }
    }, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving with unsaved data
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const snapshot = getValues();
      const hasContent = snapshot.eventName || snapshot.purpose || snapshot.items?.some(i => i.description);
      if (hasContent && !savedClaimId) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedClaimId]);

  const getAedAmount = (currency: string, amount: number): number => {
    if (!amount || !exchangeRates) return 0;
    if (currency === 'AED') return amount;
    const rate = exchangeRates[currency] || 0;
    return amount * rate;
  };

  const getEurAmount = (aedAmount: number): number => aedAmount / 4.31;

  const totalAed = items.reduce((sum, item) => sum + getAedAmount(item.currency, Number(item.originalAmount) || 0), 0);
  const totalEur = getEurAmount(totalAed);

  // Group totals by category
  const categoryTotals = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: items
      .filter(i => i.categoryCode === cat.code)
      .reduce((sum, i) => sum + getAedAmount(i.currency, Number(i.originalAmount) || 0), 0),
  })).filter(c => c.total > 0);

  const saveDraftMutation = useMutation({
    mutationFn: async (data: ClaimFormData) => {
      let claim;
      if (!savedClaimId) {
        claim = await claimsApi.create({ eventName: data.eventName, purpose: data.purpose, department: data.department, notes: data.notes });
        setSavedClaimId(claim.id);
      } else {
        claim = await claimsApi.update(savedClaimId, { eventName: data.eventName, purpose: data.purpose, department: data.department, notes: data.notes });
      }
      return claim;
    },
  });

  const onSaveDraft = async (data: ClaimFormData) => {
    try {
      await saveDraftMutation.mutateAsync(data);
      localStorage.removeItem(AUTOSAVE_KEY);
      toast({ title: 'Draft saved', variant: 'default' });
    } catch {
      toast({ title: 'Failed to save draft', variant: 'destructive' });
    }
  };

  const onSubmit = async (data: ClaimFormData) => {
    setIsSubmitting(true);
    try {
      // Create claim first if not saved
      let claimId = savedClaimId;
      if (!claimId) {
        const claim = await claimsApi.create({ eventName: data.eventName, purpose: data.purpose, department: data.department, notes: data.notes });
        claimId = claim.id;
        setSavedClaimId(claimId);
      } else {
        await claimsApi.update(claimId, { eventName: data.eventName, purpose: data.purpose, department: data.department, notes: data.notes });
      }

      // Add all items
      for (const item of data.items) {
        await claimsApi.addItem(claimId!, {
          expenseDate: item.expenseDate,
          categoryCode: item.categoryCode,
          categoryName: item.categoryName || EXPENSE_CATEGORIES.find(c => c.code === item.categoryCode)?.name || '',
          plCostTypeNr: item.plCostTypeNr,
          plCostTypeName: item.plCostTypeName,
          pillarName: item.pillarName,
          description: item.description,
          country: item.country,
          currency: item.currency,
          originalAmount: Number(item.originalAmount),
          receiptNumber: item.receiptNumber,
        });
      }

      // Submit (with optional finance member assignment)
      await claimsApi.submit(claimId!, selectedFinanceId || undefined);

      queryClient.invalidateQueries({ queryKey: ['claims'] });
      localStorage.removeItem(AUTOSAVE_KEY);
      router.push(`/claims/${claimId}?submitted=true`);
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (index: number, categoryCode: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.code === categoryCode);
    if (cat) {
      setValue(`items.${index}.categoryCode`, categoryCode);
      setValue(`items.${index}.categoryName`, cat.name);
      setValue(`items.${index}.plCostTypeNr`, '');
      setValue(`items.${index}.plCostTypeName`, '');
    }
  };

  const handlePLTypeChange = (index: number, plNr: string) => {
    const catCode = items[index].categoryCode;
    const cat = EXPENSE_CATEGORIES.find(c => c.code === catCode);
    const plItem = cat?.items.find(i => i.plNr === plNr);
    if (plItem) {
      setValue(`items.${index}.plCostTypeNr`, plNr);
      setValue(`items.${index}.plCostTypeName`, plItem.name);
    }
  };

  const toggleItem = (index: number) => {
    const next = new Set(expandedItems);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedItems(next);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Expense Claim</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details and add expense items</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSubmit(onSaveDraft)} disabled={saveDraftMutation.isPending}>
            {saveDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1.5">Save Draft</span>
          </Button>
        </div>
      </div>

      {/* Claim Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-wurth-cyan" /> Claim Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Input value={`${user?.lastName}, ${user?.firstName}`} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-1.5">
              <Label>Account No.</Label>
              <Input value={user?.accountNo || ''} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="eventName">Event Name / Purpose <span className="text-red-500">*</span></Label>
              <Input id="eventName" placeholder="e.g. Client visit - Abu Dhabi" {...register('eventName')} />
              {errors.eventName && <p className="text-xs text-red-600">{errors.eventName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input id="department" placeholder="e.g. Sales" {...register('department')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" placeholder="Optional notes" {...register('notes')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Expense Items</h2>
          {errors.items?.root && (
            <p className="text-xs text-red-600">{errors.items.root.message}</p>
          )}
        </div>

        {fields.map((field, index) => {
          const item = items[index];
          const selectedCat = EXPENSE_CATEGORIES.find(c => c.code === item?.categoryCode);
          const aedAmount = getAedAmount(item?.currency || 'AED', Number(item?.originalAmount) || 0);
          const isExpanded = expandedItems.has(index);

          return (
            <Card key={field.id} className="border-l-4 border-l-wurth-red/30 hover:border-l-wurth-red transition-colors">
              {/* Item Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => toggleItem(index)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 bg-wurth-red text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item?.categoryName || 'New Expense'} {item?.description ? `— ${item.description}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item?.currency !== 'AED' && item?.originalAmount > 0
                        ? `${item.currency} ${Number(item.originalAmount).toFixed(2)} = `
                        : ''}
                      <span className="font-semibold text-gray-700">AED {aedAmount.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); remove(index); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Item Form */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Date */}
                    <div className="space-y-1.5 col-span-1">
                      <Label>Date *</Label>
                      <Input type="date" {...register(`items.${index}.expenseDate`)} />
                      {errors.items?.[index]?.expenseDate && (
                        <p className="text-xs text-red-600">{errors.items[index]?.expenseDate?.message}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <Label>Category *</Label>
                      <Select value={item?.categoryCode || ''} onValueChange={(val) => handleCategoryChange(index, val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.code} value={cat.code}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* PL Cost Type */}
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <Label>PL Cost Type</Label>
                      <Select
                        value={item?.plCostTypeNr || ''}
                        onValueChange={(val) => handlePLTypeChange(index, val)}
                        disabled={!item?.categoryCode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCat?.items.map((plItem) => (
                            <SelectItem key={plItem.plNr} value={plItem.plNr}>
                              <span className="text-xs text-gray-500 mr-1">{plItem.plNr}</span> {plItem.name}
                            </SelectItem>
                          ))}
                          {(!selectedCat?.items.length) && (
                            <SelectItem value="_none" disabled>No sub-types for this category</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pillar */}
                    <div className="space-y-1.5">
                      <Label>Pillar</Label>
                      <Select value={item?.pillarName || ''} onValueChange={(val) => setValue(`items.${index}.pillarName`, val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pillar" />
                        </SelectTrigger>
                        <SelectContent>
                          {PILLARS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5 col-span-2">
                      <Label>Description *</Label>
                      <Input placeholder="Expense description" {...register(`items.${index}.description`)} />
                      {errors.items?.[index]?.description && (
                        <p className="text-xs text-red-600">{errors.items[index]?.description?.message}</p>
                      )}
                    </div>

                    {/* Country */}
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Select value={item?.country || ''} onValueChange={(val) => setValue(`items.${index}.country`, val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Currency */}
                    <div className="space-y-1.5">
                      <Label>Currency *</Label>
                      <Select value={item?.currency || 'AED'} onValueChange={(val) => setValue(`items.${index}.currency`, val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register(`items.${index}.originalAmount`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.originalAmount && (
                        <p className="text-xs text-red-600">{errors.items[index]?.originalAmount?.message}</p>
                      )}
                    </div>

                    {/* AED Equivalent */}
                    {item?.currency !== 'AED' && (
                      <div className="space-y-1.5">
                        <Label>AED Equivalent</Label>
                        <div className="h-10 px-3 flex items-center bg-gray-50 border border-gray-200 rounded text-sm font-semibold text-gray-700">
                          {formatCurrency(aedAmount)}
                          <span className="ml-1 text-xs text-gray-400 font-normal">
                            @ {exchangeRates?.[item.currency]?.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Receipt Number */}
                    <div className="space-y-1.5">
                      <Label>Receipt No.</Label>
                      <Input placeholder="e.g. RCP-001" {...register(`items.${index}.receiptNumber`)} />
                    </div>
                  </div>

                  {/* Receipt Upload */}
                  {savedClaimId && (
                    <div className="mt-4">
                      <ReceiptUpload claimId={savedClaimId} itemIndex={index} />
                    </div>
                  )}
                  {!savedClaimId && (
                    <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Save as draft first to enable receipt uploads
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Add Item Button */}
        <button
          type="button"
          onClick={() => {
            append({ ...EMPTY_ITEM, expenseDate: formatDateInput(new Date()) });
            setExpandedItems(prev => new Set(Array.from(prev).concat(fields.length)));
          }}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-wurth-red hover:text-wurth-red transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Expense Item
        </button>
      </div>

      {/* Totals Summary */}
      {items.some(i => Number(i.originalAmount) > 0) && (
        <Card className="bg-gray-900 text-white border-0">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Category Breakdown</p>
                <div className="space-y-1">
                  {categoryTotals.map(cat => (
                    <div key={cat.code} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-300 truncate">{cat.name}</span>
                      <span className="text-sm font-semibold shrink-0">{formatCurrency(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 sm:ml-4 pt-2 sm:pt-0 border-t border-white/10 sm:border-0">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalAed)}</p>
                <p className="text-gray-400 text-sm">EUR {totalEur.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance Member Selection */}
      {financeMembers && financeMembers.length > 0 && (
        <Card className="border-l-4 border-l-wurth-cyan">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-wurth-cyan flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Assign Finance Contact</p>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  Choose which Finance team member should receive and process this claim.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {financeMembers.map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedFinanceId(selectedFinanceId === m.id ? '' : m.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        selectedFinanceId === m.id
                          ? 'border-wurth-cyan bg-cyan-50 ring-1 ring-wurth-cyan'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      </div>
                      {selectedFinanceId === m.id && (
                        <UserCheck className="h-4 w-4 text-wurth-cyan ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                {!selectedFinanceId && (
                  <p className="text-xs text-amber-600 mt-2">Select a finance member to route your claim directly to them.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pb-6">
        <Button type="button" variant="outline" onClick={() => router.push('/claims')}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={handleSubmit(onSaveDraft)} disabled={saveDraftMutation.isPending}>
          {saveDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save as Draft
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Claim
        </Button>
      </div>
    </form>
  );
}
