import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

export function CartDrawer() {
  const { t } = useTranslation(['checkout']);
  const { cartOpen, closeCart, items, removeItem, updateQty, totalItems, subtotalUsd } = useCart();
  const { isAuthenticated, openLoginModal } = useAuth();
  const { formatPrice } = useCurrency();
  const [, setLocation] = useLocation();

  const handleCheckout = () => {
    closeCart();
    if (!isAuthenticated) {
      openLoginModal('/checkout');
    } else {
      setLocation('/checkout');
    }
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-[90] flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={closeCart}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0A91F9]" />
                <span className="font-bold text-gray-900">{t('cartSummary.cart')}</span>
                {totalItems > 0 && <span className="bg-[#0A91F9] text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>}
              </div>
              <button onClick={closeCart} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="text-gray-500 font-medium">{t('cartSummary.empty')}</p>
                  <p className="text-gray-400 text-sm mt-1">{t('cartSummary.emptyDesc')}</p>
                  <Button onClick={closeCart} className="mt-4 bg-[#0A91F9] text-white hover:bg-[#0880de]" size="sm">
                    {t('cartSummary.searchBtn')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            item.type === 'domain' ? 'bg-blue-50 text-blue-600' :
                            item.type === 'email' ? 'bg-green-50 text-green-600' :
                            'bg-orange-50 text-orange-600'
                          }`}>{item.type === 'domain' ? t('domainType.domain') : item.type === 'email' ? t('domainType.emailPlan') : t('domainType.transfer')}</span>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-xs text-gray-500 ml-1">{item.period} yr</span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">{formatPrice(item.priceUsd * item.period * item.qty)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 font-medium">{t('summary.subtotal')}</span>
                  <span className="text-xl font-bold text-gray-900">{formatPrice(subtotalUsd)}</span>
                </div>
                <Button onClick={handleCheckout} className="w-full bg-[#0A91F9] hover:bg-[#0880de] text-white font-bold py-3 rounded-xl text-base">
                  {isAuthenticated ? t('summary.placeOrder') : t('summary.loginToCheckout')}
                </Button>
                <p className="text-center text-xs text-gray-400 mt-2">
                  {isAuthenticated ? 'Secure 256-bit SSL checkout' : 'Sign in or create a free account to proceed'}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
