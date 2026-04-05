import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { toast } from '../../components/Common/Toast';

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Cảm ơn bạn! Chúng tôi đã nhận được tin nhắn và sẽ phản hồi sớm nhất.');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">Liên hệ với chúng tôi</h1>
        <p className="text-gray-500">Mọi thắc mắc của bạn đều là động lực để Monalis phát triển tốt hơn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Thông tin liên hệ */}
        <div className="space-y-8">
          <h2 className="text-xl font-bold mb-6">Thông tin cửa hàng</h2>
          
          <div className="flex items-start gap-4">
            <MapPin className="text-blue-600 mt-1" />
            <div>
              <h4 className="font-bold">Địa chỉ</h4>
              <p className="text-gray-600 text-sm">Tầng 6, Toà nhà Ladeco, 266 Đội Cấn, Ba Đình, Hà Nội</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Phone className="text-blue-600 mt-1" />
            <div>
              <h4 className="font-bold">Hotline</h4>
              <p className="text-gray-600 text-sm">1900 6750 (Hỗ trợ 24/7)</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Mail className="text-blue-600 mt-1" />
            <div>
              <h4 className="font-bold">Email</h4>
              <p className="text-gray-600 text-sm">contact@monalis-fashion.vn</p>
            </div>
          </div>

          {/* Bản đồ ảo */}
          <div className="mt-8 rounded-2xl overflow-hidden border border-gray-100 shadow-sm w-full">
  <iframe 
    src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d2020.7191869675821!2d106.78219136418056!3d10.8555218267065!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1zdGjhu6cgxJHhu6ljIGPDtG5nIG5naOG7hyBjYW8!5e1!3m2!1svi!2s!4v1775374960532!5m2!1svi!2s" 
    width="100%" 
    height="300" 
    style={{ border: 0 }} 
    allowFullScreen="" 
    loading="lazy" 
    referrerPolicy="no-referrer-when-downgrade"
  ></iframe>
</div>
        </div>

        {/* Form liên hệ */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Gửi yêu cầu cho chúng tôi</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Họ tên của bạn" required className="w-full p-3 border rounded-xl text-sm" 
                     value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input type="email" placeholder="Email" required className="w-full p-3 border rounded-xl text-sm"
                     value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <input type="text" placeholder="Tiêu đề yêu cầu" required className="w-full p-3 border rounded-xl text-sm"
                   value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
            <textarea placeholder="Nội dung" required className="w-full p-3 border rounded-xl text-sm h-32"
                   value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
            
            <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2">
              <Send size={16} /> Gửi tin nhắn
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}