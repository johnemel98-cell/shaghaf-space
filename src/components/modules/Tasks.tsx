import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Plus, CheckSquare, Clock, AlertTriangle, User, Calendar, 
  Edit, Trash2, Play, Pause, CheckCircle, X, Filter,
  Users, TrendingUp, Target, Briefcase
} from 'lucide-react';
import { Task, User as UserType } from '../../types';
import { formatDateOnly, formatDateTimeDetailed, formatRelativeDate } from '../../lib/utils';

const Tasks: React.FC = () => {
  const { user } = useAuth();
  
  const [allTasks, setAllTasks] = useLocalStorage<Task[]>('tasks', [
    {
      id: '1',
      branch_id: '1',
      assigned_to: '2',
      assigned_by: '1',
      title: 'تنظيف وتعقيم جميع الغرف',
      description: 'تنظيف شامل وتعقيم لجميع غرف العمل والمساحات المشتركة',
      priority: 'high',
      status: 'pending',
      due_date: '2024-12-20T16:00:00Z',
      created_at: '2024-12-16T09:00:00Z',
      updated_at: '2024-12-16T09:00:00Z',
      assigned_to_name: 'فاطمة أحمد',
      assigned_by_name: 'مدير النظام'
    },
    {
      id: '2',
      branch_id: '1',
      assigned_to: '3',
      assigned_by: '1',
      title: 'صيانة أجهزة الكمبيوتر',
      description: 'فحص وصيانة جميع أجهزة الكمبيوتر في المكتب',
      priority: 'medium',
      status: 'in_progress',
      due_date: '2024-12-18T18:00:00Z',
      created_at: '2024-12-15T10:00:00Z',
      updated_at: '2024-12-16T11:30:00Z',
      assigned_to_name: 'محمد حسام',
      assigned_by_name: 'مدير النظام'
    },
    {
      id: '3',
      branch_id: '1',
      assigned_to: '2',
      assigned_by: '2',
      title: 'تحديث قاعدة بيانات العملاء',
      description: 'مراجعة وتحديث معلومات الاتصال لجميع العملاء',
      priority: 'low',
      status: 'completed',
      due_date: '2024-12-15T17:00:00Z',
      completed_at: '2024-12-15T16:30:00Z',
      created_at: '2024-12-14T08:00:00Z',
      updated_at: '2024-12-15T16:30:00Z',
      assigned_to_name: 'فاطمة أحمد',
      assigned_by_name: 'فاطمة أحمد'
    }
  ]);

  const [allUsers] = useLocalStorage<UserType[]>('users', [
    { id: '1', name: 'مدير النظام', email: 'admin@shaghaf.eg', role: 'admin', branch_id: '1', created_at: '2024-01-01T00:00:00Z' },
    { id: '2', name: 'فاطمة أحمد', email: 'fatma@shaghaf.eg', role: 'reception', branch_id: '1', created_at: '2024-01-01T00:00:00Z' },
    { id: '3', name: 'محمد حسام', email: 'mohamed@shaghaf.eg', role: 'employee', branch_id: '1', created_at: '2024-01-01T00:00:00Z' }
  ]);

  // Filter data by branch
  const tasks = allTasks.filter(task => task.branch_id === user?.branch_id);
  const branchUsers = allUsers.filter(u => u.branch_id === user?.branch_id);

  // UI States
  const [activeTab, setActiveTab] = useState<'all' | 'my-tasks' | 'assigned-by-me'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium' as Task['priority'],
    due_date: ''
  });

  // Filter tasks based on active tab and filters
  const filteredTasks = React.useMemo(() => {
    let filtered = tasks;

    // Tab filter
    if (activeTab === 'my-tasks') {
      filtered = filtered.filter(task => task.assigned_to === user?.id);
    } else if (activeTab === 'assigned-by-me') {
      filtered = filtered.filter(task => task.assigned_by === user?.id);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    return filtered.sort((a, b) => {
      // Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date (closer dates first)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      
      // Finally by creation date (newer first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, activeTab, filterStatus, filterPriority, user?.id]);

  // Task statistics
  const taskStats = React.useMemo(() => {
    const myTasks = tasks.filter(task => task.assigned_to === user?.id);
    const assignedByMe = tasks.filter(task => task.assigned_by === user?.id);
    
    return {
      total: tasks.length,
      pending: tasks.filter(task => task.status === 'pending').length,
      inProgress: tasks.filter(task => task.status === 'in_progress').length,
      completed: tasks.filter(task => task.status === 'completed').length,
      overdue: tasks.filter(task => 
        task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
      ).length,
      myTasks: myTasks.length,
      myPending: myTasks.filter(task => task.status === 'pending').length,
      assignedByMe: assignedByMe.length
    };
  }, [tasks, user?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.assigned_to) {
      alert('عنوان المهمة والموظف المكلف مطلوبان');
      return;
    }

    const assignedUser = branchUsers.find(u => u.id === formData.assigned_to);
    const taskData = {
      ...formData,
      assigned_to_name: assignedUser?.name,
      assigned_by_name: user?.name
    };

    if (editingTask) {
      setAllTasks(allTasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...taskData, updated_at: new Date().toISOString() }
          : task
      ));
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        branch_id: user?.branch_id || '1',
        assigned_by: user?.id || '1',
        ...taskData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setAllTasks([...allTasks, newTask]);
    }
    
    setShowForm(false);
    setEditingTask(null);
    setFormData({
      title: '', description: '', assigned_to: '', priority: 'medium', due_date: ''
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
      setAllTasks(allTasks.filter(task => task.id !== id));
    }
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    const completed_at = newStatus === 'completed' ? new Date().toISOString() : undefined;
    
    setAllTasks(allTasks.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            status: newStatus, 
            completed_at,
            updated_at: new Date().toISOString() 
          }
        : task
    ));
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_progress': return 'قيد التنفيذ';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const isOverdue = (task: Task) => {
    return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  };

  const canEditTask = (task: Task) => {
    return user?.role === 'admin' || task.assigned_by === user?.id;
  };

  const canChangeStatus = (task: Task) => {
    return task.assigned_to === user?.id || user?.role === 'admin' || task.assigned_by === user?.id;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Button 
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة مهمة جديدة
            </Button>
          )}
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'all' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              جميع المهام ({taskStats.total})
            </button>
            <button
              onClick={() => setActiveTab('my-tasks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'my-tasks' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              مهامي ({taskStats.myTasks})
            </button>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => setActiveTab('assigned-by-me')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'assigned-by-me' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                كلفت بها ({taskStats.assignedByMe})
              </button>
            )}
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-800 text-right mb-2">إدارة المهام</h1>
          <p className="text-gray-600 text-right">تنظيم وتوزيع المهام على الموظفين</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">إجمالي المهام</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right text-blue-600">{taskStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">في الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right text-gray-600">{taskStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">قيد التنفيذ</CardTitle>
            <Play className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right text-blue-600">{taskStats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right text-green-600">{taskStats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">متأخرة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right text-red-600">{taskStats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-right flex items-center">
            <Filter className="h-5 w-5 ml-2" />
            تصفية المهام
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
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغية</option>
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

      {/* Task Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-right">
              {editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="task-title" className="text-right block mb-2">عنوان المهمة *</Label>
                <Input
                  id="task-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="عنوان المهمة"
                  required
                  className="text-right"
                />
              </div>

              <div>
                <Label htmlFor="task-description" className="text-right block mb-2">الوصف</Label>
                <textarea
                  id="task-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف تفصيلي للمهمة"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md text-right resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="assigned-to" className="text-right block mb-2">مكلف إلى *</Label>
                  <select
                    id="assigned-to"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="">اختر الموظف</option>
                    {branchUsers.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({employee.role === 'admin' ? 'مدير عام' : 
                         employee.role === 'manager' ? 'مدير فرع' : 
                         employee.role === 'reception' ? 'استقبال' : 'موظف'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="priority" className="text-right block mb-2">الأولوية</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="low">منخفض</option>
                    <option value="medium">متوسط</option>
                    <option value="high">عالي</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="due-date" className="text-right block mb-2">تاريخ الاستحقاق</Label>
                  <Input
                    id="due-date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingTask(null);
                  setFormData({
                    title: '', description: '', assigned_to: '', priority: 'medium', due_date: ''
                  });
                }}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingTask ? 'حفظ التغييرات' : 'إضافة المهمة'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={`hover:shadow-lg transition-shadow ${
            isOverdue(task) ? 'border-l-4 border-l-red-500' : 
            task.priority === 'urgent' ? 'border-l-4 border-l-red-400' :
            task.priority === 'high' ? 'border-l-4 border-l-orange-400' : ''
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {canEditTask(task) && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(task)}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(task.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  {canChangeStatus(task) && task.status !== 'completed' && task.status !== 'cancelled' && (
                    <div className="flex gap-1">
                      {task.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(task.id, 'in_progress')}
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          بدء
                        </Button>
                      )}
                      
                      {task.status === 'in_progress' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(task.id, 'completed')}
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            إنجاز
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(task.id, 'pending')}
                            className="text-gray-600 text-xs"
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            إيقاف
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                    {isOverdue(task) && (
                      <Badge variant="destructive">متأخرة</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{task.title}</CardTitle>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-end text-sm text-gray-600">
                  <span className="mr-2">{task.assigned_to_name}</span>
                  <User className="h-4 w-4" />
                </div>
                
                <div className="flex items-center justify-end text-sm text-gray-600">
                  <span className="mr-2">{task.assigned_by_name}</span>
                  <span className="text-gray-500">كلف بواسطة:</span>
                </div>
                
                {task.due_date && (
                  <div className="flex items-center justify-end text-sm">
                    <span className={`mr-2 ${isOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                      {formatRelativeDate(task.due_date)}
                    </span>
                    <Calendar className={`h-4 w-4 ${isOverdue(task) ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {task.completed_at ? 
                      `اكتملت في ${formatDateTimeDetailed(task.completed_at)}` :
                      `آخر تحديث ${formatDateTimeDetailed(task.updated_at)}`
                    }
                  </span>
                  <span>أنشئت في {formatDateTimeDetailed(task.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <CheckSquare className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {tasks.length === 0 ? 'لا توجد مهام' : 'لا توجد مهام تطابق المعايير المحددة'}
          </h3>
          <p className="text-gray-500 mb-4">
            {tasks.length === 0 ? 'ابدأ بإضافة المهمة الأولى' : 'جرب تغيير المرشحات أو الانتقال لتبويب آخر'}
          </p>
          {(user?.role === 'admin' || user?.role === 'manager') && tasks.length === 0 && (
            <Button onClick={() => setShowForm(true)}>
              إضافة مهمة جديدة
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Tasks;