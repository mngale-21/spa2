"use client";
import { useEffect, useState } from "react";

export default function RevenuePage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data) => {
        setPayments(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mapato (Revenue Management)</h1>
      <p className="text-sm text-gray-500 mb-4">
        Jumla ya malipo yaliyorekodiwa: <strong>{total.toLocaleString()} TZS</strong>
      </p>

      <div className="card overflow-x-auto">
        {loading ? (
          <p>Inapakia...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Kampuni</th>
                <th>Kiasi</th>
                <th>Njia</th>
                <th>Reference</th>
                <th>Tarehe ya Malipo</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.companyName}</td>
                  <td>{Number(p.amount).toLocaleString()} {p.currency}</td>
                  <td>{p.method}</td>
                  <td>{p.reference || "-"}</td>
                  <td>{new Date(p.paidAt).toLocaleString()}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-6">
                    Hakuna malipo yaliyorekodiwa bado. Nenda kwenye ukurasa wa "Edit" wa kampuni ili
                    kurekodi malipo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
