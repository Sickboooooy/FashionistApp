import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import Logo from './ui/logo';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { name: 'INICIO', path: '/', icon: 'fa-home' },
    { name: 'ARMARIO', path: '/closet', icon: 'fa-tshirt' },
    { name: 'DISEÑOS', path: '/anna-designs', icon: 'fa-paint-brush' },
    { name: 'REVISTA', path: '/magazine', icon: 'fa-book-open' },
    { name: 'IA', path: '/ai-images', icon: 'fa-magic' },
    { name: 'PROBADOR', path: '/probador', icon: 'fa-vest' },
    { name: 'PRODUCTOS', path: '/product-search', icon: 'fa-shopping-bag' },
    { name: 'VIAJES', path: '/trips', icon: 'fa-plane' },
    { name: 'PERFIL', path: '/profile', icon: 'fa-user' },
  ];

  // Agregar debug en desarrollo
  const isDevelopment = import.meta.env.DEV;
  if (isDevelopment) {
    navItems.push({ name: 'DEBUG', path: '/api-debug', icon: 'fa-cog' });
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    
    if (!isMobileMenuOpen) {
      // Al abrir el menú, bloquear scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Al cerrar el menú, restaurar scroll
      document.body.style.overflow = 'auto';
    }
  };
  
  // Cerrar menú móvil al cambiar de ruta
  const handleNavigation = () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      document.body.style.overflow = 'auto';
    }
  };

  return (
    <header className="glass-nav glass-sheen fixed top-3 inset-x-3 md:top-4 md:inset-x-6 z-50 py-2.5 px-4 md:px-6 rounded-2xl border border-amber-deep/30 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7)]">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="rounded-md">
            <Logo />
          </Link>
        </div>

        {/* Menú desktop */}
        <nav className="hidden md:flex items-center gap-1 font-montserrat text-xs tracking-wider">
          {navItems.map((item) => {
            const active = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                aria-current={active ? 'page' : undefined}
                className={`
                  px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
                  ${active
                    ? 'gold-text bg-amber-deep/10 ring-1 ring-amber-deep/30'
                    : 'text-cream-soft/80 hover:text-cream-soft hover:bg-amber-deep/[0.07]'}
                `}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Botón de menú móvil */}
        <div className="md:hidden">
          <button
            className="flex items-center justify-center w-11 h-11 -mr-1 rounded-lg text-cream-soft hover:bg-amber-deep/10 transition-colors cursor-pointer"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
          >
            <i className={`fas text-lg ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
      </div>
      
      {/* Menú móvil desplegable */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav"
          className="md:hidden fixed inset-0 bg-black/95 backdrop-blur-md z-40 pt-24 px-4 flex flex-col"
        >
          <nav className="flex flex-col space-y-1.5 font-montserrat text-sm">
            {navItems.map((item) => {
              const active = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={handleNavigation}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    min-h-[44px] p-3 flex items-center rounded-lg transition-all cursor-pointer
                    ${active
                      ? 'gold-text bg-amber-deep/10 ring-1 ring-amber-deep/20'
                      : 'text-cream-soft/90 hover:text-cream-soft hover:bg-amber-deep/[0.07]'}
                  `}
                >
                  <i className={`fas ${item.icon} mr-3 w-6 text-center ${active ? 'text-amber-deep' : 'text-amber-deep/60'}`}></i>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
