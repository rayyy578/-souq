'use client';

import { useEffect, useState } from 'react';

export default function ShopPage() {
  const [apiStatus, setApiStatus] = useState('Checking API...');
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/products?limit=1')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setApiStatus('API connected successfully');
        setProducts(data.data || []);
      })
      .catch(err => {
        setApiStatus(`API Error: ${err.message}`);
      });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Shop Page</h1>
      <p className="mb-4">{apiStatus}</p>
      {products.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2">Products:</h2>
          <ul>
            {products.map((p, i) => (
              <li key={i}>
                {p.name} - {p.price_millimes} mT
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}