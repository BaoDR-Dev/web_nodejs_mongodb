import React, { useState } from 'react';

import { useLocation, useNavigate, Link } from 'react-router-dom';

import { orderAPI, paymentAPI, voucherAPI } from '../../../api/services';

import { Spinner, fmtVND } from '../../../components/Common/UI';

import { toast } from '../../../components/Common/Toast';

import { useCart } from '../../../context/CartContext';



export function CheckoutPage() {

  const location = useLocation();

  const navigate = useNavigate();

  const { fetchCount } = useCart();



  const selectedItems = location.state?.selectedItems || [];



  const [payMethod, setPayMethod] = useState('Cash');

  const [address,   setAddress]   = useState('');

  const [voucher,   setVoucher]   = useState('');

  const [voucherData, setVoucherData] = useState(null);

  const [checkingVoucher, setCheckingVoucher] = useState(false);

  const [ordering,  setOrdering]  = useState(false);



  // Nếu không có selectedItems (vào thẳng URL) → redirect về cart

  if (!selectedItems.length) {

    return (

      <div className="text-center py-20">

        <p className="text-4xl mb-3">🛒</p>

        <p className="text-gray-500 mb-4">Không có sản phẩm nào được chọn</p>

        <Link to="/cart" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm">Quay lại giỏ hàng</Link>

      </div>

    );

  }



  const subtotal   = selectedItems.reduce((s, i) => s + i.subtotal, 0);

  const discount   = voucherData?.discount_amount || 0;

  const finalTotal = subtotal - discount;



  const handleCheckVoucher = async () => {

    if (!voucher.trim()) return;

    setCheckingVoucher(true);

    try {

      const { data } = await voucherAPI.apply({ code: voucher.trim(), order_total: subtotal });

      setVoucherData(data.data);

      toast.success(`Giảm ${fmtVND(data.data.discount_amount)}!`);

    } catch (err) {

      setVoucherData(null);

      toast.error(err.response?.data?.message || 'Voucher không hợp lệ');

    } finally { setCheckingVoucher(false); }

  };



  const handleOrder = async () => {

    if (!address.trim()) { toast.error('Vui lòng nhập địa chỉ giao hàng'); return; }

    setOrdering(true);

    try {

      const items = selectedItems.map(i => ({

        variant_id: i.variant._id,

        quantity:   i.quantity

      }));



      const { data } = await orderAPI.create({

        items,

        payment_method:   payMethod,

        voucher_code:     voucherData ? voucher : undefined,

        shipping_address: address,

      });



      const orderId = data.data.order_id;



      if (payMethod === 'Momo') {

        const momoRes = await paymentAPI.createMomo({ order_id: orderId });

        // Lưu orderId vào sessionStorage để PaymentResultPage dùng khi cancel

        sessionStorage.setItem('pending_order_id', orderId);

        window.location.href = momoRes.data.pay_url;

      } else {

        toast.success('Đặt hàng thành công!');

        fetchCount();

        navigate('/orders');

      }

    } catch (err) {

      toast.error(err.response?.data?.message || 'Đặt hàng thất bại');

    } finally { setOrdering(false); }

  };



  return (

    <div>

      {/* Breadcrumb */}

      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">

        <Link to="/cart" className="hover:text-blue-600">Giỏ hàng</Link>

        <span>›</span>

        <span className="text-gray-700 font-medium">Thanh toán</span>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: form */}

        <div className="lg:col-span-2 space-y-4">



          {/* Địa chỉ */}

          <div className="bg-white rounded-2xl border border-gray-100 p-5">

            <h2 className="font-bold mb-3">📍 Địa chỉ giao hàng</h2>

            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}

              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"

              placeholder="Số nhà, tên đường, phường, quận, tỉnh/thành phố..." />

          </div>



          {/* Phương thức thanh toán */}

          <div className="bg-white rounded-2xl border border-gray-100 p-5">

            <h2 className="font-bold mb-3">💳 Phương thức thanh toán</h2>

            <div className="grid grid-cols-2 gap-2">

              {[

                { v: 'Cash',     icon: '💵', label: 'Tiền mặt' },

                { v: 'COD',      icon: '📦', label: 'COD (Nhận hàng trả tiền)' },

                { v: 'Transfer', icon: '🏦', label: 'Chuyển khoản' },

                { v: 'Momo',     icon: '💜', label: 'Ví MoMo' },

              ].map(m => (

                <label key={m.v}

                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${

                    payMethod === m.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'

                  }`}>

                  <input type="radio" name="pay" value={m.v} checked={payMethod === m.v}

                    onChange={() => setPayMethod(m.v)} className="accent-blue-600" />

                  <span className="text-lg">{m.icon}</span>

                  <span className="text-sm font-medium">{m.label}</span>

                </label>

              ))}

            </div>

          </div>



          {/* Voucher */}

          <div className="bg-white rounded-2xl border border-gray-100 p-5">

            <h2 className="font-bold mb-3">🎟 Mã giảm giá</h2>

            <div className="flex gap-2">

              <input value={voucher} onChange={e => setVoucher(e.target.value.toUpperCase())}

                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

                placeholder="Nhập mã voucher..." />

              <button onClick={handleCheckVoucher} disabled={checkingVoucher}

                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-60">

                {checkingVoucher ? <span className="animate-spin inline-block">⟳</span> : 'Áp dụng'}

              </button>

            </div>

            {voucherData && (

              <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-700 flex justify-between">

                <span>✓ {voucherData.description || voucher}</span>

                <span className="font-bold">-{fmtVND(voucherData.discount_amount)}</span>

              </div>

            )}

          </div>

        </div>



        {/* Right: order summary */}

        <div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20 space-y-4">

            <h2 className="font-bold">Đơn hàng ({selectedItems.length} sp)</h2>



            {/* Item list */}

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">

              {selectedItems.map(item => (

                <div key={item._id} className="flex gap-3 items-center">

                  <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">

                    {item.image_url

                      ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />

                      : <div className="w-full h-full flex items-center justify-center text-lg text-gray-200">👕</div>}

                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-medium truncate">{item.variant?.product_id?.name}</p>

                    <p className="text-xs text-gray-400">

                      {[item.variant?.color_id?.color_name, item.variant?.size_id?.size_name].filter(Boolean).join(' · ')}

                      {' · '}×{item.quantity}

                    </p>

                  </div>

                  <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{fmtVND(item.subtotal)}</span>

                </div>

              ))}

            </div>



            <div className="border-t pt-3 space-y-2 text-sm">

              <div className="flex justify-between text-gray-500">

                <span>Tạm tính</span><span>{fmtVND(subtotal)}</span>

              </div>

              {discount > 0 && (

                <div className="flex justify-between text-green-600">

                  <span>Giảm giá</span><span>-{fmtVND(discount)}</span>

                </div>

              )}

              <div className="flex justify-between font-bold text-base border-t pt-2">

                <span>Tổng cộng</span>

                <span className="text-blue-600">{fmtVND(finalTotal)}</span>

              </div>

            </div>



            <button onClick={handleOrder} disabled={ordering}

              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2">

              {ordering

                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang xử lý...</>

                : payMethod === 'Momo' ? '💜 Thanh toán qua MoMo' : '✓ Đặt hàng ngay'

              }

            </button>



            <Link to="/cart" className="block text-center text-xs text-gray-400 hover:text-blue-600">

              ← Quay lại giỏ hàng

            </Link>

          </div>

        </div>

      </div>

    </div>

  );

}