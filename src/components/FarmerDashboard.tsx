import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Truck,
  XCircle,
  Image as ImageIcon,
  Camera,
  Upload,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Product } from '../types';
import { cn } from '../lib/utils';
import { translations, Language } from '../lib/translations';
import { getDefaultProductImage } from '../lib/imageUtils';

interface FarmerDashboardProps {
  farmerName: string;
  farmerPhoto?: string;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  lang: Language;
  voiceCommand?: any;
}

const MOCK_ORDERS = [
  { id: 'ORD-001', customer: 'Rahul Sharma', items: 'Desi Tomatoes (2kg)', total: 90.00, status: 'Delivered', date: '2026-03-10' },
  { id: 'ORD-002', customer: 'Anjali Gupta', items: 'Shimla Apples (3kg)', total: 420.00, status: 'Shipped', date: '2026-03-09' },
  { id: 'ORD-003', customer: 'Vikram Singh', items: 'Forest Honey (1 jar)', total: 350.00, status: 'Processing', date: '2026-03-11' },
  { id: 'ORD-004', customer: 'Priya Patel', items: 'Fresh Palak (1 bunch)', total: 30.00, status: 'Cancelled', date: '2026-03-11' },
];

export default function FarmerDashboard({ farmerName, farmerPhoto, products, onUpdateProducts, lang, voiceCommand }: FarmerDashboardProps) {
  const t = translations[lang];
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImageManuallyEdited, setIsImageManuallyEdited] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MOCK_SALES_DATA = [
    { name: t.mon, sales: 400 },
    { name: t.tue, sales: 300 },
    { name: t.wed, sales: 600 },
    { name: t.thu, sales: 800 },
    { name: t.fri, sales: 500 },
    { name: t.sat, sales: 900 },
    { name: t.sun, sales: 700 },
  ];
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    unit: 'kg',
    category: 'Vegetables',
    description: '',
    stock: 0,
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=800'
  });

  const farmerProducts = products.filter(p => p.farmerName === farmerName);
  const totalRevenue = MOCK_ORDERS
    .filter(o => o.status === 'Delivered' || o.status === 'Shipped')
    .reduce((sum, o) => sum + o.total, 0);

  React.useEffect(() => {
    if (voiceCommand) {
      const { action, payload } = voiceCommand;
      if (action === 'ADD_PRODUCT') {
        setFormData({
          name: payload.productName || '',
          price: payload.price || 0,
          unit: 'kg',
          category: payload.category || 'Vegetables',
          description: '',
          stock: payload.stock || 0,
          image: getDefaultProductImage(payload.productName || '', payload.category || 'Vegetables')
        });
        setIsAddModalOpen(true);
      } else if (action === 'UPDATE_PRODUCT') {
        const product = farmerProducts.find(p => p.name.toLowerCase().includes(payload.productName?.toLowerCase() || ''));
        if (product) {
          setEditingProduct(product);
          setFormData(product);
          setIsAddModalOpen(true);
        }
      } else if (action === 'DELETE_PRODUCT') {
        const product = farmerProducts.find(p => p.name.toLowerCase().includes(payload.productName?.toLowerCase() || ''));
        if (product) {
          if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
            onUpdateProducts(products.filter(p => p.id !== product.id));
          }
        }
      }
    }
  }, [voiceCommand]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const updated = products.map(p => p.id === editingProduct.id ? { ...p, ...formData } as Product : p);
      onUpdateProducts(updated);
    } else {
      const newProduct: Product = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        farmerName,
        farmLocation: products.find(p => p.farmerName === farmerName)?.farmLocation || 'Local Farm',
        rating: 5.0,
        reviews: [],
        coordinates: products.find(p => p.farmerName === farmerName)?.coordinates || { lat: 20.5937, lng: 78.9629 },
      } as Product;
      onUpdateProducts([...products, newProduct]);
    }
    setIsAddModalOpen(false);
    setEditingProduct(null);
    setIsImageManuallyEdited(false);
    stopCamera();
    resetForm();
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm(t.confirmDelete)) {
      onUpdateProducts(products.filter(p => p.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      unit: 'kg',
      category: 'Vegetables',
      description: '',
      stock: 0,
      image: getDefaultProductImage('', 'Vegetables')
    });
    setIsImageManuallyEdited(false);
    setIsCameraOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
        setIsImageManuallyEdited(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      // Try to get the environment (back) camera first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
      } catch (e) {
        console.warn("Environment camera not found, falling back to default camera", e);
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have a camera connected and have given permission.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFormData({ ...formData, image: dataUrl });
        setIsImageManuallyEdited(true);
        stopCamera();
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {farmerPhoto ? (
            <img src={farmerPhoto} alt={farmerName} className="w-16 h-16 rounded-full object-cover border-2 border-brand-olive shadow-sm" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-olive/10 flex items-center justify-center text-brand-olive border-2 border-brand-olive/20">
              <span className="text-2xl font-serif font-bold">{farmerName.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="text-4xl font-serif font-bold">{t.farmDashboard}</h1>
            <p className="text-brand-ink/60">{t.manageHarvest}</p>
          </div>
        </div>
        <button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-brand-olive text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
        >
          <Plus size={20} /> {t.addNewProduct}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<DollarSign className="text-emerald-600" />} label={t.totalRevenue} value={`₹${totalRevenue.toFixed(2)}`} trend={`+12% ${t.fromLastWeek}`} />
        <StatCard icon={<ShoppingBag className="text-blue-600" />} label={t.totalOrders} value={MOCK_ORDERS.length.toString()} trend={`+5 ${t.newToday}`} />
        <StatCard icon={<Package className="text-orange-600" />} label={t.activeProducts} value={farmerProducts.length.toString()} trend={t.allInStock} />
        <StatCard icon={<TrendingUp className="text-purple-600" />} label={t.avgOrderValue} value={`₹${(totalRevenue / MOCK_ORDERS.length || 0).toFixed(2)}`} trend={t.stable} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-brand-ink/5 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">{t.weeklySales}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_SALES_DATA}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#5A5A40" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Status */}
        <div className="bg-white p-6 rounded-3xl border border-brand-ink/5 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">{t.inventoryAlerts}</h3>
          <div className="space-y-4">
            {farmerProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-brand-cream rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-brand-ink/40">{p.stock} {p.unit} remaining</p>
                  </div>
                </div>
                {p.stock < 10 ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
                    <AlertCircle size={12} /> {t.lowStock}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">{t.healthy}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-brand-ink/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-ink/5 flex justify-between items-center">
          <h3 className="text-xl font-serif font-bold">{t.yourProducts}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-cream/50 text-xs uppercase tracking-wider text-brand-ink/40">
                <th className="px-6 py-4 font-bold">{t.product}</th>
                <th className="px-6 py-4 font-bold">{t.category}</th>
                <th className="px-6 py-4 font-bold">{t.price}</th>
                <th className="px-6 py-4 font-bold">{t.stock}</th>
                <th className="px-6 py-4 font-bold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/5">
              {farmerProducts.map(product => (
                <tr key={product.id} className="hover:bg-brand-cream/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={product.image} className="w-10 h-10 rounded-lg object-cover" />
                      <span className="font-bold">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-brand-ink/60">
                    {product.category === 'Vegetables' ? t.vegetables : 
                     product.category === 'Fruits' ? t.fruits : 
                     product.category === 'Dairy' ? t.dairy : 
                     product.category === 'Grains' ? t.grains : 
                     product.category === 'Honey' ? t.honey :
                     product.category === 'Herbs' ? t.herbs : 
                     product.category}
                  </td>
                  <td className="px-6 py-4 font-bold text-brand-olive">₹{product.price.toFixed(2)}/{product.unit}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-bold",
                      product.stock < 10 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { 
                          setEditingProduct(product); 
                          setFormData(product); 
                          setIsImageManuallyEdited(true);
                          setIsAddModalOpen(true); 
                        }}
                        className="p-2 text-brand-ink/40 hover:text-brand-olive hover:bg-brand-olive/5 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-brand-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-3xl border border-brand-ink/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-ink/5">
          <h3 className="text-xl font-serif font-bold">{t.recentOrders}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-cream/50 text-xs uppercase tracking-wider text-brand-ink/40">
                <th className="px-6 py-4 font-bold">{t.orderId}</th>
                <th className="px-6 py-4 font-bold">{t.customer}</th>
                <th className="px-6 py-4 font-bold">{t.items}</th>
                <th className="px-6 py-4 font-bold">{t.total}</th>
                <th className="px-6 py-4 font-bold">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/5">
              {MOCK_ORDERS.map(order => (
                <tr key={order.id} className="hover:bg-brand-cream/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold">{order.id}</td>
                  <td className="px-6 py-4 font-medium">{order.customer}</td>
                  <td className="px-6 py-4 text-sm text-brand-ink/60">{order.items}</td>
                  <td className="px-6 py-4 font-bold">₹{order.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "flex items-center gap-1.5 text-xs font-bold uppercase",
                      order.status === 'Delivered' ? "text-emerald-600" : 
                      order.status === 'Shipped' ? "text-blue-600" :
                      order.status === 'Processing' ? "text-orange-500" :
                      "text-red-500"
                    )}>
                      {order.status === 'Delivered' && <><CheckCircle2 size={14} /> {t.delivered}</>}
                      {order.status === 'Shipped' && <><Truck size={14} /> {t.shipped}</>}
                      {order.status === 'Processing' && <><Clock size={14} /> {t.processingStatus}</>}
                      {order.status === 'Cancelled' && <><XCircle size={14} /> {t.cancelled}</>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddModalOpen(false); stopCamera(); }}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-cream rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold">{editingProduct ? t.editProduct : t.addNewProduct}</h2>
                <button onClick={() => { setIsAddModalOpen(false); stopCamera(); }} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-ink/60 uppercase tracking-wider">{t.productName}</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                      value={formData.name}
                      onChange={e => {
                        const newName = e.target.value;
                        const newFormData = { ...formData, name: newName };
                        if (!isImageManuallyEdited && newName.trim()) {
                          newFormData.image = getDefaultProductImage(newName, formData.category);
                        }
                        setFormData(newFormData);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-ink/60 uppercase tracking-wider">{t.category}</label>
                    <select 
                      className="w-full px-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                      value={formData.category}
                      onChange={e => {
                        const newCategory = e.target.value as any;
                        const newFormData = { ...formData, category: newCategory };
                        if (!isImageManuallyEdited) {
                          newFormData.image = getDefaultProductImage(formData.name, newCategory);
                        }
                        setFormData(newFormData);
                      }}
                    >
                      <option value="Vegetables">{t.vegetables}</option>
                      <option value="Fruits">{t.fruits}</option>
                      <option value="Grains">{t.grains}</option>
                      <option value="Dairy">{t.dairy}</option>
                      <option value="Honey">{t.honey}</option>
                      <option value="Herbs">{t.herbs}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-ink/60 uppercase tracking-wider">{t.pricePerUnit} (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      className="w-full px-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                      value={isNaN(formData.price || 0) ? '' : formData.price}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setFormData({...formData, price: isNaN(val) ? 0 : val});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-ink/60 uppercase tracking-wider">{t.unit}</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full px-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 appearance-none cursor-pointer"
                        value={formData.unit}
                        onChange={e => setFormData({...formData, unit: e.target.value})}
                      >
                        <option value="">Select Unit</option>
                        <option value="kg">{t.kg}</option>
                        <option value="gram">{t.gram}</option>
                        <option value="piece">{t.piece}</option>
                        <option value="bunch">{t.bunch}</option>
                        <option value="liter">{t.liter}</option>
                        <option value="box">{t.box}</option>
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-brand-ink/40 pointer-events-none" size={18} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-ink/60 uppercase tracking-wider">{t.stock}</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                      value={isNaN(formData.stock || 0) ? '' : formData.stock}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setFormData({...formData, stock: isNaN(val) ? 0 : val});
                      }}
                    />
                  </div>
                  <div className="col-span-full space-y-4">
                    <label className="text-sm font-bold text-brand-ink/60 uppercase tracking-wider">{t.productImage}</label>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-48 h-48 bg-white border-2 border-dashed border-brand-ink/10 rounded-2xl overflow-hidden relative group">
                        {isCameraOpen ? (
                          <div className="relative w-full h-full">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                              <button 
                                type="button"
                                onClick={takePhoto}
                                className="p-2 bg-brand-olive text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                title={t.takePhoto}
                              >
                                <Camera size={20} />
                              </button>
                              <button 
                                type="button"
                                onClick={stopCamera}
                                className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                title={t.cancel}
                              >
                                <X size={20} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {formData.image ? (
                              <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-brand-ink/20">
                                <ImageIcon size={48} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-brand-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                               <button 
                                 type="button"
                                 onClick={() => fileInputRef.current?.click()}
                                 className="p-2 bg-white rounded-full text-brand-ink hover:text-brand-olive transition-colors"
                                 title={t.upload}
                               >
                                 <Upload size={20} />
                               </button>
                               <button 
                                 type="button"
                                 onClick={startCamera}
                                 className="p-2 bg-white rounded-full text-brand-ink hover:text-brand-olive transition-colors"
                                 title={t.camera}
                               >
                                 <Camera size={20} />
                               </button>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <p className="text-xs text-brand-ink/40">{t.orPasteUrl}</p>
                          <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                            <input 
                              type="url" 
                              placeholder="https://example.com/image.jpg"
                              className="w-full pl-10 pr-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                              value={formData.image}
                              onChange={e => {
                                setFormData({...formData, image: e.target.value});
                                setIsImageManuallyEdited(true);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 px-4 bg-white border border-brand-ink/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-ink/5 transition-colors"
                          >
                            <Upload size={16} /> {t.upload}
                          </button>
                          <button 
                            type="button"
                            onClick={startCamera}
                            className="flex-1 py-2 px-4 bg-white border border-brand-ink/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-ink/5 transition-colors"
                          >
                            <Camera size={16} /> {t.camera}
                          </button>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleFileUpload} 
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-ink/60 uppercase tracking-wider">{t.description}</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-brand-olive text-white rounded-xl font-bold text-lg hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
                >
                  {editingProduct ? t.updateProduct : t.saveProduct}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-brand-ink/5 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-brand-cream rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-sm font-bold text-brand-ink/40 uppercase tracking-wider mb-1">{label}</p>
      <h4 className="text-3xl font-serif font-bold mb-2">{value}</h4>
      <p className="text-xs font-medium text-emerald-600">{trend}</p>
    </div>
  );
}
