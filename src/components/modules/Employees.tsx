import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Plus, Users, Clock, CheckCircle, AlertCircle, Calendar, User, 
  UserCheck, UserX, DollarSign, FileText, QrCode, Edit, Trash2,
  ClockIcon, Timer, TrendingUp, Download
} from 'lucide-react';
import { EmployeeProfile, Shift, EmployeeShift, AttendanceRecord, PayrollRecord } from '../../types';
import { formatDateOnly, formatTimeOnly, formatDateTimeDetailed } from '../../lib/utils';

const Employees: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'shifts' | 'attendance' | 'payroll'>('dashboard');
  
  // Employee data
  const [allEmployees, setAllEmployees] = useLocalStorage<EmployeeProfile[]>('employee_profiles', [
    {
      id: '1',
      branch_id: '1',
      employee_code: 'EMP001',
      name: 'أحمد محمد علي',
      email: 'ahmed@shaghaf.eg',
      phone: '+20101234567',
      position: 'manager',
      department: 'الإدارة',
      basic_salary: 8000,
      hire_date: '2024-01-15',
      employment_status: 'active',
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: '2',
      branch_id: '1',
      employee_code: 'EMP002',
      name: 'فاطمة أحمد',
      email: 'fatma@shaghaf.eg',
      phone: '+20102345678',
      position: 'reception',
      department: 'خدمة العملاء',
      basic_salary: 4500,
      hire_date: '2024-02-01',
      employment_status: 'active',
      created_at: '2024-02-01T00:00:00Z'
    },
    {
      id: '3',
      branch_id: '1',
      employee_code: 'EMP003',
      name: 'محمد حسام',
      email: 'mohamed@shaghaf.eg',
      phone: '+20103456789',
      position: 'employee',
      department: 'الصيانة',
      basic_salary: 3500,
      hire_date: '2024-03-01',
      employment_status: 'active',
      created_at: '2024-03-01T00:00:00Z'
    }
  ]);

  // Shifts data
  const [allShifts, setAllShifts] = useLocalStorage<Shift[]>('shifts', [
    {
      id: '1',
      branch_id: '1',
      name: 'الشيفت الصباحي',
      type: 'morning',
      start_time: '08:00',
      end_time: '16:00',
      days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
      is_active: true,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      branch_id: '1',
      name: 'الشيفت المسائي',
      type: 'evening',
      start_time: '16:00',
      end_time: '00:00',
      days_of_week: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      is_active: true,
      created_at: '2024-01-01T00:00:00Z'
    }
  ]);

  // Employee shifts assignments
  const [allEmployeeShifts, setAllEmployeeShifts] = useLocalStorage<EmployeeShift[]>('employee_shifts', [
    {
      id: '1',
      employee_id: '1',
      shift_id: '1',
      assigned_date: '2024-01-15',
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: '2',
      employee_id: '2',
      shift_id: '1',
      assigned_date: '2024-02-01',
      created_at: '2024-02-01T00:00:00Z'
    }
  ]);

  // Attendance records
  const [allAttendance, setAllAttendance] = useLocalStorage<AttendanceRecord[]>('attendance_records', [
    {
      id: '1',
      employee_id: '1',
      branch_id: '1',
      check_in: '2024-12-16T08:00:00Z',
      check_out: '2024-12-16T16:30:00Z',
      break_duration: 60,
      total_hours: 8,
      overtime_hours: 0.5,
      late_minutes: 0,
      status: 'present',
      date: '2024-12-16',
      created_at: '2024-12-16T08:00:00Z'
    },
    {
      id: '2',
      employee_id: '2',
      branch_id: '1',
      check_in: '2024-12-16T08:15:00Z',
      check_out: '2024-12-16T16:00:00Z',
      break_duration: 45,
      total_hours: 7.75,
      overtime_hours: 0,
      late_minutes: 15,
      status: 'late',
      date: '2024-12-16',
      created_at: '2024-12-16T08:15:00Z'
    }
  ]);

  // Payroll records
  const [allPayroll, setAllPayroll] = useLocalStorage<PayrollRecord[]>('payroll_records', []);

  // Filter data by branch
  const employees = allEmployees.filter(emp => emp.branch_id === user?.branch_id);
  const shifts = allShifts.filter(shift => shift.branch_id === user?.branch_id);
  const attendance = allAttendance.filter(att => att.branch_id === user?.branch_id);
  const payroll = allPayroll.filter(pay => pay.branch_id === user?.branch_id);

  // Form states
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const [employeeFormData, setEmployeeFormData] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    position: 'employee' as EmployeeProfile['position'],
    department: '',
    basic_salary: '',
    hire_date: ''
  });

  const [shiftFormData, setShiftFormData] = useState({
    name: '',
    type: 'morning' as Shift['type'],
    start_time: '',
    end_time: '',
    days_of_week: [] as number[]
  });

  // Dashboard metrics
  const dashboardMetrics = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(att => att.date === today);
    
    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(emp => emp.employment_status === 'active').length,
      presentToday: todayAttendance.filter(att => att.status === 'present').length,
      lateToday: todayAttendance.filter(att => att.status === 'late').length,
      absentToday: employees.length - todayAttendance.length,
      onShiftNow: todayAttendance.filter(att => att.check_in && !att.check_out).length,
      totalSalaryExpense: employees.reduce((sum, emp) => sum + emp.basic_salary, 0)
    };
  }, [employees, attendance]);

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const employeeData = {
      ...employeeFormData,
      basic_salary: parseFloat(employeeFormData.basic_salary)
    };

    if (editingEmployee) {
      setAllEmployees(allEmployees.map(emp => 
        emp.id === editingEmployee.id 
          ? { ...emp, ...employeeData }
          : emp
      ));
    } else {
      const newEmployee: EmployeeProfile = {
        id: Date.now().toString(),
        branch_id: user?.branch_id || '1',
        ...employeeData,
        employment_status: 'active',
        created_at: new Date().toISOString()
      };
      setAllEmployees([...allEmployees, newEmployee]);
    }
    
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setEmployeeFormData({
      employee_code: '', name: '', email: '', phone: '', position: 'employee',
      department: '', basic_salary: '', hire_date: ''
    });
  };

  const handleShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingShift) {
      setAllShifts(allShifts.map(shift => 
        shift.id === editingShift.id 
          ? { ...shift, ...shiftFormData }
          : shift
      ));
    } else {
      const newShift: Shift = {
        id: Date.now().toString(),
        branch_id: user?.branch_id || '1',
        ...shiftFormData,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setAllShifts([...allShifts, newShift]);
    }
    
    setShowShiftForm(false);
    setEditingShift(null);
    setShiftFormData({
      name: '', type: 'morning', start_time: '', end_time: '', days_of_week: []
    });
  };

  const handleCheckIn = (employeeId: string) => {
    
    // Check if there's an open check-in (without check-out) for this employee
    const openRecord = allAttendance.find(att => 
      att.employee_id === employeeId && att.check_in && !att.check_out
    );
    
    if (openRecord) {
      alert('يجب تسجيل الخروج أولاً من الفترة السابقة');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const checkInTime = now.toISOString();
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employee_id: employeeId,
      branch_id: user?.branch_id || '1',
      check_in: checkInTime,
      break_duration: 0,
      total_hours: 0,
      overtime_hours: 0,
      late_minutes: 0, // Calculate based on shift
      status: 'present',
      date: today,
      created_at: checkInTime
    };
    
    setAllAttendance([...allAttendance, newRecord]);
  };

  const handleCheckOut = (employeeId: string) => {
    const now = new Date();
    
    // Find the most recent open check-in record for this employee
    const openRecords = allAttendance
      .filter(att => att.employee_id === employeeId && att.check_in && !att.check_out)
      .sort((a, b) => new Date(b.check_in!).getTime() - new Date(a.check_in!).getTime());
    
    if (openRecords.length === 0) {
      alert('لم يتم العثور على تسجيل حضور مفتوح. يجب تسجيل الحضور أولاً.');
      return;
    }

    const latestOpenRecord = openRecords[0];
    const recordIndex = allAttendance.findIndex(att => att.id === latestOpenRecord.id);
    
    if (recordIndex === -1) {
      alert('خطأ في العثور على سجل الحضور');
      return;
    }

    const checkInTime = new Date(latestOpenRecord.check_in!);
    const checkOutTime = now;
    const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    const totalHours = totalMinutes / 60;

    // Ask for break duration
    const breakDurationStr = prompt(
      `كم دقيقة كانت مدة الاستراحة؟\n` +
      `وقت الحضور: ${formatTimeOnly(latestOpenRecord.check_in!)}\n` +
      `وقت الانصراف: ${formatTimeOnly(checkOutTime.toISOString())}\n` +
      `إجمالي الوقت: ${totalHours.toFixed(1)} ساعة`,
      '0'
    );
    
    const breakDuration = parseInt(breakDurationStr || '0') || 0;
    const netMinutes = totalMinutes - breakDuration;
    const netHours = Math.max(0, netMinutes / 60);
    
    // Ask for notes
    const notes = prompt('ملاحظات (اختيارية):') || undefined;

    // Calculate if late (assuming shift starts at 8:00 AM)
    const checkInDate = new Date(latestOpenRecord.check_in!);
    const shiftStartTime = new Date(checkInDate);
    shiftStartTime.setHours(8, 0, 0, 0); // 8:00 AM
    const lateMinutes = Math.max(0, (checkInDate.getTime() - shiftStartTime.getTime()) / (1000 * 60));
    
    // Determine status
    let status: AttendanceRecord['status'] = 'present';
    if (lateMinutes > 15) {
      status = 'late';
    }
    if (netHours < 4) { // Less than 4 hours is considered partial
      status = 'partial';
    }

    // Calculate overtime (assuming 8-hour workday)
    const overtimeHours = Math.max(0, netHours - 8);

    const updatedAttendance = [...allAttendance];
    updatedAttendance[recordIndex] = {
      ...latestOpenRecord,
      check_out: checkOutTime.toISOString(),
      break_duration: breakDuration,
      total_hours: Math.round(netHours * 100) / 100,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      late_minutes: Math.round(lateMinutes),
      status,
      notes
    };
    
    setAllAttendance(updatedAttendance);
    
    // Show success message
    alert(
      `تم تسجيل الانصراف بنجاح!\n` +
      `الوقت الصافي: ${netHours.toFixed(1)} ساعة\n` +
      `${overtimeHours > 0 ? `ساعات إضافية: ${overtimeHours.toFixed(1)} ساعة\n` : ''}` +
      `${lateMinutes > 0 ? `تأخير: ${lateMinutes.toFixed(0)} دقيقة\n` : ''}` +
      `الحالة: ${status === 'present' ? 'حاضر' : status === 'late' ? 'متأخر' : status === 'partial' ? 'جزئي' : 'غائب'}`
    );
  };

  // Helper function for attendance display
  const getAttendanceStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-orange-100 text-orange-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceStatusLabel = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present': return 'حاضر';
      case 'late': return 'متأخر';
      case 'partial': return 'جزئي';
      case 'absent': return 'غائب';
      default: return status;
    }
  };

  // Update attendance section to show multiple records per day
  const getTodayAttendanceForEmployee = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendance
      .filter(att => att.employee_id === employeeId && att.date === today)
      .sort((a, b) => new Date(a.check_in!).getTime() - new Date(b.check_in!).getTime());
  };

  const getOpenCheckInForEmployee = (employeeId: string) => {
    return allAttendance.find(att => 
      att.employee_id === employeeId && att.check_in && !att.check_out
    );
  };

  const generatePayroll = (month: string) => {
    const [year, monthNum] = month.split('-');
    const monthAttendance = attendance.filter(att => att.date.startsWith(month));
    
    employees.forEach(employee => {
      const empAttendance = monthAttendance.filter(att => att.employee_id === employee.id);
      const totalHours = empAttendance.reduce((sum, att) => sum + att.total_hours, 0);
      const overtimeHours = empAttendance.reduce((sum, att) => sum + att.overtime_hours, 0);
      const absentDays = empAttendance.filter(att => att.status === 'absent').length;
      const lateInstances = empAttendance.filter(att => att.status === 'late').length;
      
      const overtimeRate = employee.basic_salary / (30 * 8) * 1.5; // 1.5x regular rate
      const overtimePay = overtimeHours * overtimeRate;
      const absentDeduction = (employee.basic_salary / 30) * absentDays;
      const lateDeduction = (employee.basic_salary / (30 * 8)) * (lateInstances * 0.5); // 30 min deduction per late
      const totalDeductions = absentDeduction + lateDeduction;
      const netSalary = employee.basic_salary + overtimePay - totalDeductions;
      
      const payrollRecord: PayrollRecord = {
        id: `${employee.id}-${month}`,
        employee_id: employee.id,
        branch_id: employee.branch_id,
        month,
        basic_salary: employee.basic_salary,
        overtime_pay: overtimePay,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        absent_days: absentDays,
        late_instances: lateInstances,
        status: 'draft',
        generated_at: new Date().toISOString()
      };
      
      // Update or add payroll record
      const existingIndex = allPayroll.findIndex(p => p.id === payrollRecord.id);
      if (existingIndex >= 0) {
        const updatedPayroll = [...allPayroll];
        updatedPayroll[existingIndex] = payrollRecord;
        setAllPayroll(updatedPayroll);
      } else {
        setAllPayroll([...allPayroll, payrollRecord]);
      }
    });
  };

  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'manager': return 'مدير';
      case 'reception': return 'موظف استقبال';
      case 'employee': return 'موظف';
      default: return position;
    }
  };

  const getShiftTypeLabel = (type: string) => {
    switch (type) {
      case 'morning': return 'صباحي';
      case 'evening': return 'مسائي';
      case 'full': return 'كامل';
      default: return type;
    }
  };

  const getDaysOfWeekLabel = (days: number[]) => {
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days.map(day => dayNames[day]).join(', ');
  };

  if (user?.role !== 'admin' && user?.role !== 'manager' && activeTab !== 'attendance') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">غير مصرح لك بالوصول</h3>
          <p className="text-gray-500">ليس لديك صلاحية لإدارة الموظفين</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <>
              <Button 
                onClick={() => {
                  if (activeTab === 'employees') setShowEmployeeForm(true);
                  else if (activeTab === 'shifts') setShowShiftForm(true);
                  else if (activeTab === 'payroll') generatePayroll(new Date().toISOString().substring(0, 7));
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {activeTab === 'employees' && 'إضافة موظف جديد'}
                {activeTab === 'shifts' && 'إضافة شيفت جديد'}
                {activeTab === 'payroll' && 'إنشاء كشف رواتب'}
                {activeTab === 'dashboard' && 'إضافة'}
              </Button>
            </>
          )}
          
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
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'employees' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  الموظفين
                </button>
                <button
                  onClick={() => setActiveTab('shifts')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'shifts' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  الشيفتات
                </button>
                <button
                  onClick={() => setActiveTab('payroll')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'payroll' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  الرواتب
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'attendance' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              الحضور
            </button>
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-800 text-right mb-2">إدارة الموظفين</h1>
          <p className="text-gray-600 text-right">إدارة شاملة للموظفين والشيفتات والحضور والرواتب</p>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">إجمالي الموظفين</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-blue-600">{dashboardMetrics.totalEmployees}</div>
                <p className="text-xs text-muted-foreground text-right">
                  نشط: {dashboardMetrics.activeEmployees}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">على الشيفت الآن</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-green-600">{dashboardMetrics.onShiftNow}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">متأخرين اليوم</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-orange-600">{dashboardMetrics.lateToday}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-right">إجمالي الرواتب</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right text-purple-600">
                  {dashboardMetrics.totalSalaryExpense.toLocaleString('ar-EG')} ج.م
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Attendance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">حضور اليوم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <Badge className="bg-green-100 text-green-800">حاضر</Badge>
                    <span className="font-semibold">{dashboardMetrics.presentToday} موظف</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <Badge className="bg-orange-100 text-orange-800">متأخر</Badge>
                    <span className="font-semibold">{dashboardMetrics.lateToday} موظف</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <Badge className="bg-red-100 text-red-800">غائب</Badge>
                    <span className="font-semibold">{dashboardMetrics.absentToday} موظف</span>
                  </div>
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
                    onClick={() => setActiveTab('attendance')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <span className="text-sm font-medium">تسجيل حضور</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('employees')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <Users className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <span className="text-sm font-medium">إدارة الموظفين</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('shifts')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                    <span className="text-sm font-medium">جدولة الشيفتات</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('payroll')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <span className="text-sm font-medium">كشف المرتبات</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Employee Form */}
      {showEmployeeForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-right">
              {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee-code" className="text-right block mb-2">كود الموظف</Label>
                  <Input
                    id="employee-code"
                    value={employeeFormData.employee_code}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, employee_code: e.target.value })}
                    placeholder="EMP001"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="employee-name" className="text-right block mb-2">الاسم الكامل</Label>
                  <Input
                    id="employee-name"
                    value={employeeFormData.name}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                    placeholder="الاسم الكامل"
                    required
                    className="text-right"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee-email" className="text-right block mb-2">البريد الإلكتروني</Label>
                  <Input
                    id="employee-email"
                    type="email"
                    value={employeeFormData.email}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                    placeholder="البريد الإلكتروني"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="employee-phone" className="text-right block mb-2">رقم الهاتف</Label>
                  <Input
                    id="employee-phone"
                    value={employeeFormData.phone}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                    placeholder="+20101234567"
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="position" className="text-right block mb-2">المنصب</Label>
                  <select
                    id="position"
                    value={employeeFormData.position}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, position: e.target.value as EmployeeProfile['position'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="manager">مدير</option>
                    <option value="reception">موظف استقبال</option>
                    <option value="employee">موظف</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="department" className="text-right block mb-2">القسم</Label>
                  <Input
                    id="department"
                    value={employeeFormData.department}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, department: e.target.value })}
                    placeholder="القسم"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="basic-salary" className="text-right block mb-2">الراتب الأساسي (ج.م)</Label>
                  <Input
                    id="basic-salary"
                    type="number"
                    value={employeeFormData.basic_salary}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, basic_salary: e.target.value })}
                    placeholder="الراتب"
                    required
                    className="text-right"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="hire-date" className="text-right block mb-2">تاريخ التوظيف</Label>
                <Input
                  id="hire-date"
                  type="date"
                  value={employeeFormData.hire_date}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, hire_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEmployeeForm(false);
                  setEditingEmployee(null);
                  setEmployeeFormData({
                    employee_code: '', name: '', email: '', phone: '', position: 'employee',
                    department: '', basic_salary: '', hire_date: ''
                  });
                }}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'حفظ التغييرات' : 'إضافة الموظف'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Shift Form */}
      {showShiftForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-right">
              {editingShift ? 'تعديل الشيفت' : 'إضافة شيفت جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleShiftSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shift-name" className="text-right block mb-2">اسم الشيفت</Label>
                  <Input
                    id="shift-name"
                    value={shiftFormData.name}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                    placeholder="اسم الشيفت"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="shift-type" className="text-right block mb-2">نوع الشيفت</Label>
                  <select
                    id="shift-type"
                    value={shiftFormData.type}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, type: e.target.value as Shift['type'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="morning">صباحي</option>
                    <option value="evening">مسائي</option>
                    <option value="full">كامل</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time" className="text-right block mb-2">وقت البداية</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={shiftFormData.start_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end-time" className="text-right block mb-2">وقت النهاية</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={shiftFormData.end_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-right block mb-2">أيام العمل</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, index) => (
                    <label key={index} className="flex items-center justify-end space-x-2 space-x-reverse cursor-pointer">
                      <span className="text-sm">{day}</span>
                      <input
                        type="checkbox"
                        checked={shiftFormData.days_of_week.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setShiftFormData({
                              ...shiftFormData,
                              days_of_week: [...shiftFormData.days_of_week, index]
                            });
                          } else {
                            setShiftFormData({
                              ...shiftFormData,
                              days_of_week: shiftFormData.days_of_week.filter(d => d !== index)
                            });
                          }
                        }}
                        className="rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowShiftForm(false);
                  setEditingShift(null);
                  setShiftFormData({
                    name: '', type: 'morning', start_time: '', end_time: '', days_of_week: []
                  });
                }}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingShift ? 'حفظ التغييرات' : 'إضافة الشيفت'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCheckIn(employee.id)}
                      className="text-green-600 hover:bg-green-50"
                      title="تسجيل حضور"
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCheckOut(employee.id)}
                      className="text-red-600 hover:bg-red-50"
                      title="تسجيل انصراف"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <p className="text-sm text-gray-600">{employee.employee_code}</p>
                    <div className="flex gap-2 justify-end mt-1">
                      <Badge variant="secondary">{getPositionLabel(employee.position)}</Badge>
                      <Badge variant={employee.employment_status === 'active' ? 'default' : 'destructive'}>
                        {employee.employment_status === 'active' ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{employee.department}</span>
                    <span className="text-gray-500">القسم:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600" dir="ltr">{employee.email}</span>
                    <span className="text-gray-500">البريد:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-green-600">{employee.basic_salary.toLocaleString('ar-EG')} ج.م</span>
                    <span className="text-gray-500">الراتب:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {formatDateOnly(employee.hire_date)}
                    </span>
                    <span className="text-gray-500">تاريخ التوظيف:</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <Card key={shift.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="text-right">
                  <CardTitle className="text-lg">{shift.name}</CardTitle>
                  <div className="flex gap-2 justify-end mt-1">
                    <Badge variant="secondary">{getShiftTypeLabel(shift.type)}</Badge>
                    <Badge variant={shift.is_active ? 'default' : 'destructive'}>
                      {shift.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{shift.start_time} - {shift.end_time}</span>
                    <span className="text-gray-500">التوقيت:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{getDaysOfWeekLabel(shift.days_of_week)}</span>
                    <span className="text-gray-500">أيام العمل:</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">
                      {allEmployeeShifts.filter(es => es.shift_id === shift.id).length} موظف
                    </span>
                    <span className="text-gray-500">المعينون:</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">تسجيل الحضور والانصراف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-800 mb-2">
                    {formatTimeOnly(new Date())}
                  </div>
                  <div className="text-gray-600">
                    {formatDateTimeDetailed(new Date()).split('،')[0]}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleCheckIn(user?.id || '1')}
                    className="h-20 text-lg bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="h-8 w-8 mr-3" />
                    تسجيل الحضور
                  </Button>
                  
                  <Button
                    onClick={() => handleCheckOut(user?.id || '1')}
                    variant="outline"
                    className="h-20 text-lg border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <UserX className="h-8 w-8 mr-3" />
                    تسجيل الانصراف
                  </Button>
                </div>
                
                {/* QR Code Scanner Placeholder */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-lg mb-4">
                    <QrCode className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">امسح الـ QR Code للتسجيل السريع</p>
                </div>
                
                {/* Today's Records */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-right mb-4">سجلات الحضور اليوم</h4>
                  <div className="space-y-2">
                    {attendance
                      .filter(att => att.date === new Date().toISOString().split('T')[0])
                      .map((record) => {
                        const employee = employees.find(emp => emp.id === record.employee_id);
                        return (
                          <div key={record.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {record.status === 'present' ? 'حاضر' : 
                                 record.status === 'late' ? 'متأخر' : 'غائب'}
                              </Badge>
                              {record.check_in && (
                                <span className="text-sm text-gray-600">
                                  {formatTimeOnly(record.check_in)}
                                </span>
                              )}
                              {record.check_out && (
                                <span className="text-sm text-gray-600">
                                  - {formatTimeOnly(record.check_out)}
                                </span>
                              )}
                            </div>
                            <span className="font-medium">{employee?.name}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button
              onClick={() => {
                const month = prompt('أدخل الشهر (YYYY-MM):', new Date().toISOString().substring(0, 7));
                if (month) generatePayroll(month);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              إنشاء كشف رواتب جديد
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {employees.map((employee) => {
              const latestPayroll = payroll
                .filter(p => p.employee_id === employee.id)
                .sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0];
              
              return (
                <Card key={employee.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          تحميل كشف الراتب
                        </Button>
                      </div>
                      
                      <div className="text-right">
                        <h3 className="font-semibold text-lg">{employee.name}</h3>
                        <p className="text-gray-600 text-sm">{employee.employee_code}</p>
                      </div>
                    </div>
                    
                    {latestPayroll ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-semibold text-blue-600">
                            {latestPayroll.basic_salary.toLocaleString('ar-EG')} ج.م
                          </div>
                          <p className="text-sm text-gray-600">الراتب الأساسي</p>
                        </div>
                        
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-semibold text-green-600">
                            {latestPayroll.overtime_pay.toLocaleString('ar-EG')} ج.م
                          </div>
                          <p className="text-sm text-gray-600">ساعات إضافية</p>
                        </div>
                        
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-lg font-semibold text-red-600">
                            {latestPayroll.total_deductions.toLocaleString('ar-EG')} ج.م
                          </div>
                          <p className="text-sm text-gray-600">الخصومات</p>
                        </div>
                        
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-semibold text-purple-600">
                            {latestPayroll.net_salary.toLocaleString('ar-EG')} ج.م
                          </div>
                          <p className="text-sm text-gray-600">الراتب الصافي</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        لم يتم إنشاء كشف راتب لهذا الموظف بعد
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty States */}
      {activeTab === 'employees' && employees.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <User className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد موظفين</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة الموظف الأول لهذا الفرع</p>
          <Button onClick={() => setShowEmployeeForm(true)}>
            إضافة موظف جديد
          </Button>
        </div>
      )}
    </div>
  );
};

export default Employees;