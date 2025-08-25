import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Plus, DollarSign, Receipt, TrendingUp, TrendingDown, FileText, CheckCircle, Split, CreditCard, Wallet, Banknote, Gift, AlertCircle } from 'lucide-react';
import { Invoice, InvoiceItem, PaymentMethod, Client, Product } from '../../types';

const Finance: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments'>('overview');
  
  const [allInvoices, setAllInvoices] = useLocalStorage<Invoice[]>('invoices', []);
  const [allClients] = useLocalStorage<Client[]>('clients', []);
  const [allProducts] = useLocalStorage<Product[]>('products', []);
  
  const invoices = allInvoices.filter(invoice => invoice.branch_id === user?.branch_id);
  const clients = allClients.filter(client => client.branch_id === user?.branch_id);
  const products = allProducts.filter(product => product.branch_id === user?.branch_id);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState<Invoice | null>(null);

  const [invoiceFormData, setInvoiceFormData] = useState({
    client_id: '',
    booking_id: '',
    amount: '',
    tax_amount: '',
    due_date: '',
    notes: '',
    items: [] as Array<{
      item_type: 'time_entry' | 'product' | 'service';
      related_id?: string;
      name?: string;
      quantity: number;
      unit_price: number;
    }>
  });

  const financialSummary = React.useMemo(() => {
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    
    const pendingAmount = invoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    const partiallyPaidAmount = invoices
      .filter(inv => inv.payment_status === 'partial')
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    return {
      total_revenue: totalRevenue,
      pending_amount: pendingAmount,
      partially_paid: partiallyPaidAmount,
      total_invoices: invoices.length
    };
  }, [invoices]);

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsTotal = invoiceFormData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const baseAmount = parseFloat(invoiceFormData.amount) || 0;
    const totalAmount = baseAmount + itemsTotal;
    const taxAmount = parseFloat(invoiceFormData.tax_amount) || 0;
    const finalTotal = totalAmount + taxAmount;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      branch_id: user?.branch_id || '1',
      client_id: invoiceFormData.client_id || undefined,
      booking_id: invoiceFormData.booking_id || undefined,
      invoice_number: `INV-${Date.now()}`,
      amount: totalAmount,
      tax_amount: taxAmount,
      total_amount: finalTotal,
      status: 'pending',
      payment_status: 'pending',
      remaining_balance_action: 'none',
      due_date: invoiceFormData.due_date,
      notes: invoiceFormData.notes,
      created_at: new Date().toISOString(),
      items: invoiceFormData.items.map(item => ({
        id: `${Date.now()}-${Math.random()}`,
        invoice_id: Date.now().toString(),
        item_type: item.item_type,
        related_id: item.related_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        individual_name: item.individual_name,
        is_split: false,
        created_at: new Date().toISOString()
      })),
      payment_methods: []
    };

    setAllInvoices([...allInvoices, newInvoice]);
    setShowInvoiceForm(false);
    setInvoiceFormData({
      client_id: '', booking_id: '', amount: '', tax_amount: '', due_date: '', notes: '', items: []
    });
  };

  const addInvoiceItem = () => {
    setInvoiceFormData({
      ...invoiceFormData,
      items: [...invoiceFormData.items, {
        item_type: 'product',
        name: '',
        name: '',
        quantity: 1,
        unit_price: 0,
      }]
    });
  };

  const removeInvoiceItem = (index: number) => {
    const newItems = invoiceFormData.items.filter((_, i) => i !== index);
    setInvoiceFormData({ ...invoiceFormData, items: newItems });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const newItems = [...invoiceFormData.items];
    
    // If updating item_type or related_id for product, update name and unit_price
    if (field === 'item_type' || field === 'related_id') {
      newItems[index] = { ...newItems[index], [field]: value };
      
      if (newItems[index].item_type === 'product' && newItems[index].related_id) {
        const selectedProduct = products.find(p => p.id === newItems[index].related_id);
        if (selectedProduct) {
          newItems[index] = { 
            ...newItems[index], 
            name: selectedProduct.name,
            unit_price: selectedProduct.price
          };
        }
      } else if (newItems[index].item_type !== 'product') {
        // Reset name and allow manual entry for services/time_entry
        if (field === 'item_type') {
          newItems[index] = {
            ...newItems[index],
            name: '',
            unit_price: 0,
            related_id: undefined
          };
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    setInvoiceFormData({ ...invoiceFormData, items: newItems });
  };

  const splitInvoiceItem = (invoice: Invoice, itemIndex: number) => {
    if (!invoice.items || !invoice.items[itemIndex]) return;

    const itemToSplit = invoice.items[itemIndex];
    
    // Create new invoice with the split item
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      branch_id: invoice.branch_id,
      client_id: invoice.client_id,
      invoice_number: `INV-${Date.now()}-SPLIT`,
      amount: itemToSplit.total_price,
      tax_amount: 0,
      total_amount: itemToSplit.total_price,
      status: 'pending',
      payment_status: 'pending',
      remaining_balance_action: 'none',
      due_date: invoice.due_date,
      notes: `منفصل من فاتورة ${invoice.invoice_number}`,
      created_at: new Date().toISOString(),
      items: [{ ...itemToSplit, is_split: true }],
      payment_methods: []
    };

    // Update original invoice
    const updatedOriginalInvoice = {
      ...invoice,
      amount: invoice.amount - itemToSplit.total_price,
      total_amount: invoice.total_amount - itemToSplit.total_price,
      items: invoice.items.filter((_, i) => i !== itemIndex)
    };

    setAllInvoices([
      ...allInvoices.map(inv => inv.id === invoice.id ? updatedOriginalInvoice : inv),
      newInvoice
    ]);

    alert('تم فصل البند بنجاح وإنشاء فاتورة جديدة');
  };

  const getTotalPaid = (invoice: Invoice) => {
    return (invoice.payment_methods || []).reduce((sum, pm) => sum + pm.amount, 0);
  };

  const getRemainingBalance = (invoice: Invoice) => {
    return invoice.total_amount - getTotalPaid(invoice);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'overpaid': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع بالكامل';
      case 'partial': return 'مدفوع جزئياً';
      case 'overpaid': return 'مدفوع زائد';
      default: return 'في الانتظار';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <Button 
            onClick={() => activeTab === 'invoices' ? setShowInvoiceForm(true) : null}
            className="flex items-center gap-2"
            disabled={activeTab !== 'invoices'}
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'invoices' ? 'إنشاء فاتورة جديدة' : 'إضافة'}
          </Button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'invoices' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              الفواتير
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'payments' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              المدفوعات
            </button>
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-800 text-right mb-2">الإدارة المالية المتقدمة</h1>
          <p className="text-gray-600 text-right">إدارة الفواتير المعقدة والدفع المتعدد</p>
        </div>
      </div>

      {/* Financial Overview */}
      {activeTab === 'overview' && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">إجمالي الإيرادات</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-green-600">
                  {financialSummary.total_revenue.toLocaleString('ar-EG')} ج.م
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">المبالغ المعلقة</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-orange-600">
                  {financialSummary.pending_amount.toLocaleString('ar-EG')} ج.م
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">مدفوع جزئياً</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-yellow-600">
                  {financialSummary.partially_paid.toLocaleString('ar-EG')} ج.م
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">إجمالي الفواتير</CardTitle>
                <Receipt className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-blue-600">
                  {financialSummary.total_invoices}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Invoice Form */}
      {showInvoiceForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-right">إنشاء فاتورة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvoiceSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-select" className="text-right block mb-2">العميل (اختياري)</Label>
                  <select
                    id="client-select"
                    value={invoiceFormData.client_id}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, client_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="">زائر جديد</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="base-amount" className="text-right block mb-2">المبلغ الأساسي (ج.م)</Label>
                  <Input
                    id="base-amount"
                    type="number"
                    step="0.01"
                    value={invoiceFormData.amount}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                    placeholder="المبلغ الأساسي"
                    className="text-right"
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Button type="button" onClick={addInvoiceItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة بند
                  </Button>
                  <Label className="text-right">بنود الفاتورة</Label>
                </div>
                
                <div className="space-y-3">
                  {invoiceFormData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={item.item_type}
                        onChange={(e) => updateInvoiceItem(index, 'item_type', e.target.value)}
                        className="p-2 border border-gray-300 rounded text-right text-sm"
                      >
                        <option value="product">منتج</option>
                        <option value="service">خدمة</option>
                        <option value="time_entry">وقت</option>
                      </select>
                      
                      {item.item_type === 'product' ? (
                        <select
                          value={item.related_id || ''}
                          onChange={(e) => updateInvoiceItem(index, 'related_id', e.target.value)}
                          className="p-2 border border-gray-300 rounded text-right text-sm"
                        >
                          <option value="">اختر منتج</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {product.price} ج.م
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateInvoiceItem(index, 'name', e.target.value)}
                          placeholder={item.item_type === 'service' ? 'اسم الخدمة' : 'وصف الوقت'}
                          className="text-right text-sm"
                        />
                      )}
                      
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                        placeholder="الكمية"
                        className="text-right text-sm"
                      />
                      
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="سعر الوحدة"
                        className="text-right text-sm"
                        readOnly={item.item_type === 'product'}
                      />
                      
                      <div className="flex items-center justify-center text-sm font-medium">
                        {(item.quantity * item.unit_price).toFixed(2)} ج.م
                      </div>
                      
                      <Button
                        type="button"
                        onClick={() => removeInvoiceItem(index)}
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                      >
                        حذف
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax-amount" className="text-right block mb-2">الضريبة (ج.م)</Label>
                  <Input
                    id="tax-amount"
                    type="number"
                    step="0.01"
                    value={invoiceFormData.tax_amount}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, tax_amount: e.target.value })}
                    placeholder="مبلغ الضريبة"
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="due-date" className="text-right block mb-2">تاريخ الاستحقاق</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={invoiceFormData.due_date}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-right block mb-2">ملاحظات</Label>
                <textarea
                  id="notes"
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md text-right"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-right">
                  <span className="text-lg font-semibold text-blue-800">
                    {(
                      (parseFloat(invoiceFormData.amount) || 0) + 
                      invoiceFormData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) +
                      (parseFloat(invoiceFormData.tax_amount) || 0)
                    ).toFixed(2)} ج.م
                  </span>
                  <span className="text-blue-600">الإجمالي:</span>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowInvoiceForm(false);
                  setInvoiceFormData({
                    client_id: '', booking_id: '', amount: '', tax_amount: '', due_date: '', notes: '', items: []
                  });
                }}>
                  إلغاء
                </Button>
                <Button type="submit">إنشاء الفاتورة</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Badge className={getPaymentStatusColor(invoice.payment_status)}>
                      {getPaymentStatusLabel(invoice.payment_status)}
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInvoiceDetails(invoice)}
                    >
                      التفاصيل
                    </Button>
                  </div>
                  
                  <div className="text-right">
                    <h3 className="font-semibold text-lg">فاتورة #{invoice.invoice_number}</h3>
                    {invoice.client && (
                      <p className="text-gray-600 text-sm">{invoice.client.name}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-green-600">{invoice.total_amount.toFixed(2)} ج.م</span>
                    <span className="text-gray-500">الإجمالي:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-600">{getTotalPaid(invoice).toFixed(2)} ج.م</span>
                    <span className="text-gray-500">المدفوع:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${getRemainingBalance(invoice) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {getRemainingBalance(invoice).toFixed(2)} ج.م
                    </span>
                    <span className="text-gray-500">المتبقي:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
                    </span>
                    <span>التاريخ:</span>
                  </div>
                </div>

                {/* Payment Methods */}
                {invoice.payment_methods && invoice.payment_methods.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-800 text-right mb-3">طرق الدفع المستخدمة:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {invoice.payment_methods.map((pm, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                          <span className="font-bold text-lg text-gray-800">{pm.amount.toFixed(2)} ج.م</span>
                          <div className="flex items-center gap-2">
                            {pm.method === 'cash' && (
                              <>
                                <span className="text-sm font-medium text-green-700">نقدي</span>
                                <Banknote className="h-5 w-5 text-green-600" />
                              </>
                            )}
                            {pm.method === 'visa' && (
                              <>
                                <span className="text-sm font-medium text-blue-700">فيزا</span>
                                <CreditCard className="h-5 w-5 text-blue-600" />
                              </>
                            )}
                            {pm.method === 'wallet' && (
                              <>
                                <span className="text-sm font-medium text-purple-700">محفظة</span>
                                <Wallet className="h-5 w-5 text-purple-600" />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Remaining Balance Action Display */}
                    {invoice.remaining_balance_action && invoice.remaining_balance_action !== 'none' && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-medium text-yellow-800">
                            {invoice.remaining_balance_action === 'account_credit' && '💳 تم إضافة المبلغ كرصيد في الحساب'}
                            {invoice.remaining_balance_action === 'tips' && '🎁 تم توزيع المبلغ كإكرامية'}
                          </span>
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {invoices.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد فواتير</h3>
              <p className="text-gray-500 mb-4">لم يتم إنشاء أي فواتير بعد</p>
              <Button onClick={() => setShowInvoiceForm(true)}>
                إنشاء فاتورة جديدة
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Invoice Details Modal */}
      {showInvoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setShowInvoiceDetails(null)}
                >
                  إغلاق
                </Button>
                <CardTitle className="text-right">
                  تفاصيل فاتورة #{showInvoiceDetails.invoice_number}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Invoice Items */}
              {showInvoiceDetails.items && showInvoiceDetails.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-right mb-4">بنود الفاتورة:</h4>
                  <div className="space-y-2">
                    {showInvoiceDetails.items.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => splitInvoiceItem(showInvoiceDetails, index)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Split className="h-4 w-4 mr-1" />
                            فصل البند
                          </Button>
                          {item.is_split && (
                            <Badge className="bg-orange-100 text-orange-800">مفصول</Badge>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">
                            {item.name || 
                             (item.item_type === 'product' ? 'منتج غير محدد' : 
                              item.item_type === 'service' ? 'خدمة غير محددة' : 'إدخال وقت')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × {item.unit_price} ج.م = {item.total_price} ج.م
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment History */}
              {showInvoiceDetails.payment_methods && showInvoiceDetails.payment_methods.length > 0 && (
                <div>
                  <h4 className="font-semibold text-right mb-4">تاريخ المدفوعات:</h4>
                  <div className="space-y-2">
                    {showInvoiceDetails.payment_methods.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {payment.method === 'cash' && <Banknote className="h-4 w-4 text-green-600" />}
                          {payment.method === 'visa' && <CreditCard className="h-4 w-4 text-blue-600" />}
                          {payment.method === 'wallet' && <Wallet className="h-4 w-4 text-purple-600" />}
                          <span className="font-semibold">{payment.amount} ج.م</span>
                          {payment.transaction_id && (
                            <span className="text-xs text-gray-500">#{payment.transaction_id}</span>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {payment.method === 'cash' ? 'نقدي' : 
                             payment.method === 'visa' ? 'فيزا' : 'محفظة إلكترونية'}
                          </p>
                          {payment.notes && (
                            <p className="text-xs text-gray-500">{payment.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(payment.processed_at).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Payment Method Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center">
                  <Banknote className="h-5 w-5 text-green-600 ml-2" />
                  المدفوعات النقدية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 text-right">
                  {invoices
                    .flatMap(inv => inv.payment_methods || [])
                    .filter(pm => pm.method === 'cash')
                    .reduce((sum, pm) => sum + pm.amount, 0)
                    .toLocaleString('ar-EG')} ج.م
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center">
                  <CreditCard className="h-5 w-5 text-blue-600 ml-2" />
                  مدفوعات الفيزا
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 text-right">
                  {invoices
                    .flatMap(inv => inv.payment_methods || [])
                    .filter(pm => pm.method === 'visa')
                    .reduce((sum, pm) => sum + pm.amount, 0)
                    .toLocaleString('ar-EG')} ج.م
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center">
                  <Wallet className="h-5 w-5 text-purple-600 ml-2" />
                  مدفوعات المحفظة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 text-right">
                  {invoices
                    .flatMap(inv => inv.payment_methods || [])
                    .filter(pm => pm.method === 'wallet')
                    .reduce((sum, pm) => sum + pm.amount, 0)
                    .toLocaleString('ar-EG')} ج.م
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right">المدفوعات الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices
                  .flatMap(inv => (inv.payment_methods || []).map(pm => ({ ...pm, invoice_number: inv.invoice_number })))
                  .sort((a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime())
                  .slice(0, 10)
                  .map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {payment.method === 'cash' && <Banknote className="h-4 w-4 text-green-600" />}
                        {payment.method === 'visa' && <CreditCard className="h-4 w-4 text-blue-600" />}
                        {payment.method === 'wallet' && <Wallet className="h-4 w-4 text-purple-600" />}
                        <div>
                          <span className="font-semibold">{payment.amount} ج.م</span>
                          {payment.transaction_id && (
                            <p className="text-xs text-gray-500">#{payment.transaction_id}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium">فاتورة #{payment.invoice_number}</p>
                        <p className="text-sm text-gray-600">
                          {payment.method === 'cash' ? 'نقدي' : 
                           payment.method === 'visa' ? 'فيزا' : 'محفظة إلكترونية'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTimeDetailed(payment.processed_at)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Finance;