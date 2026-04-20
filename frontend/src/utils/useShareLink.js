// src/utils/useShareLink.js
// Reads ?product=<id> from the URL on page load.
// Call this hook in HomePage; it returns the product to auto-open.
//
// Usage:
//   const sharedProductId = useShareLink();
//   useEffect(() => {
//     if (sharedProductId && products.length) {
//       const p = products.find(x => x.product_id === sharedProductId);
//       if (p) openProduct(p);
//     }
//   }, [sharedProductId, products]);

import { useMemo } from 'react';

export default function useShareLink() {
  return useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id     = params.get('product');
      return id ? Number(id) : null;
    } catch {
      return null;
    }
  }, []); // runs once on mount
}