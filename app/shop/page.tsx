'use client';

import { useEffect, useState } from 'react';

export default function ShopPage() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('/api/products?limit=1')
      .then(res => res.json())
      .then(data => {
        setMessage(`API works: ${JSON.stringify(data)}`);
      })
      .catch(err => {
        setMessage(`API Error: ${err.message}`);
      });
  }, []);

  return (
    <div>
      <h1>Shop Page</h1>
      <p>{message}</p>
    </div>
  );
}