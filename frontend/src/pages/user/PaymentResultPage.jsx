import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentAPI, orderAPI } from '../../../api/services';
import { Spinner } from '../../../components/Common/UI';

export function PaymentResultPage() {
  const [searchParams]            = useSearchParams();
  const [status, setStatus]       = useState('loading');
  const [orderData, setOrderData] = useState(null);
  const pollingRef   = useRef(null);
  const cancelledRef = useRef(false);

  const success = searchParams.get('success');
  const amount  = searchParams.get('amount');
  const transId = searchParams.get('trans_id');
  const message = searchParams.get('message');
  const orderId = searchParams.get('order_id') || sessionStorage.getItem('pending_order_id');

  const cancelOrder = async (id) => {
    if (!id || cancelledRef.current) return;
    cancelledRef.current = true;
    try {
      await orderAPI.cancelMine(id); // PATCH /orders/:id/cancel — Customer được phép
    } catch (e) {
      console.warn('[PaymentResult] cancel failed:', e?.response?.data?.message || e.message);
    }
    sessionStorage.removeItem('pending_order_id');
  };

  useEffect(() => {
    const verify = async () => {
      // ── HỦY / THẤT BẠI ──────────────────────────────────────────────────
      if (success === '0' || !success) {
        await cancelOrder(orderId);
        setStatus('cancelled');
        return;
      }

      // ── SUCCESS=1 — verify lại từ server ─────────────────────────────────
      if (!orderId) { setStatus('failed'); return; }

      let attempts = 0;
      const poll = async () => {
        attempts++;
        try {
          const { data } = await paymentAPI.checkStatus(orderId);
          const ps = data?.data?.payment_status;

          if (ps === 'paid') {
            clearInterval(pollingRef.current);
            sessionStorage.removeItem('pending_order_id');
            setOrderData(data.data);
            setStatus('success');
          } else if (attempts >= 6) {
            // Sau ~12 giây không thấy IPN → hủy đơn
            clearInterval(pollingRef.current);
            await cancelOrder(orderId);
            setStatus('failed');
          }
          // ps === 'pending' và chưa hết lần → tiếp tục poll
        } catch {
          clearInterval(pollingRef.current);
          setStatus('failed');
        }
      };

      await poll();
      pollingRef.current = setInterval(poll, 2000);
    };

    verify();
    return () => clearInterval(pollingRef.current);
  }, []); // eslint-disable-line

  const cfgs = {
    loading:   { icon: null, title: 'Đang xác nhận thanh toán...', color: 'text-gray-600',  desc: 'Vui lòng chờ trong giây lát', bg: '' },
    success:   { icon: '✅', title: 'Thanh toán thành công!',      color: 'text-green-600', desc: 'Đơn hàng đã được xác nhận. Cảm ơn bạn đã mua sắm!',         bg: 'bg-green-50 border-green-100' },
    cancelled: { icon: '↩️', title: 'Đã hủy thanh toán',          color: 'text-amber-600', desc: 'Giao dịch bị hủy. Đơn hàng đã được hoàn lại, giỏ hàng giữ nguyên.', bg: 'bg-amber-50 border-amber-100' },
    failed:    { icon: '❌', title: 'Thanh toán thất bại',         color: 'text-red-600',   desc: (message && message !== 'null') ? message : 'Giao dịch không thành công. Vui lòng thử lại.', bg: 'bg-red-50 border-red-100' },
  };

  const cfg = cfgs[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">
        {status === 'loading' ? (
          <>
            <div className="flex justify-center mb-4"><Spinner size="lg" /></div>
            <h1 className="text-xl font-semibold text-gray-700 mb-2">{cfg.title}</h1>
            <p className="text-sm text-gray-400">{cfg.desc}</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">{cfg.icon}</div>
            <h1 className={`text-2xl font-bold mb-2 ${cfg.color}`}>{cfg.title}</h1>
            <p className="text-gray-500 text-sm mb-6">{cfg.desc}</p>

            {/* Transaction details */}
            {(orderId || transId || amount) && (
              <div className={`rounded-xl border p-4 mb-6 text-sm text-left space-y-2 ${cfg.bg}`}>
                {orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã đơn hàng</span>
                    <span className="font-mono font-semibold">#{orderId.slice(-10)}</span>
                  </div>
                )}
                {transId && transId !== 'null' && transId !== '' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã GD MoMo</span>
                    <span className="font-mono text-xs">{transId}</span>
                  </div>
                )}
                {amount && amount !== '0' && amount !== 'null' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số tiền</span>
                    <span className="font-bold">{Number(amount).toLocaleString('vi-VN')}₫</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {status === 'success' && (
                <Link to="/orders" className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition block">
                  Xem đơn hàng của tôi
                </Link>
              )}
              {(status === 'cancelled' || status === 'failed') && (
                <Link to="/cart" className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition block">
                  Quay lại giỏ hàng
                </Link>
              )}
              <Link to="/" className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition block">
                Về trang chủ
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentResultPage;