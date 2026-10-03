import { AlertCircle, ArrowDownUp, ChevronLeft, ChevronRight, Download, Eye, FileSpreadsheet, Minus, PackagePlus, Pencil, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Modal } from '@/src/components/ui/Modal';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { useToast } from '@/src/components/ui/Toast';
import { DOSAGE_UNITS, MEDICINE_CATEGORIES } from '@/src/constants/data';
import { inventoryService } from '@/src/services/inventoryService';
import type { Medicine, StockLevel } from '@/src/types/models';
import { resolveStockLevel } from '@/src/utils/stockLevel';

type SortKey = 'name' | 'quantity' | 'price' | 'updated';
type CsvRow = { row: number; data: Partial<Medicine>; errors: string[] };
const emptyMedicine: Medicine = { id: '', genericName: '', brandName: '', dosageValue: 0, dosageUnit: 'mg', category: '', price: 0, quantity: 0, prescriptionRequired: false, lastUpdated: '' };

export function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Medicine[] | null>(null);
  const [search, setSearch] = useState('');
  const [stock, setStock] = useState<StockLevel | 'ALL'>(() => (params.get('stock') as StockLevel | null) ?? 'ALL');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<SortKey>('name');
  const [editor, setEditor] = useState<Medicine | null>(() => params.get('add') === 'true' ? { ...emptyMedicine } : null);
  const [viewing, setViewing] = useState<Medicine | null>(null);
  const [restocking, setRestocking] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState<Medicine | null>(null);
  const [csvOpen, setCsvOpen] = useState(() => params.get('csv') === 'true');
  const { showToast } = useToast();

  const load = useCallback(() => inventoryService.list().then(setItems).catch(() => { setItems([]); showToast('Unable to load inventory.', 'error'); }), [showToast]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const result = (items ?? []).filter((item) => {
      const matchesSearch = `${item.genericName} ${item.brandName} ${item.dosageValue} ${item.dosageUnit}`.toLowerCase().includes(search.toLowerCase());
      const matchesStock = stock === 'ALL' || resolveStockLevel(item.quantity, item.stockLevel) === stock;
      return matchesSearch && matchesStock && (category === 'ALL' || item.category === category);
    });
    return result.sort((a, b) => sort === 'name' ? a.brandName.localeCompare(b.brandName) : sort === 'quantity' ? b.quantity - a.quantity : sort === 'price' ? b.price - a.price : +new Date(b.lastUpdated) - +new Date(a.lastUpdated));
  }, [items, search, stock, category, sort]);

  const save = async (medicine: Medicine) => {
    try { await inventoryService.save(medicine); await load(); setEditor(null); showToast(medicine.id ? 'Medicine updated.' : 'Medicine added.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save medicine.', 'error'); }
  };
  const updateQuantity = async (medicine: Medicine, delta: number) => {
    const next = { ...medicine, quantity: Math.max(0, medicine.quantity + delta) };
    try { await inventoryService.save(next); setItems((current) => current?.map((item) => item.id === next.id ? next : item) ?? []); showToast('Quantity updated.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Update failed.', 'error'); }
  };
  const remove = async () => {
    if (!deleting) return;
    try { await inventoryService.remove(deleting.id); setItems((current) => current?.filter((item) => item.id !== deleting.id) ?? []); setDeleting(null); showToast('Medicine deleted.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Delete failed.', 'error'); }
  };
  const closeQueryModal = (setter: (value: boolean) => void) => { setter(false); setParams({}); };

  return (
    <>
      <header className="page-header"><div><span className="eyebrow">Inventory management</span><h1>Medicines</h1><p>Track exact store quantities while sharing only categorized availability with patients.</p></div><div className="header-actions"><button className="button button-secondary" onClick={() => setCsvOpen(true)}><Upload size={18} /> Import CSV</button><button className="button" onClick={() => setEditor({ ...emptyMedicine })}><PackagePlus size={18} /> Add medicine</button></div></header>

      <section className="panel inventory-panel">
        <div className="inventory-toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search medicine, generic name, or dosage" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</div><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">All categories</option>{MEDICINE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><label className="sort-select"><ArrowDownUp size={15} /><select aria-label="Sort inventory" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="name">Medicine name</option><option value="quantity">Quantity</option><option value="price">Price</option><option value="updated">Last updated</option></select></label></div>
        <div className="filter-tabs">{(['ALL', 'HIGH_STOCK', 'MEDIUM_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((value) => <button className={stock === value ? 'active' : ''} onClick={() => setStock(value)} key={value}>{value === 'ALL' ? 'All' : value.replace('_STOCK', '').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}<span>{value === 'ALL' ? items?.length ?? 0 : items?.filter((item) => resolveStockLevel(item.quantity, item.stockLevel) === value).length ?? 0}</span></button>)}</div>

        {items === null ? <div className="table-loading">Loading pharmacy inventory…</div> : filtered.length === 0 ? <EmptyState icon={Search} title={items.length ? 'No matching medicines' : 'No medicines yet'} description={items.length ? 'Try clearing a filter or searching another name.' : 'Add one medicine or import a validated CSV file.'} action={<button className="button button-small" onClick={() => setEditor({ ...emptyMedicine })}>Add medicine</button>} /> : <div className="table-scroll"><table className="inventory-table"><thead><tr><th>Medicine</th><th>Generic name</th><th>Dosage</th><th>Category</th><th>Price</th><th>Quantity</th><th>Stock status</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((medicine) => <tr key={medicine.id}><td><div className="medicine-cell"><span>{medicine.brandName.slice(0,2).toUpperCase()}</span><div><strong>{medicine.brandName}</strong>{medicine.prescriptionRequired && <small>Rx required</small>}</div></div></td><td>{medicine.genericName}</td><td>{medicine.dosageValue} {medicine.dosageUnit}</td><td><span className="category-chip">{medicine.category}</span></td><td>₱{medicine.price.toFixed(2)}</td><td><div className="quantity-stepper"><button onClick={() => updateQuantity(medicine, -1)} aria-label={`Decrease ${medicine.brandName} quantity`}><Minus size={13} /></button><strong>{medicine.quantity}</strong><button onClick={() => updateQuantity(medicine, 1)} aria-label={`Increase ${medicine.brandName} quantity`}><Plus size={13} /></button></div></td><td><StatusBadge status={resolveStockLevel(medicine.quantity, medicine.stockLevel)} /></td><td><span className="date-cell">{new Date(medicine.lastUpdated).toLocaleDateString()}<small>{new Date(medicine.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span></td><td><div className="row-actions"><button onClick={() => setViewing(medicine)} aria-label={`View ${medicine.brandName}`}><Eye size={16} /></button><button onClick={() => setEditor(medicine)} aria-label={`Edit ${medicine.brandName}`}><Pencil size={16} /></button><button onClick={() => setRestocking(medicine)} aria-label={`Restock ${medicine.brandName}`}><RefreshCw size={16} /></button><button className="danger" onClick={() => setDeleting(medicine)} aria-label={`Delete ${medicine.brandName}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
        <div className="table-footer"><span>Showing {filtered.length} of {items?.length ?? 0} medicines</span><div><button disabled><ChevronLeft size={16} /></button><b>1</b><button disabled><ChevronRight size={16} /></button></div></div>
      </section>

      <MedicineModal medicine={editor} onClose={() => { setEditor(null); setParams({}); }} onSave={save} />
      <ViewMedicineModal medicine={viewing} onClose={() => setViewing(null)} onEdit={() => { if (viewing) setEditor(viewing); setViewing(null); }} />
      <RestockModal key={restocking?.id ?? 'none'} medicine={restocking} onClose={() => setRestocking(null)} onSubmit={(amount) => { if (restocking) updateQuantity(restocking, amount); setRestocking(null); }} />
      <Modal open={Boolean(deleting)} title="Delete medicine?" onClose={() => setDeleting(null)}><div className="confirmation-body"><span className="danger-icon"><Trash2 /></span><p><strong>{deleting?.brandName} {deleting?.dosageValue} {deleting?.dosageUnit}</strong> will be removed from this pharmacy’s inventory. This action cannot be undone.</p></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setDeleting(null)}>Cancel</button><button className="button button-danger" onClick={remove}>Delete medicine</button></div></Modal>
      <CsvImportModal open={csvOpen} onClose={() => closeQueryModal(setCsvOpen)} onImport={async (rows) => { for (const row of rows) await save(row); closeQueryModal(setCsvOpen); showToast(`${rows.length} valid medicines imported.`); }} />
    </>
  );
}

function MedicineModal({ medicine, onClose, onSave }: { medicine: Medicine | null; onClose: () => void; onSave: (medicine: Medicine) => void }) {
  if (!medicine) return null;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get('quantity')); const price = Number(form.get('price')); const dosageValue = Number(form.get('dosageValue'));
    if ([quantity, price, dosageValue].some((value) => value < 0 || Number.isNaN(value))) return;
    onSave({ ...medicine, genericName: String(form.get('genericName')), brandName: String(form.get('brandName')), dosageValue, dosageUnit: String(form.get('dosageUnit')) as Medicine['dosageUnit'], category: String(form.get('category')), price, quantity, prescriptionRequired: form.get('prescriptionRequired') === 'on' });
  };
  return <Modal open title={medicine.id ? 'Edit medicine' : 'Add medicine'} onClose={onClose} wide><form onSubmit={submit} className="modal-form medicine-form"><section><h3>Medicine identity</h3><div className="form-grid"><label>Generic name<input name="genericName" defaultValue={medicine.genericName} placeholder="Paracetamol" required /></label><label>Brand / medicine name<input name="brandName" defaultValue={medicine.brandName} placeholder="Biogesic" required /></label></div></section><section><h3>Dosage &amp; classification</h3><div className="form-grid form-grid-three"><label>Dosage value<input name="dosageValue" type="number" min="0.01" step="0.01" defaultValue={medicine.dosageValue || ''} required /></label><label>Unit<select name="dosageUnit" defaultValue={medicine.dosageUnit}>{DOSAGE_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><label>Category<select name="category" defaultValue={medicine.category} required><option value="">Select category</option>{MEDICINE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label></div></section><section><h3>Pricing &amp; inventory</h3><div className="form-grid"><label>Price (PHP)<input name="price" type="number" min="0" step="0.01" defaultValue={medicine.price || ''} required /></label><label>Quantity<input name="quantity" type="number" min="0" step="1" defaultValue={medicine.quantity} required /></label></div></section><section><h3>Prescription</h3><label className="check-card"><input name="prescriptionRequired" type="checkbox" defaultChecked={medicine.prescriptionRequired} /><span><strong>Prescription required</strong><small>Patients will see an Rx indicator.</small></span></label></section><p className="info-note"><AlertCircle size={15} /> Stock status follows the existing shared backend policy.</p><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button">{medicine.id ? 'Save changes' : 'Add medicine'}</button></div></form></Modal>;
}

function ViewMedicineModal({ medicine, onClose, onEdit }: { medicine: Medicine | null; onClose: () => void; onEdit: () => void }) {
  return <Modal open={Boolean(medicine)} title="Medicine details" onClose={onClose}>{medicine && <div className="medicine-detail"><div className="detail-hero"><span>{medicine.brandName.slice(0,2).toUpperCase()}</span><div><h3>{medicine.brandName} {medicine.dosageValue} {medicine.dosageUnit}</h3><p>{medicine.genericName}</p></div><StatusBadge status={resolveStockLevel(medicine.quantity, medicine.stockLevel)} /></div><dl><div><dt>Category</dt><dd>{medicine.category}</dd></div><div><dt>Price</dt><dd>₱{medicine.price.toFixed(2)}</dd></div><div><dt>Quantity</dt><dd>{medicine.quantity} units</dd></div><div><dt>Prescription</dt><dd>{medicine.prescriptionRequired ? 'Required' : 'Not required'}</dd></div></dl><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Close</button><button className="button" onClick={onEdit}><Pencil size={16} /> Edit medicine</button></div></div>}</Modal>;
}

function RestockModal({ medicine, onClose, onSubmit }: { medicine: Medicine | null; onClose: () => void; onSubmit: (amount: number) => void }) {
  const [amount, setAmount] = useState(0);
  return <Modal open={Boolean(medicine)} title={`Restock ${medicine?.brandName ?? ''}`} onClose={onClose}>{medicine && <div className="restock-body"><div className="restock-calculation"><span>Current stock<strong>{medicine.quantity}</strong></span><b>+</b><label>Add<input type="number" min="1" value={amount || ''} onChange={(event) => setAmount(Math.max(0, Number(event.target.value)))} autoFocus /></label><b>=</b><span>Result<strong>{medicine.quantity + amount}</strong></span></div><p>Only the pharmacy workspace shows exact units. Patients receive categorized availability.</p><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={amount <= 0} onClick={() => onSubmit(amount)}>Confirm restock</button></div></div>}</Modal>;
}

function CsvImportModal({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (rows: Medicine[]) => void }) {
  const [rows, setRows] = useState<CsvRow[]>([]); const input = useRef<HTMLInputElement>(null);
  const parse = async (file: File) => {
    const text = await file.text(); const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean); const headers = lines.shift()?.split(',').map((value) => value.trim().toLowerCase()) ?? [];
    const key = (name: string) => headers.indexOf(name);
    const parsed = lines.map((line, index): CsvRow => { const cells = line.split(',').map((value) => value.trim()); const dosageUnit = cells[key('unit')] as Medicine['dosageUnit']; const data: Partial<Medicine> = { id: '', genericName: cells[key('generic name')], brandName: cells[key('brand name')], dosageValue: Number(cells[key('dosage')]), dosageUnit, category: cells[key('category')], price: Number(cells[key('price')]), quantity: Number(cells[key('quantity')]), prescriptionRequired: /^(true|yes|1)$/i.test(cells[key('prescription required')]), lastUpdated: '' }; const errors: string[] = []; if (!data.genericName) errors.push('missing generic name'); if (!data.brandName) errors.push('missing brand name'); if (!DOSAGE_UNITS.includes(dosageUnit)) errors.push('invalid dosage unit'); if (Number.isNaN(data.price) || Number(data.price) < 0) errors.push('invalid price'); if (!Number.isInteger(data.quantity) || Number(data.quantity) < 0) errors.push('invalid quantity'); return { row: index + 2, data, errors }; }); setRows(parsed);
  };
  const download = () => { const csv = 'Generic Name,Brand Name,Dosage,Unit,Category,Price,Quantity,Prescription Required\nParacetamol,Biogesic,500,mg,Analgesic,6.50,48,No'; const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pharmacy-inventory-template.csv'; anchor.click(); URL.revokeObjectURL(url); };
  const valid = rows.filter((row) => row.errors.length === 0).map((row) => row.data as Medicine);
  return <Modal open={open} title="Import inventory CSV" onClose={onClose} wide><div className="csv-body">{rows.length === 0 ? <><button className="csv-drop" onClick={() => input.current?.click()}><FileSpreadsheet size={31} /><strong>Choose a CSV file</strong><span>Rows are parsed locally and previewed before import.</span><small>Maximum 5 MB · CSV only</small></button><input ref={input} hidden type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) parse(file); }} /><button className="inline-link download-template" onClick={download}><Download size={16} /> Download CSV template</button></> : <><div className="csv-summary"><span><strong>{valid.length}</strong> valid rows</span><span className="has-errors"><strong>{rows.length - valid.length}</strong> rows with errors</span><button onClick={() => setRows([])}>Choose another file</button></div><div className="csv-preview"><table><thead><tr><th>Row</th><th>Medicine</th><th>Dosage</th><th>Price</th><th>Quantity</th><th>Validation</th></tr></thead><tbody>{rows.map((row) => <tr key={row.row} className={row.errors.length ? 'invalid' : ''}><td>{row.row}</td><td>{row.data.brandName}<small>{row.data.genericName}</small></td><td>{row.data.dosageValue} {row.data.dosageUnit}</td><td>{row.data.price}</td><td>{row.data.quantity}</td><td>{row.errors.length ? row.errors.join(', ') : '✓ Valid'}</td></tr>)}</tbody></table></div></>}<div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={!valid.length} onClick={() => onImport(valid)}>Import {valid.length} valid row{valid.length === 1 ? '' : 's'}</button></div></div></Modal>;
}
