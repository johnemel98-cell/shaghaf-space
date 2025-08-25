import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Calendar, Clock, DollarSign, User, AlertTriangle, CheckCircle, Settings, Wrench, Monitor, Zap, Building, Package, ClipboardList, Timer, MapPin, Filter, TrendingUp, TrendingDown, Star, PenTool as Tool, FileText, Play, Pause, CheckSquare } from 'lucide-react';
import { Asset, MaintenanceRequest, MaintenanceTask, MaintenanceSchedule, User as UserType } from '../../types';
import { formatDateOnly, formatDateTime, formatRelativeDate } from '../../lib/utils';

const Maintenance: React.FC = () => {
  const { user } = useAuth();
  
  // Data hooks
  const [allAssets, setAllAssets] = useLocalStorage<Asset[]>('assets', []);
  const [allMaintenanceRequests, setAllMaintenanceRequests] = useLocalStorage<MaintenanceRequest[]>('maintenanceRequests', []);
  const [allMaintenanceTasks, setAllMaintenanceTasks] = useLocalStorage<MaintenanceTask[]>('maintenanceTasks', []);
  const [allMaintenanceSchedules, setAllMaintenanceSchedules] = useLocalStorage<MaintenanceSchedule[]>('maintenanceSchedules', []);
  const [allUsers] = useLocalStorage<UserType[]>('users', []);

  // Filter data by branch
  const assets = allAssets.filter(asset => asset.branch_id === user?.branch_id);
  const maintenanceRequests = allMaintenanceRequests.filter(req => req.branch_id === user?.branch_id);
  const maintenanceTasks = allMaintenanceTasks.filter(task => {
    const request = allMaintenanceRequests.find(req => req.id === task.maintenance_request_id);
    return request?.branch_id === user?.branch_id;
  });
  const branchUsers = allUsers.filter(u => u.branch_id === user?.branch_id);

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'requests' | 'tasks' | 'schedule'>('dashboard');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  // Form data states
  const [assetFormData, setAssetFormData] = useState({
    name: '',
    category: 'equipment' as Asset['category'],
    description: '',
    location: '',
    purchase_date: '',
    purchase_cost: '',
    warranty_end_date: '',
    condition: 'excellent' as Asset['condition'],
    maintenance_schedule: 'monthly' as Asset['maintenance_schedule']
  });

  const [requestFormData, setRequestFormData] = useState({
    asset_id: '',
    title: '',
    description: '',
    priority: 'medium' as MaintenanceRequest['priority'],
    request_type: 'preventive' as MaintenanceRequest['request_type'],
    estimated_cost: '',
    scheduled_date: '',
    notes: ''
  });

  // Statistics
  const maintenanceStats = React.useMemo(() => {
    const pendingRequests = maintenanceRequests.filter(req => req.status === 'pending').length;
    const inProgressRequests = maintenanceRequests.filter(req => req.status === 'in_progress').length;
    const completedThisMonth = maintenanceRequests.filter(req => {
      const completedDate = req.completed_date ? new Date(req.completed_date) : null;
      const currentMonth = new Date().getMonth();
      return completedDate && completedDate.getMonth() === currentMonth && req.status === 'completed';
    }).length;
    const overdueRequests = maintenanceRequests.filter(req => {
      const scheduledDate = req.scheduled_date ? new Date(req.scheduled_date) : null;
      return scheduledDate && scheduledDate < new Date() && req.status !== 'completed';
    }).length;
    const assetsNeedingMaintenance = assets.filter(asset => {
      const nextMaintenance = asset.next_maintenance_date ? new Date(asset.next_maintenance_date) : null;
      return nextMaintenance && nextMaintenance <= new Date();
    }).length;
    const totalCostThisMonth = maintenanceRequests
      .filter(req => {
        const completedDate = req.completed_date ? new Date(req.completed_date) : null;
        const currentMonth = new Date().getMonth();
        return completedDate && completedDate.getMonth() === currentMonth && req.status === 'completed';
      })
      .reduce((sum, req) => sum + (req.actual_cost || req.estimated_cost || 0), 0);

    return {
      totalAssets: assets.length,
      activeAssets: assets.filter(asset => asset.is_active).length,
      pendingRequests,
      inProgressRequests,
      completedThisMonth,
      overdueRequests,
      assetsNeedingMaintenance,
      totalCostThisMonth
    };
  }, [assets, maintenanceRequests]);

  // Handlers
  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const assetData = {
      ...assetFormData,
      purchase_cost: parseFloat(assetFormData.purchase_cost) || 0
    };

    if (editingAsset) {
      setAllAssets(allAssets.map(asset => 
        asset.id === editingAsset.id 
          ? { ...asset, ...assetData }
          : asset
      ));
    } else {
      const newAsset: Asset = {
        id: Date.now().toString(),
        branch_id: user?.branch_id || '1',
        ...assetData,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setAllAssets([...allAssets, newAsset]);
    }
    
    setShowAssetForm(false);
    setEditingAsset(null);
    setAssetFormData({
      name: '', category: 'equipment', description: '', location: '', purchase_date: '',
      purchase_cost: '', warranty_end_date: '', condition: 'excellent', maintenance_schedule: 'monthly'
    });
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const requestData = {
      ...requestFormData,
      estimated_cost: parseFloat(requestFormData.estimated_cost) || 0
    };

    const selectedAsset = assets.find(asset => asset.id === requestData.asset_id);

    if (editingRequest) {
      setAllMaintenanceRequests(allMaintenanceRequests.map(req => 
        req.id === editingRequest.id 
          ? { 
              ...req, 
              ...requestData, 
              updated_at: new Date().toISOString(),
              asset: selectedAsset
            }
          : req
      ));
    } else {
      const newRequest: MaintenanceRequest = {
        id: Date.now().toString(),
        branch_id: user?.branch_id || '1',
        ...requestData,
        status: 'pending',
        requested_by: user?.id || '1',
        requested_by_name: user?.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        asset: selectedAsset
      };
      setAllMaintenanceRequests([...allMaintenanceRequests, newRequest]);
    }
    
    setShowRequestForm(false);
    setEditingRequest(null);
    setRequestFormData({
      asset_id: '', title: '', description: '', priority: 'medium',
      request_type: 'preventive', estimated_cost: '', scheduled_date: '', notes: ''
    });
  };

  const handleRequestStatusChange = (requestId: string, newStatus: MaintenanceRequest['status']) => {
    const completed_date = newStatus === 'completed' ? new Date().toISOString() : undefined;
    
    setAllMaintenanceRequests(allMaintenanceRequests.map(req => 
      req.id === requestId 
        ? { 
            ...req, 
            status: newStatus, 
            completed_date,
            updated_at: new Date().toISOString() 
          }
        : req
    ));
  };

  const handleTaskStatusChange = (taskId: string, newStatus: MaintenanceTask['status']) => {
    const now = new Date().toISOString();
    const updates: Partial<MaintenanceTask> = { status };
    
    if (newStatus === 'in_progress' && !allMaintenanceTasks.find(t => t.id === taskId)?.started_at) {
      updates.started_at = now;
    } else if (newStatus === 'completed') {
      updates.completed_at = now;
      
      // Calculate actual duration if started
      const task = allMaintenanceTasks.find(t => t.id === taskId);
      if (task?.started_at) {
        const startTime = new Date(task.started_at);
        const endTime = new Date(now);
        const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        updates.actual_duration = Math.round(durationHours * 100) / 100;
      }
    }
    
    setAllMaintenanceTasks(allMaintenanceTasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates }
        : task
    ));
  };

  // Helper functions
  const getAssetCategoryIcon = (category: Asset['category']) => {
    switch (category) {
      case 'furniture': return <Package className="h-4 w-4" />;
      case 'electronics': return <Monitor className="h-4 w-4" />;
      case 'equipment': return <Settings className="h-4 w-4" />;
      case 'infrastructure': return <Building className="h-4 w-4" />;
      default: return <Tool className="h-4 w-4" />;
    }
  };

  const getAssetCategoryLabel = (category: Asset['category']) => {
    switch (category) {
      case 'furniture': return 'أثاث';
      case 'electronics': return 'إلكترونيات';
      case 'equipment': return 'معدات';
      case 'infrastructure': return 'بنية تحتية';
      default: return 'أخرى';
    }
  };

  const getConditionColor = (condition: Asset['condition']) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'out_of_service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionLabel = (condition: Asset['condition']) => {
    switch (condition) {
      case 'excellent': return 'ممتاز';
      case 'good': return 'جيد';
      case 'fair': return 'مقبول';
      case 'poor': return 'ضعيف';
      case 'out_of_service': return 'خارج الخدمة';
      default: return condition;
    }
  };

  const getPriorityColor = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  const getStatusColor = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'approved': return 'موافق عليه';
      case 'in_progress': return 'قيد التنفيذ';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getRequestTypeLabel = (type: MaintenanceRequest['request_type']) => {
    switch (type) {
      case 'preventive': return 'صيانة وقائية';
      case 'corrective': return 'صيانة إصلاحية';
      case 'emergency': return 'طوارئ';
      default: return type;
    }
  };

  const isOverdue = (request: MaintenanceRequest) => {
    return request.scheduled_date && new Date(request.scheduled_date) < new Date() && request.status !== 'completed';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <Button 
            onClick={() => {
              if (activeTab === 'assets') setShowAssetForm(true);
              else if (activeTab === 'requests') setShowRequestForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'assets' && 'إضافة أصل جديد'}
            {activeTab === 'requests' && 'طلب صيانة جديد'}
            {(activeTab === 'dashboard' || activeTab === 'tasks' || activeTab === 'schedule') && 'إضافة'}
          </Button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              لوحة التحكم
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'assets' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              الأصول ({assets.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'requests' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              طلبات الصيانة ({maintenanceRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'tasks' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              المهام ({maintenanceTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'schedule' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              الجدولة
            </button>
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-800 text-right mb-2">إدارة الصيانة</h1>
          <p className="text-gray-600 text-right">إدارة شاملة لصيانة الأصول والمعدات</p>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">إجمالي الأصول</CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-blue-600">{maintenanceStats.totalAssets}</div>
                <p className="text-xs text-muted-foreground text-right">
                  نشط: {maintenanceStats.activeAssets}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">طلبات معلقة</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-orange-600">{maintenanceStats.pendingRequests}</div>
                <p className="text-xs text-muted-foreground text-right">
                  متأخرة: {maintenanceStats.overdueRequests}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">قيد التنفيذ</CardTitle>
                <Wrench className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-blue-600">{maintenanceStats.inProgressRequests}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">اكتملت هذا الشهر</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-green-600">{maintenanceStats.completedThisMonth}</div>
                <p className="text-xs text-muted-foreground text-right">
                  التكلفة: {maintenanceStats.totalCostThisMonth.toLocaleString('ar-EG')} ج.م
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 ml-2" />
                  تنبيهات الصيانة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {maintenanceStats.overdueRequests > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <Badge variant="destructive">عاجل</Badge>
                      <span className="text-sm text-right">طلبات متأخرة: {maintenanceStats.overdueRequests}</span>
                    </div>
                  )}
                  
                  {maintenanceStats.assetsNeedingMaintenance > 0 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Badge className="bg-yellow-500">تذكير</Badge>
                      <span className="text-sm text-right">أصول تحتاج صيانة: {maintenanceStats.assetsNeedingMaintenance}</span>
                    </div>
                  )}
                  
                  {assets.filter(asset => asset.condition === 'poor').length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Badge className="bg-orange-500">تحذير</Badge>
                      <span className="text-sm text-right">
                        أصول في حالة سيئة: {assets.filter(asset => asset.condition === 'poor').length}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right">الإجراءات السريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setActiveTab('requests');
                      setShowRequestForm(true);
                    }}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <ClipboardList className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <span className="text-sm font-medium">طلب صيانة</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setActiveTab('assets');
                      setShowAssetForm(true);
                    }}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <Package className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <span className="text-sm font-medium">إضافة أصل</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('tasks')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <CheckSquare className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <span className="text-sm font-medium">مهام الصيانة</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('schedule')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                    <span className="text-sm font-medium">جدولة الصيانة</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Asset Form */}
      {showAssetForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-right">
              {editingAsset ? 'تعديل الأصل' : 'إضافة أصل جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssetSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="asset-name" className="text-right block mb-2">اسم الأصل *</Label>
                  <Input
                    id="asset-name"
                    value={assetFormData.name}
                    onChange={(e) => setAssetFormData({ ...assetFormData, name: e.target.value })}
                    placeholder="اسم الأصل"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="asset-category" className="text-right block mb-2">الفئة *</Label>
                  <select
                    id="asset-category"
                    value={assetFormData.category}
                    onChange={(e) => setAssetFormData({ ...assetFormData, category: e.target.value as Asset['category'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="furniture">أثاث</option>
                    <option value="electronics">إلكترونيات</option>
                    <option value="equipment">معدات</option>
                    <option value="infrastructure">بنية تحتية</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="asset-description" className="text-right block mb-2">الوصف</Label>
                <textarea
                  id="asset-description"
                  value={assetFormData.description}
                  onChange={(e) => setAssetFormData({ ...assetFormData, description: e.target.value })}
                  placeholder="وصف تفصيلي للأصل"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md text-right resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="asset-location" className="text-right block mb-2">الموقع *</Label>
                  <Input
                    id="asset-location"
                    value={assetFormData.location}
                    onChange={(e) => setAssetFormData({ ...assetFormData, location: e.target.value })}
                    placeholder="موقع الأصل"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="purchase-date" className="text-right block mb-2">تاريخ الشراء *</Label>
                  <Input
                    id="purchase-date"
                    type="date"
                    value={assetFormData.purchase_date}
                    onChange={(e) => setAssetFormData({ ...assetFormData, purchase_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="purchase-cost" className="text-right block mb-2">تكلفة الشراء (ج.م) *</Label>
                  <Input
                    id="purchase-cost"
                    type="number"
                    step="0.01"
                    value={assetFormData.purchase_cost}
                    onChange={(e) => setAssetFormData({ ...assetFormData, purchase_cost: e.target.value })}
                    placeholder="التكلفة"
                    required
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="warranty-end" className="text-right block mb-2">انتهاء الضمان</Label>
                  <Input
                    id="warranty-end"
                    type="date"
                    value={assetFormData.warranty_end_date}
                    onChange={(e) => setAssetFormData({ ...assetFormData, warranty_end_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="condition" className="text-right block mb-2">الحالة *</Label>
                  <select
                    id="condition"
                    value={assetFormData.condition}
                    onChange={(e) => setAssetFormData({ ...assetFormData, condition: e.target.value as Asset['condition'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="excellent">ممتاز</option>
                    <option value="good">جيد</option>
                    <option value="fair">مقبول</option>
                    <option value="poor">ضعيف</option>
                    <option value="out_of_service">خارج الخدمة</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="maintenance-schedule" className="text-right block mb-2">جدولة الصيانة *</Label>
                  <select
                    id="maintenance-schedule"
                    value={assetFormData.maintenance_schedule}
                    onChange={(e) => setAssetFormData({ ...assetFormData, maintenance_schedule: e.target.value as Asset['maintenance_schedule'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                    <option value="annually">سنوي</option>
                    <option value="as_needed">عند الحاجة</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowAssetForm(false);
                  setEditingAsset(null);
                  setAssetFormData({
                    name: '', category: 'equipment', description: '', location: '', purchase_date: '',
                    purchase_cost: '', warranty_end_date: '', condition: 'excellent', maintenance_schedule: 'monthly'
                  });
                }}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingAsset ? 'حفظ التغييرات' : 'إضافة الأصل'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Request Form */}
      {showRequestForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-right">
              {editingRequest ? 'تعديل طلب الصيانة' : 'طلب صيانة جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="request-asset" className="text-right block mb-2">الأصل *</Label>
                  <select
                    id="request-asset"
                    value={requestFormData.asset_id}
                    onChange={(e) => setRequestFormData({ ...requestFormData, asset_id: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="">اختر الأصل</option>
                    {assets.filter(asset => asset.is_active).map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} - {asset.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="request-type" className="text-right block mb-2">نوع الطلب *</Label>
                  <select
                    id="request-type"
                    value={requestFormData.request_type}
                    onChange={(e) => setRequestFormData({ ...requestFormData, request_type: e.target.value as MaintenanceRequest['request_type'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="preventive">صيانة وقائية</option>
                    <option value="corrective">صيانة إصلاحية</option>
                    <option value="emergency">طوارئ</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="request-title" className="text-right block mb-2">عنوان الطلب *</Label>
                <Input
                  id="request-title"
                  value={requestFormData.title}
                  onChange={(e) => setRequestFormData({ ...requestFormData, title: e.target.value })}
                  placeholder="عنوان مختصر للطلب"
                  required
                  className="text-right"
                />
              </div>

              <div>
                <Label htmlFor="request-description" className="text-right block mb-2">الوصف *</Label>
                <textarea
                  id="request-description"
                  value={requestFormData.description}
                  onChange={(e) => setRequestFormData({ ...requestFormData, description: e.target.value })}
                  placeholder="وصف تفصيلي لما يحتاج صيانة"
                  rows={3}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md text-right resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="request-priority" className="text-right block mb-2">الأولوية *</Label>
                  <select
                    id="request-priority"
                    value={requestFormData.priority}
                    onChange={(e) => setRequestFormData({ ...requestFormData, priority: e.target.value as MaintenanceRequest['priority'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="low">منخفض</option>
                    <option value="medium">متوسط</option>
                    <option value="high">عالي</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="estimated-cost" className="text-right block mb-2">التكلفة المتوقعة (ج.م)</Label>
                  <Input
                    id="estimated-cost"
                    type="number"
                    step="0.01"
                    value={requestFormData.estimated_cost}
                    onChange={(e) => setRequestFormData({ ...requestFormData, estimated_cost: e.target.value })}
                    placeholder="التكلفة المقدرة"
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled-date" className="text-right block mb-2">التاريخ المجدول</Label>
                  <Input
                    id="scheduled-date"
                    type="datetime-local"
                    value={requestFormData.scheduled_date}
                    onChange={(e) => setRequestFormData({ ...requestFormData, scheduled_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="request-notes" className="text-right block mb-2">ملاحظات</Label>
                <textarea
                  id="request-notes"
                  value={requestFormData.notes}
                  onChange={(e) => setRequestFormData({ ...requestFormData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-md text-right resize-none"
                />
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowRequestForm(false);
                  setEditingRequest(null);
                  setRequestFormData({
                    asset_id: '', title: '', description: '', priority: 'medium',
                    request_type: 'preventive', estimated_cost: '', scheduled_date: '', notes: ''
                  });
                }}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingRequest ? 'حفظ التغييرات' : 'إرسال الطلب'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingAsset(asset);
                        setAssetFormData({
                          name: asset.name,
                          category: asset.category,
                          description: asset.description || '',
                          location: asset.location,
                          purchase_date: asset.purchase_date,
                          purchase_cost: asset.purchase_cost.toString(),
                          warranty_end_date: asset.warranty_end_date || '',
                          condition: asset.condition,
                          maintenance_schedule: asset.maintenance_schedule
                        });
                        setShowAssetForm(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا الأصل؟')) {
                          setAllAssets(allAssets.filter(a => a.id !== asset.id));
                        }
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                    <div className="flex gap-2 justify-end mt-1">
                      <Badge variant="secondary">
                        {getAssetCategoryIcon(asset.category)}
                        <span className="mr-1">{getAssetCategoryLabel(asset.category)}</span>
                      </Badge>
                      <Badge className={getConditionColor(asset.condition)}>
                        {getConditionLabel(asset.condition)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <span className="mr-2">{asset.location}</span>
                    <MapPin className="h-4 w-4" />
                  </div>
                  
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <span className="mr-2">{asset.purchase_cost.toLocaleString('ar-EG')} ج.م</span>
                    <DollarSign className="h-4 w-4" />
                  </div>
                  
                  {asset.next_maintenance_date && (
                    <div className="flex items-center justify-end text-sm">
                      <span className={`mr-2 ${
                        new Date(asset.next_maintenance_date) <= new Date() ? 'text-red-600 font-semibold' : 'text-gray-600'
                      }`}>
                        {formatRelativeDate(asset.next_maintenance_date)}
                      </span>
                      <Calendar className={`h-4 w-4 ${
                        new Date(asset.next_maintenance_date) <= new Date() ? 'text-red-500' : 'text-gray-400'
                      }`} />
                    </div>
                  )}

                  {asset.warranty_end_date && (
                    <div className="flex items-center justify-end text-sm text-gray-600">
                      <span className="mr-2">
                        ضمان حتى {formatDateOnly(asset.warranty_end_date)}
                      </span>
                      <Star className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <Button
                    size="sm"
                    onClick={() => {
                      setRequestFormData({
                        ...requestFormData,
                        asset_id: asset.id,
                        title: `صيانة ${asset.name}`,
                        description: `صيانة مطلوبة لـ ${asset.name} في ${asset.location}`
                      });
                      setShowRequestForm(true);
                    }}
                    className="w-full"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    طلب صيانة
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Maintenance Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right flex items-center">
                <Filter className="h-5 w-5 ml-2" />
                تصفية طلبات الصيانة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status-filter" className="text-right block mb-2">تصفية حسب الحالة</Label>
                  <select
                    id="status-filter"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="pending">في الانتظار</option>
                    <option value="approved">موافق عليه</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="priority-filter" className="text-right block mb-2">تصفية حسب الأولوية</Label>
                  <select
                    id="priority-filter"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="all">جميع الأولويات</option>
                    <option value="urgent">عاجل</option>
                    <option value="high">عالي</option>
                    <option value="medium">متوسط</option>
                    <option value="low">منخفض</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          {maintenanceRequests
            .filter(req => filterStatus === 'all' || req.status === filterStatus)
            .filter(req => filterPriority === 'all' || req.priority === filterPriority)
            .map((request) => (
              <Card key={request.id} className={`hover:shadow-md transition-shadow ${
                isOverdue(request) ? 'border-l-4 border-l-red-500' : 
                request.priority === 'urgent' ? 'border-l-4 border-l-red-400' :
                request.priority === 'high' ? 'border-l-4 border-l-orange-400' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {(user?.role === 'admin' || user?.role === 'manager') && request.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleRequestStatusChange(request.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          موافقة
                        </Button>
                      )}
                      
                      {request.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => handleRequestStatusChange(request.id, 'in_progress')}
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          بدء التنفيذ
                        </Button>
                      )}
                      
                      {request.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleRequestStatusChange(request.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          إكمال
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 mb-2">
                        <Badge className={getPriorityColor(request.priority)}>
                          {getPriorityLabel(request.priority)}
                        </Badge>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                        {isOverdue(request) && (
                          <Badge variant="destructive">متأخر</Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{request.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center justify-end text-sm text-gray-600">
                      <span className="mr-2">{request.asset?.name || 'أصل محذوف'}</span>
                      <Package className="h-4 w-4" />
                    </div>
                    
                    <div className="flex items-center justify-end text-sm text-gray-600">
                      <span className="mr-2">{request.requested_by_name}</span>
                      <User className="h-4 w-4" />
                    </div>
                    
                    {request.estimated_cost && (
                      <div className="flex items-center justify-end text-sm text-gray-600">
                        <span className="mr-2">{request.estimated_cost.toLocaleString('ar-EG')} ج.م</span>
                        <DollarSign className="h-4 w-4" />
                      </div>
                    )}
                    
                    {request.scheduled_date && (
                      <div className="flex items-center justify-end text-sm">
                        <span className={`mr-2 ${isOverdue(request) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {formatRelativeDate(request.scheduled_date)}
                        </span>
                        <Calendar className={`h-4 w-4 ${isOverdue(request) ? 'text-red-500' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {request.completed_date ? 
                          `اكتمل في ${formatDateTime(request.completed_date)}` :
                          `آخر تحديث ${formatDateTime(request.updated_at)}`
                        }
                      </span>
                      <span>أنشئ في {formatDateTime(request.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {maintenanceTasks.map((task) => {
            const request = allMaintenanceRequests.find(req => req.id === task.maintenance_request_id);
            
            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          بدء
                        </Button>
                      )}
                      
                      {task.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleTaskStatusChange(task.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          إنجاز
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <h3 className="font-semibold text-lg">{task.task_description}</h3>
                      <p className="text-sm text-gray-600">طلب: {request?.title}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center justify-end text-sm text-gray-600">
                      <span className="mr-2">{task.assigned_to_name}</span>
                      <User className="h-4 w-4" />
                    </div>
                    
                    <div className="flex items-center justify-end text-sm text-gray-600">
                      <span className="mr-2">{task.estimated_duration} ساعة</span>
                      <Timer className="h-4 w-4" />
                    </div>
                    
                    <div className="flex items-center justify-end text-sm">
                      <Badge className={
                        task.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {task.status === 'pending' ? 'في الانتظار' :
                         task.status === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'}
                      </Badge>
                    </div>
                    
                    {task.actual_duration && (
                      <div className="flex items-center justify-end text-sm text-green-600">
                        <span className="mr-2">{task.actual_duration} ساعة فعلية</span>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {task.materials_needed && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 text-right">
                        <strong>المواد المطلوبة:</strong> {task.materials_needed}
                      </p>
                    </div>
                  )}

                  {task.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 text-right">
                        <strong>ملاحظات:</strong> {task.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">جدولة الصيانة الدورية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assets
                  .filter(asset => asset.next_maintenance_date)
                  .sort((a, b) => new Date(a.next_maintenance_date!).getTime() - new Date(b.next_maintenance_date!).getTime())
                  .map((asset) => {
                    const isOverdue = asset.next_maintenance_date && new Date(asset.next_maintenance_date) <= new Date();
                    const isDueSoon = asset.next_maintenance_date && 
                      new Date(asset.next_maintenance_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                    return (
                      <div key={asset.id} className={`p-4 rounded-lg border-2 ${
                        isOverdue ? 'border-red-300 bg-red-50' :
                        isDueSoon ? 'border-orange-300 bg-orange-50' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {isOverdue && (
                              <Badge variant="destructive">متأخر</Badge>
                            )}
                            {isDueSoon && !isOverdue && (
                              <Badge className="bg-orange-100 text-orange-800">مستحق قريباً</Badge>
                            )}
                            
                            <Button
                              size="sm"
                              onClick={() => {
                                setRequestFormData({
                                  ...requestFormData,
                                  asset_id: asset.id,
                                  title: `صيانة دورية - ${asset.name}`,
                                  description: `صيانة دورية مجدولة لـ ${asset.name}`,
                                  request_type: 'preventive',
                                  scheduled_date: asset.next_maintenance_date?.replace('Z', '') || ''
                                });
                                setShowRequestForm(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              إنشاء طلب صيانة
                            </Button>
                          </div>
                          
                          <div className="text-right">
                            <h3 className="font-semibold text-lg">{asset.name}</h3>
                            <p className="text-sm text-gray-600">{asset.location}</p>
                            <p className="text-sm font-medium">
                              الصيانة القادمة: {formatRelativeDate(asset.next_maintenance_date!)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty States */}
      {activeTab === 'assets' && assets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Package className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أصول</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة الأصل الأول لهذا الفرع</p>
          <Button onClick={() => setShowAssetForm(true)}>
            إضافة أصل جديد
          </Button>
        </div>
      )}

      {activeTab === 'requests' && maintenanceRequests.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <ClipboardList className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات صيانة</h3>
          <p className="text-gray-500 mb-4">لم يتم إنشاء أي طلبات صيانة بعد</p>
          <Button onClick={() => setShowRequestForm(true)}>
            إنشاء طلب صيانة جديد
          </Button>
        </div>
      )}

      {activeTab === 'tasks' && maintenanceTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <CheckSquare className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مهام صيانة</h3>
          <p className="text-gray-500 mb-4">لم يتم إنشاء أي مهام صيانة بعد</p>
        </div>
      )}
    </div>
  );
};

export default Maintenance;