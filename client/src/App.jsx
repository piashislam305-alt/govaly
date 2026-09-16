import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Header from './components/Header.jsx';
import SubNav from './components/SubNav.jsx';
import Footer from './components/Footer.jsx';
import { Toasts, RequireAuth } from './components/Guards.jsx';

import Home from './pages/Home.jsx';
import Listing from './pages/Listing.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import SellerPage from './pages/SellerPage.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Payment from './pages/Payment.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import Orders from './pages/Orders.jsx';
import Wishlist from './pages/Wishlist.jsx';
import { Login, Register, ForgotPassword, ResetPassword } from './pages/Auth.jsx';
import Profile from './pages/Profile.jsx';
import InfoPage from './pages/InfoPages.jsx';
import { NotFound, ServerError, ServerDown } from './pages/Errors.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function ScrollTop() {
  const { pathname, search } = useLocation();
  // block body on purpose: an implicit return would hand scrollTo's return value
  // (some preview hosts override it) to React as the effect "cleanup" → crash
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname, search]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Header />
      <SubNav />
      <main className="page">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Listing />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/seller/:slug" element={<SellerPage />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/payment" element={<RequireAuth><Payment /></RequireAuth>} />
          <Route path="/order-success/:orderId" element={<RequireAuth><OrderSuccess /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/profile/:section" element={<RequireAuth><Profile /></RequireAuth>} />
          {/* Info / policy / company pages (footer links) */}
          <Route path="/about" element={<InfoPage page="about" />} />
          <Route path="/contact" element={<InfoPage page="contact" />} />
          <Route path="/faq" element={<InfoPage page="faq" />} />
          <Route path="/returns" element={<InfoPage page="returns" />} />
          <Route path="/shipping" element={<InfoPage page="shipping" />} />
          <Route path="/terms" element={<InfoPage page="terms" />} />
          <Route path="/privacy" element={<InfoPage page="privacy" />} />
          <Route path="/report" element={<InfoPage page="report" />} />
          <Route path="/sitemap" element={<InfoPage page="sitemap" />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/500" element={<ServerError />} />
          <Route path="/502" element={<ServerDown code="502" />} />
          <Route path="/503" element={<ServerDown code="503" />} />
          <Route path="/504" element={<ServerDown code="504" />} />
          <Route path="/505" element={<ServerDown code="505" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <BottomNav />
      <Toasts />
    </>
  );
}
