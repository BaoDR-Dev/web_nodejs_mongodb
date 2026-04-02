import { useState, useCallback } from 'react';
import { toast } from '../components/Common/Toast';

export const useApi = (apiFn, opts = {}) => {
  const [data, setData]       = useState(opts.initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      const result = res.data;
      setData(result);
      return result;
    } catch (err) {
      const msg = err.response?.data?.message || 'Đã có lỗi xảy ra';
      setError(msg);
      if (opts.toast !== false) toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute, setData };
};

export const usePagination = (apiFn) => {
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const fetch = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await apiFn({ page, limit, ...params });
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [page]);

  return { items, total, page, setPage, loading, fetch, setItems, limit };
};
