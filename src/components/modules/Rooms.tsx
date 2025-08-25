import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, MapPin, Users, DollarSign, Calendar, Clock } from 'lucide-react';
import { Room, Booking, Client, Product } from '../../types';
import { formatDateOnly, formatTimeOnly } from '../../lib/utils';
import BookingForm from './BookingForm';
import BookingCalendar from './BookingCalendar';
import AddProductToSessionModal from '../AddProductToSessionModal';

const Rooms: React.FC = () => {
  const { user } = useAuth();
  
  const [allRooms, setAllRooms] = useLocalStorage<Room[]>('rooms', []);
  const [allBookings, setAllBookings] = useLocalStorage<Booking[]>('bookings', []);
  const [allClients, setAllClients] = useLocalStorage<Client[]>('clients', []);
  const [allProducts, setAllProducts] = useLocalStorage<Product[]>('products', []);
  
  // Filter data by branch
  const rooms = allRooms.filter(room => room.branch_id === user?.branch_id);
  const bookings = allBookings.filter(booking => booking.branch_id === user?.branch_id);
  const clients = allClients.filter(client => client.branch_id === user?.branch_id);
  const products = allProducts.filter(product => product.branch_id === user?.branch_id);

  const [activeTab, setActiveTab] = useState<'rooms' | 'bookings' | 'calendar'>('rooms');
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedBookingForProducts, setSelectedBookingForProducts] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const [roomFormData, setRoomFormData] = useState({
    name: '',
    type: ['private'] as ('private' | 'shared')[],
    capacity: '',
    hourly_rate: '',
    features: ''
  });

  const setRooms = (newRooms: Room[] | ((prevRooms: Room[]) => Room[])) => {
    if (typeof newRooms === 'function') {
      setAllRooms(prevAllRooms => {
        const currentBranchRooms = prevAllRooms.filter(room => room.branch_id === user?.branch_id);
        const otherBranchRooms = prevAllRooms.filter(room => room.branch_id !== user?.branch_id);
        const updatedCurrentBranchRooms = newRooms(currentBranchRooms);
        return [...otherBranchRooms, ...updatedCurrentBranchRooms];
      });
    } else {
      setAllRooms(prevAllRooms => {
        const otherBranchRooms = prevAllRooms.filter(room => room.branch_id !== user?.branch_id);
        return [...otherBranchRooms, ...newRooms];
      });
    }
  };

  const setBookings = (newBookings: Booking[] | ((prevBookings: Booking[]) => Booking[])) => {
    if (typeof newBookings === 'function') {
      setAllBookings(prevAllBookings => {
        const currentBranchBookings = prevAllBookings.filter(booking => booking.branch_id === user?.branch_id);
        const otherBranchBookings = prevAllBookings.filter(booking => booking.branch_id !== user?.branch_id);
        const updatedCurrentBranchBookings = newBookings(currentBranchBookings);
        return [...otherBranchBookings, ...updatedCurrentBranchBookings];
      });
    } else {
      setAllBookings(prevAllBookings => {
        const otherBranchBookings = prevAllBookings.filter(booking => booking.branch_id !== user?.branch_id);
        return [...otherBranchBookings, ...newBookings];
      });
    }
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const roomData = {
      ...roomFormData,
      capacity: parseInt(roomFormData.capacity),
      hourly_rate: parseFloat(roomFormData.hourly_rate),
      features: roomFormData.features.split(',').map(f => f.trim()).filter(f => f)
    };

    if (editingRoom) {
      setRooms(rooms.map(room => 
        room.id === editingRoom.id 
          ? { ...room, ...roomData }
          : room
      ));
    } else {
      const newRoom: Room = {
        id: Date.now().toString(),
        branch_id: user?.branch_id || '1',
        ...roomData,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setRooms([...rooms, newRoom]);
    }
    
    setShowRoomForm(false);
    setEditingRoom(null);
    setRoomFormData({
      name: '',
      type: ['private'],
      capacity: '',
      hourly_rate: '',
      features: ''
    });
  };

  const handleBookingSubmit = (bookingData: any) => {
    // Create or find client
    let clientId = bookingData.client_id;
    let clientToAssign: Client | undefined;
    
    if (bookingData.client_type === 'new') {
      // Create new client for new visitors
      const newClient: Client = {
        id: Date.now().toString(),
        branch_id: user?.branch_id || '1',
        name: bookingData.client_name,
        email: '',
        phone: bookingData.client_phone,
        id_number: '',
        membership_type: 'daily',
        membership_start: new Date().toISOString(),
        membership_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
        loyalty_points: 0,
        created_at: new Date().toISOString()
      };
      
      // Update clients state with functional update to ensure latest state
      setAllClients(prevClients => [...prevClients, newClient]);
      clientId = newClient.id;
      clientToAssign = newClient;
    } else {
      // Find existing client
      clientToAssign = allClients.find(c => c.id === clientId);
    }

    const newBooking: Booking = {
      id: Date.now().toString(),
      branch_id: user?.branch_id || '1',
      room_id: bookingData.room_id,
      client_id: clientId,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      total_amount: bookingData.estimated_cost || 0,
      status: 'confirmed',
      check_in_time: undefined,
      check_out_time: undefined,
      is_shared_space: false,
      created_at: new Date().toISOString(),
      room: rooms.find(r => r.id === bookingData.room_id),
      client: clientToAssign
    };
    
    // Update bookings state with functional update to ensure latest state
    setAllBookings(prevBookings => [...prevBookings, newBooking]);
    setShowBookingForm(false);
  };

  const handleRoomEdit = (room: Room) => {
    setEditingRoom(room);
    setRoomFormData({
      name: room.name,
      type: room.type,
      capacity: room.capacity.toString(),
      hourly_rate: room.hourly_rate.toString(),
      features: room.features.join(', ')
    });
    setShowRoomForm(true);
  };

  const handleRoomDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الغرفة؟')) {
      setRooms(rooms.filter(room => room.id !== id));
    }
  };

  const handleBookingCancel = (id: string) => {
    if (confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
      setBookings(bookings.map(booking => 
        booking.id === id 
          ? { ...booking, status: 'cancelled' }
          : booking
      ));
    }
  };

  const openProductModal = (bookingId: string) => {
    setSelectedBookingForProducts(bookingId);
    setShowProductModal(true);
  };

  const handleAddProductToBooking = (bookingId: string, productId: string, quantity: number, individualName?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock_quantity < quantity) {
      alert('الكمية المطلوبة غير متوفرة في المخزون');
      return;
    }

    // Update product stock
    setAllProducts(allProducts.map(p => 
      p.id === productId 
        ? { ...p, stock_quantity: p.stock_quantity - quantity }
        : p
    ));

    // Here you would typically add the product to the booking's invoice
    // For now, we'll show a success message with individual name if provided
    const individualText = individualName ? ` للشخص: ${individualName}` : '';
    alert(`تم إضافة ${quantity} من ${product.name} إلى الحجز${individualText}`);
    
    setShowProductModal(false);
    setSelectedBookingForProducts(null);
  };

  const getRoomTypeLabel = (type: ('private' | 'shared')[]) => {
    if (type.includes('shared')) return 'مشتركة';
    return 'خاصة';
  };

  const getRoomTypeColor = (type: ('private' | 'shared')[]) => {
    if (type.includes('shared')) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBookingStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'مؤكد';
      case 'cancelled': return 'ملغي';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <Button 
            onClick={() => {
              if (activeTab === 'rooms') setShowRoomForm(true);
              else if (activeTab === 'bookings') setShowBookingForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'rooms' ? 'إضافة غرفة جديدة' : 'حجز جديد'}
          </Button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'rooms' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              الغرف ({rooms.length})
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'bookings' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              الحجوزات ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'calendar' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              التقويم
            </button>
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-800 text-right mb-2">إدارة الغرف والحجوزات</h1>
          <p className="text-gray-600 text-right">إدارة الغرف ونظام الحجوزات المتقدم</p>
        </div>
      </div>

      {/* Room Form */}
      {showRoomForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-right">
              {editingRoom ? 'تعديل الغرفة' : 'إضافة غرفة جديدة'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="room-name" className="text-right block mb-2">اسم الغرفة</Label>
                  <Input
                    id="room-name"
                    value={roomFormData.name}
                    onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                    placeholder="اسم الغرفة"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="room-capacity" className="text-right block mb-2">السعة</Label>
                  <Input
                    id="room-capacity"
                    type="number"
                    value={roomFormData.capacity}
                    onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                    placeholder="عدد الأشخاص"
                    required
                    className="text-right"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hourly-rate" className="text-right block mb-2">السعر بالساعة (ج.م)</Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    step="0.01"
                    value={roomFormData.hourly_rate}
                    onChange={(e) => setRoomFormData({ ...roomFormData, hourly_rate: e.target.value })}
                    placeholder="السعر بالساعة"
                    required
                    className="text-right"
                  />
                </div>
                <div>
                  <Label htmlFor="room-type" className="text-right block mb-2">نوع الغرفة</Label>
                  <select
                    id="room-type"
                    value={roomFormData.type[0]}
                    onChange={(e) => setRoomFormData({ ...roomFormData, type: [e.target.value as 'private' | 'shared'] })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md text-right"
                  >
                    <option value="private">غرفة خاصة</option>
                    <option value="shared">مساحة مشتركة</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="features" className="text-right block mb-2">المرافق</Label>
                <Input
                  id="features"
                  value={roomFormData.features}
                  onChange={(e) => setRoomFormData({ ...roomFormData, features: e.target.value })}
                  placeholder="بروجكتر، واي فاي، سبورة (افصل بفاصلة)"
                  className="text-right"
                />
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowRoomForm(false);
                  setEditingRoom(null);
                  setRoomFormData({
                    name: '',
                    type: ['private'],
                    capacity: '',
                    hourly_rate: '',
                    features: ''
                  });
                }}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingRoom ? 'حفظ التغييرات' : 'إضافة الغرفة'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Booking Form */}
      {showBookingForm && (
        <BookingForm
          rooms={rooms.filter(room => room.is_active)}
          clients={clients}
          onSubmit={handleBookingSubmit}
          onCancel={() => setShowBookingForm(false)}
        />
      )}

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRoomEdit(room)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRoomDelete(room.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <CardTitle className="text-xl">{room.name}</CardTitle>
                    <div className="flex gap-2 justify-end mt-1">
                      <Badge className={getRoomTypeColor(room.type)}>
                        {getRoomTypeLabel(room.type)}
                      </Badge>
                      <Badge variant={room.is_active ? 'default' : 'destructive'}>
                        {room.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <span className="mr-2">{room.capacity} شخص</span>
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <span className="mr-2">{room.hourly_rate} ج.م/ساعة</span>
                    <DollarSign className="h-4 w-4" />
                  </div>
                  {room.features.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 text-right mb-1">المرافق:</p>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {room.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Badge className={getBookingStatusColor(booking.status)}>
                      {getBookingStatusLabel(booking.status)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openProductModal(booking.id)}
                      disabled={!products.length}
                    >
                      إضافة منتج
                    </Button>
                    {booking.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBookingCancel(booking.id)}
                        className="text-red-600"
                      >
                        إلغاء الحجز
                      </Button>
                    )}
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-lg">{booking.room?.name}</h3>
                    <p className="text-gray-600">{booking.client?.name}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <span className="mr-2">{formatDateOnly(booking.start_time)}</span>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <span className="mr-2">
                      {formatTimeOnly(booking.start_time)} - {formatTimeOnly(booking.end_time)}
                    </span>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <span className="mr-2">{booking.room?.capacity || 'غير محدد'} شخص</span>
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-end text-sm font-semibold text-green-600">
                    <span className="mr-2">{booking.total_amount} ج.م</span>
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-right">تقويم الحجوزات</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingCalendar bookings={bookings} />
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {activeTab === 'rooms' && rooms.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MapPin className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد غرف</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة الغرفة الأولى لهذا الفرع</p>
          <Button onClick={() => setShowRoomForm(true)}>
            إضافة غرفة جديدة
          </Button>
        </div>
      )}

      {activeTab === 'bookings' && bookings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حجوزات</h3>
          <p className="text-gray-500 mb-4">لم يتم إنشاء أي حجوزات بعد</p>
          <Button onClick={() => setShowBookingForm(true)}>
            إنشاء حجز جديد
          </Button>
        </div>
      )}

      {/* Product Selection Modal for Bookings */}
      <AddProductToSessionModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedBookingForProducts(null);
        }}
        products={products}
        sessionId={selectedBookingForProducts || ''}
        onAddProduct={handleAddProductToBooking}
      />
    </div>
  );
};

export default Rooms;