import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../api/services';
import { Spinner } from '../../components/Common/UI';

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const [status,    setStatus]    = useState('loading');
  const [orderData, setOrderData] = useState(null);
  const [errMsg,    setErrMsg]    = useState('');
  const hasRun = useRef(false);

  const success     = searchParams.get('success');
  const resultCode  = searchParams.get('resultCode');
  // Chỉ lấy orderId từ URL — không dùng sessionStorage để tránh tạo đơn nhầm
  const momoOrderId = searchParams.get('orderId') || searchParams.get('momo_order_id');
  const amount      = searchParams.get('amount');
  const transId     = searchParams.get('transId') || searchParams.get('trans_id');
  const message     = searchParams.get('message');

  // Chỉ thành công khi URL có resultCode=0 hoặc success=1 rõ ràng
  const isSuccess = resultCode === '0' || success === '1';

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const verify = async () => {
      // ── HỦY / THẤT BẠI ───────────────────────────────────────────────────
      if (!isSuccess) {
        sessionStorage.removeItem('pending_momo_id');
        setStatus('cancelled');
        return;
      }

      // Phải có cả orderId lẫn transId mới là thanh toán thật
      if (!momoOrderId || !transId) {
        sessionStorage.removeItem('pending_momo_id');
        setStatus('cancelled');
        return;
      }

      try {
        const { data } = await paymentAPI.verifyReturn({
          momo_order_id: momoOrderId,
          trans_id:      transId  || '',
          amount:        amount   || '',
        });

        sessionStorage.removeItem('pending_momo_id');

        if (data.success && data.data?.status === 'paid') {
          setOrderData(data.data);
          setStatus('success');
        } else {
          setErrMsg(data.data?.momo_message || data.message || '');
          setStatus('failed');
        }
      } catch (err) {
        sessionStorage.removeItem('pending_momo_id');
        setErrMsg(err.response?.data?.message || 'Lỗi xác minh thanh toán');
        setStatus('failed');
      }
    };

    verify();
  }, []); // eslint-disable-line

  const cfgs = {
    loading: {
      icon: null,
      title: 'Đang xác nhận thanh toán...',
      color: 'text-gray-600',
      desc:  'Vui lòng chờ trong giây lát',
      bg:    '',
    },
    success: {
      icon:  '✅',
      title: 'Thanh toán thành công!',
      color: 'text-green-600',
      desc:  'Đơn hàng đã được tạo. Cảm ơn bạn đã mua sắm!',
      bg:    'bg-green-50 border-green-100',
    },
    cancelled: {
      icon:  '↩️',
      title: 'Đã hủy thanh toán',
      color: 'text-amber-600',
      desc:  'Bạn đã hủy giao dịch. Không có đơn hàng nào được tạo, giỏ hàng vẫn còn nguyên.',
      bg:    'bg-amber-50 border-amber-100',
    },
    failed: {
      icon:  '❌',
      title: 'Thanh toán thất bại',
      color: 'text-red-600',
      desc:  errMsg || (message && message !== 'null' ? message : 'Giao dịch không thành công. Vui lòng thử lại.'),
      bg:    'bg-red-50 border-red-100',
    },
  };

  const cfg = cfgs[status] || cfgs.failed;

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

            {/* Chi tiết giao dịch */}
            {(orderData?.order_id || transId || amount) && (
              <div className={`rounded-xl border p-4 mb-6 text-sm text-left space-y-2 ${cfg.bg}`}>
                {orderData?.order_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã đơn hàng</span>
                    <span className="font-mono font-semibold">#{String(orderData.order_id).slice(-10)}</span>
                  </div>
                )}
                {transId && transId !== 'null' && (
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
                <Link to="/orders"
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition block">
                  Xem đơn hàng của tôi
                </Link>
              )}
              {(status === 'cancelled' || status === 'failed') && (
                <Link to="/cart"
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition block">
                  Quay lại giỏ hàng
                </Link>
              )}
              <Link to="/"
                className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition block">
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