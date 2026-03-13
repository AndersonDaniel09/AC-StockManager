import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getProductsByCategory } from '../services/product.service';
import SellModal from '../components/SellModal';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../store/AuthContext';

function ProductSilhouette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white/90">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 8.5 12 13l8-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProductsPage() {
  const { categoryId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const branchId = user?.role === 'ADMIN' ? (localStorage.getItem('activeBranchId') || undefined) : undefined;
    getProductsByCategory(categoryId, branchId)
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [categoryId, user?.role]);

  function handleProductSold(productId, quantitySold = 1) {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantitySold) } : p))
    );
  }

  return (
    <AppLayout
      title={state?.categoryName || 'Productos'}
      subtitle="Selecciona un producto para vender o fiar"
      actions={
        <button onClick={() => navigate('/sell')} className="ui-btn ui-btn-primary">
          Volver
        </button>
      }
    >
      {loading ? (
        <p className="text-slate-700 font-medium">Cargando productos...</p>
      ) : products.length === 0 ? (
        <p className="text-slate-700 font-medium">No hay productos en esta categoría.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 place-items-start">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              disabled={product.stock === 0}
              className={`relative rounded-2xl overflow-hidden w-full max-w-[250px] aspect-[3/4] border border-slate-300 shadow text-left transition ${
                product.stock === 0 ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-lg'
              }`}
              style={{
                backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!product.imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />}
              <div className="absolute inset-0 bg-black/40" />

              <div className="absolute top-3 left-3 ui-glass-tag">
                <ProductSilhouette />
                <span className="text-white text-xs font-semibold tracking-wide">Producto</span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="font-bold text-white text-2xl leading-tight">{product.name}</p>
                <p className="text-cyan-300 font-extrabold text-lg mt-1">${product.price.toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    product.stock <= 3 ? 'bg-rose-600/95 text-white' : 'bg-emerald-600/95 text-white'
                  }`}>
                    Stock: {product.stock}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    product.stock === 0 ? 'bg-slate-500/95 text-white' : 'bg-sky-600/95 text-white'
                  }`}>
                    {product.stock === 0 ? 'Sin stock' : 'Vender / Fiar'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal vender/fiar */}
      {selectedProduct && (
        <SellModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={(productId, quantitySold) => handleProductSold(productId, quantitySold)}
        />
      )}
    </AppLayout>
  );
}
