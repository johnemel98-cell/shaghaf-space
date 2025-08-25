import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, UserPlus, Users, AlertCircle } from 'lucide-react';

interface AddIndividualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndividual?: (individualName: string) => void;
  currentIndividualsCount: number;
  sessionClientName: string;
}

const AddIndividualModal: React.FC<AddIndividualModalProps> = ({
  isOpen,
  onClose,
  onAddIndividual = () => {},
  currentIndividualsCount,
  sessionClientName
}) => {
  const [individualName, setIndividualName] = useState('');

  // تأكد من أن currentIndividualsCount رقم صحيح
  const safeCurrentCount = typeof currentIndividualsCount === 'number' && !isNaN(currentIndividualsCount) 
    ? currentIndividualsCount 
    : 0;
  
  const newCount = safeCurrentCount + 1;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // إذا لم يدخل اسم، استخدم اسم افتراضي
    const finalName = individualName.trim() || `فرد ${newCount}`;
    
    onAddIndividual(finalName);
    
    // إعادة تعيين النموذج
    setIndividualName('');
  };

  const handleClose = () => {
    setIndividualName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
            <CardTitle className="text-right flex items-center">
              <span className="mr-2">إضافة فرد جديد للجلسة</span>
              <UserPlus className="h-5 w-5 text-green-500" />
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Session Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">جلسة {sessionClientName}</span>
            </div>
            <div className="text-center">
              <span className="text-sm text-blue-600">
                العدد الحالي: {safeCurrentCount} شخص → سيصبح {newCount} شخص
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Individual Name Input */}
            <div>
              <Label htmlFor="individual-name" className="text-right block mb-2">
                اسم الفرد الجديد (اختياري):
              </Label>
              <Input
                id="individual-name"
                value={individualName}
                onChange={(e) => setIndividualName(e.target.value)}
                placeholder={`سيتم تسجيله كـ "فرد ${newCount}" إذا تُرك فارغاً`}
                className="text-right"
                autoFocus
              />
              <p className="text-xs text-gray-500 text-right mt-1">
                إذا تُرك فارغاً، سيتم إنشاء اسم تلقائي للفرد الجديد
              </p>
            </div>

            {/* Preview */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 text-right mb-3">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                معاينة:
              </h4>
              <div className="text-right space-y-1">
                <p className="text-sm text-green-700">
                  ✓ سيتم إضافة الفرد: <strong>{individualName.trim() || `فرد ${newCount}`}</strong>
                </p>
                <p className="text-sm text-green-700">
                  ✓ العدد الجديد: <strong>{newCount} شخص</strong>
                </p>
                <p className="text-sm text-green-700">
                  ✓ ستزيد التكلفة المقدرة حسب عدد الأفراد الجديد
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-lg px-6"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                إضافة الفرد
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddIndividualModal;