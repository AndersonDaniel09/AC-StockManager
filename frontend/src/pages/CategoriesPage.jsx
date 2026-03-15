import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../services/category.service';
import AppLayout from '../components/AppLayout';

const PROTECTED_FREE_SALE_CATEGORY_NAME = 'venta de varios productos';

function getCategoryPalette(name = '') {
  const key = name.toLowerCase();
  if (key.includes('bebida')) {
    return { bg: 'from-cyan-700 to-blue-800', chip: 'bg-cyan-500/90', border: 'border-cyan-400/40' };
  }
  if (key.includes('dulce')) {
    return { bg: 'from-fuchsia-700 to-rose-800', chip: 'bg-fuchsia-500/90', border: 'border-fuchsia-400/40' };
  }
  if (key.includes('mecato') || key.includes('snack')) {
    return { bg: 'from-amber-600 to-orange-700', chip: 'bg-amber-500/90', border: 'border-amber-300/40' };
  }
  return { bg: 'from-slate-700 to-slate-900', chip: 'bg-sky-600/90', border: 'border-slate-300/30' };
}

function CategorySilhouette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white/90">
      <path d="M8 3h8l-1 4v3.5a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V7L8 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 20h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .finally(() => setLoading(false));
  }, []);

  const freeSaleCategory = categories.find(
    (category) => String(category?.name || '').trim().toLowerCase() === PROTECTED_FREE_SALE_CATEGORY_NAME
  );

  const regularCategories = categories.filter(
    (category) => String(category?.name || '').trim().toLowerCase() !== PROTECTED_FREE_SALE_CATEGORY_NAME
  );

  return (
    <AppLayout title="Panel principal" subtitle="Selecciona una categoría para vender o fiar">
      {loading ? (
        <p className="text-slate-700 font-medium">Cargando categorías...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <button
            onClick={() => navigate('/sell/free')}
            className="relative rounded-2xl overflow-hidden h-48 border border-sky-300/60 shadow text-left transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              backgroundImage: freeSaleCategory?.imageUrl ? `url(${freeSaleCategory.imageUrl})` : undefined,
              backgroundColor: freeSaleCategory?.imageUrl ? undefined : '#0f172a',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!freeSaleCategory?.imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-sky-700 to-blue-900" />}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute top-3 left-3 ui-glass-tag">
              <CategorySilhouette />
              <span className="text-white text-xs font-semibold tracking-wide">Venta especial</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/75 to-transparent">
              <p className="text-white text-xl font-bold tracking-wide">Venta de varios productos</p>
              <span className="inline-flex mt-2 bg-sky-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Diferentes categorías
              </span>
            </div>
          </button>

          {regularCategories.map((cat) => (
            (() => {
              const palette = getCategoryPalette(cat.name);
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/products/${cat.id}`, { state: { categoryName: cat.name } })}
                  className={`relative rounded-2xl overflow-hidden h-48 border ${palette.border} shadow bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg`}
                  style={{
                    backgroundImage: cat.imageUrl ? `url(${cat.imageUrl})` : undefined,
                    backgroundColor: cat.imageUrl ? undefined : '#0f172a',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!cat.imageUrl && <div className={`absolute inset-0 bg-gradient-to-br ${palette.bg}`} />}
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute top-3 left-3 ui-glass-tag">
                    <CategorySilhouette />
                    <span className="text-white text-xs font-semibold tracking-wide">Categoría</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/75 to-transparent">
                    <p className="text-white text-xl font-bold tracking-wide">{cat.name}</p>
                    <span className={`inline-flex mt-2 ${palette.chip} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                      Ver productos
                    </span>
                  </div>
                </button>
              );
            })()
          ))}
        </div>
      )}
    </AppLayout>
  );
}
