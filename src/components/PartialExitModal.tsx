import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  X, Users, LogOut, Package, DollarSign, Clock, 
  CheckCircle, User, ShoppingCart, Calculator 
} from 'lucide-react';
import { InvoiceItem, SessionPricing } from '../types';

interface Individual {
  id: string;
  name: string;
  isMainClient: boolean;
}

interface PartialExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    exitingIndividuals: Individual[];
    exitingItems: InvoiceItem[];
    timeAllocation: number; // نسبة الوقت للأفراد المغادرين
  }) => void;
  sessionData: {
    individuals: Individual[];
    sessionItems: InvoiceItem[];
    sessionDurationSeconds: number;
    totalIndividuals: number;
  };
  pricing: SessionPricing;
}

const PartialExitModal: React.FC<PartialExitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sessionData = {
    individuals: [],
    sessionItems: [],
    sessionDurationSeconds: 0,
    totalIndividuals: 0
  },
  pricing
}) => {
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<{[itemId: string]: number}>({});

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTimeCost = (individualsCount: number, durationSeconds: number) => {
    // استخدام نفس منطق الحساب من SessionInvoiceManager
    const totalMinutes = durationSeconds / 60;
    const hours = totalMinutes / 60;
    
    // التأكد من وجود pricing مع قيم افتراضية متطابقة
    const safePricing = pricing || {
      hour_1_price: 40,
      hour_2_price: 30,
      hour_3_plus_price: 30,
      max_additional_charge: 100
    };
    
    // الساعة الأولى: تكلفة ثابتة لكل فرد
    let totalCost = individualsCount * safePricing.hour_1_price;
    
    // الساعات الإضافية: تقريب لأعلى إلى أقرب ساعة كاملة
    if (hours <= 1) {
      return totalCost;
    } else {
      // حساب الساعات الإضافية (تقريب لأعلى)
      const additionalHours = Math.ceil(hours - 1);
      const additionalCost = individualsCount * additionalHours * safePricing.hour_3_plus_price;
      
      // تطبيق الحد الأقصى للرسوم الإضافية
      const cappedAdditionalCost = Math.min(additionalCost, safePricing.max_additional_charge);
      
      return totalCost + cappedAdditionalCost;
    }
  };

  const getExitCost = () => {
    // حساب تكلفة الوقت للأفراد المغادرين
    const exitingCount = selectedIndividuals.length;
    const timeCost = calculateTimeCost(exitingCount, sessionData.sessionDurationSeconds);
    
    // حساب تكلفة المنتجات المختارة
    const itemsCost = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = sessionData.sessionItems.find(i => i.id === itemId);
      return total + (item ? item.unit_price * quantity : 0);
    }, 0);
    
    return {
      timeCost,
      itemsCost,
      total: timeCost + itemsCost
    };
  };

  const handleIndividualToggle = (individualId: string) => {
    const individual = sessionData.individuals.find(i => i.id === individualId);
    if (individual?.isMainClient && selectedIndividuals.length === 1 && selectedIndividuals.includes(individualId)) {
      alert('لا يمكن إزالة العميل الأساسي بمفرده. يجب اختيار شخص آخر أو إنهاء الجلسة بالكامل.');
      return;
    }

    setSelectedIndividuals(prev => 
      prev.includes(individualId) 
        ? prev.filter(id => id !== individualId)
        : [...prev, individualId]
    );
  };

  const handleItemQuantityChange = (itemId: string, quantity: number) => {
    const item = sessionData.sessionItems.find(i => i.id === itemId);
    if (!item) return;

    if (quantity <= 0) {
      const { [itemId]: removed, ...rest } = selectedItems;
      setSelectedItems(rest);
    } else if (quantity <= item.quantity) {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: quantity
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedIndividuals.length === 0) {
      alert('يجب اختيار شخص واحد على الأقل للمغادرة');
      return;
    }

    const exitingIndividuals = sessionData.individuals.filter(ind => 
      selectedIndividuals.includes(ind.id)
    );

    const exitingItems = Object.entries(selectedItems).map(([itemId, quantity]) => {
      const originalItem = sessionData.sessionItems.find(i => i.id === itemId);
      if (!originalItem) return null;

      return {
        ...originalItem,
        quantity,
        total_price: originalItem.unit_price * quantity
      };
    }).filter(Boolean) as InvoiceItem[];

    const timeAllocation = selectedIndividuals.length / sessionData.totalIndividuals;

    onConfirm({
      exitingIndividuals,
      exitingItems,
      timeAllocation
    });
  };

  const costs = getExitCost();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <CardTitle className="text-right">
              مغادرة جزئية من الجلسة
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 text-right mb-3">معلومات الجلسة:</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Clock className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <div className="font-semibold text-blue-800">{formatTime(sessionData.sessionDurationSeconds)}</div>
                  <p className="text-xs text-blue-600">مدة الجلسة</p>
                </div>
                <div>
                  <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <div className="font-semibold text-blue-800">{sessionData.totalIndividuals}</div>
                  <p className="text-xs text-blue-600">إجمالي الأشخاص</p>
                </div>
                <div>
                  <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <div className="font-semibold text-blue-800">{sessionData.sessionItems.length}</div>
                  <p className="text-xs text-blue-600">المنتجات المطلوبة</p>
                </div>
              </div>
            </div>

            {/* Select Individuals */}
            <div>
              <h4 className="font-semibold text-right mb-4 text-green-800">اختر الأشخاص الذين سيغادرون:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sessionData.individuals.map((individual) => (
                  <label 
                    key={individual.id}
                    className="flex items-center justify-end space-x-3 space-x-reverse cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-right flex items-center gap-2">
                      <span className="font-medium">{individual.name}</span>
                      {individual.isMainClient && (
                        <Badge className="bg-blue-100 text-blue-800">العميل الأساسي</Badge>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedIndividuals.includes(individual.id)}
                      onChange={() => handleIndividualToggle(individual.id)}
                      className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-600 text-right mt-2">
                المختار: {selectedIndividuals.length} من {sessionData.totalIndividuals} أشخاص
              </p>
            </div>

            {/* Select Items */}
            <div>
              <h4 className="font-semibold text-right mb-4 text-purple-800">اختر المنتجات التي سيدفع ثمنها الأشخاص المغادرون:</h4>
              {sessionData.sessionItems.length > 0 ? (
                <div className="space-y-3">
                  {sessionData.sessionItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-purple-600" />
                        <div>
                          <span className="font-medium">{item.unit_price} ج.م</span>
                          <p className="text-xs text-gray-500">سعر الوحدة</p>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={selectedItems[item.id] || 0}
                            onChange={(e) => handleItemQuantityChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                            placeholder="0"
                          />
                          <p className="text-xs text-gray-500 text-center">من {item.quantity}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          متوفر: {item.quantity} {item.individual_name ? `(${item.individual_name})` : ''}
                        </p>
                        <p className="text-sm font-semibold text-purple-600">
                          الإجمالي: {((selectedItems[item.id] || 0) * item.unit_price).toFixed(2)} ج.م
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p>لا توجد منتجات في هذه الجلسة</p>
                </div>
              )}
            </div>

            {/* Cost Calculation */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 text-right mb-3">
                <Calculator className="h-5 w-5 inline mr-2" />
                حساب التكلفة للمغادرين:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">{costs.timeCost.toFixed(2)} ج.م</div>
                  <p className="text-sm text-green-600">تكلفة الوقت</p>
                  <p className="text-xs text-gray-600">
                    {selectedIndividuals.length} شخص × {formatTime(sessionData.sessionDurationSeconds)}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-700">{costs.itemsCost.toFixed(2)} ج.م</div>
                  <p className="text-sm text-purple-600">تكلفة المنتجات</p>
                  <p className="text-xs text-gray-600">
                    {Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0)} منتج مختار
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-green-800">{costs.total.toFixed(2)} ج.م</div>
                  <p className="text-sm text-green-600">المبلغ الإجمالي</p>
                  <p className="text-xs text-gray-600">للمغادرين</p>
                </div>
              </div>
            </div>

            {/* Remaining in Session Preview */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800 text-right mb-3">
                سيبقى في الجلسة:
              </h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <Users className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <div className="font-semibold text-orange-800">
                    {sessionData.totalIndividuals - selectedIndividuals.length} شخص
                  </div>
                  <p className="text-xs text-orange-600">متبقي في الجلسة</p>
                </div>
                
                <div>
                  <Package className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <div className="font-semibold text-orange-800">
                    {sessionData.sessionItems.length - Object.keys(selectedItems).length} منتج
                  </div>
                  <p className="text-xs text-orange-600">منتجات متبقية</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-lg px-8"
                disabled={selectedIndividuals.length === 0}
              >
                <LogOut className="h-5 w-5 mr-2" />
                تأكيد المغادرة والدفع
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartialExitModal;