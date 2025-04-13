import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import Logo from './ui/logo';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { name: 'INICIO', path: '/', icon: 'fa-home' },
    { name: 'ARMARIO', path: '/closet', icon: 'fa-tshirt' },
    { name: 'DISEÑOS', path: '/selene-designs', icon: 'fa-paint-brush' },
    { name: 'REVISTA', path: '/magazine', icon: 'fa-book-open' },
    { name: 'IA', path: '/ai-images', icon: 'fa-magic' },
    { name: 'PRODUCTOS', path: '/product-search', icon: 'fa-shopping-bag' },
    { name: 'VIAJES', path: '/trips', icon: 'fa-plane' },
    { name: 'PERFIL', path: '/profile', icon: 'fa-user' },
  ];

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
    <header className="py-3 px-4 md:px-8 border-b border-amber-deep/30 backdrop-blur-sm bg-black/80 fixed w-full top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        
        {/* Menú desktop */}
        <nav className="hidden md:flex space-x-6 font-montserrat text-xs tracking-wider">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`
                text-cream-soft/90 hover:gold-text transition-colors py-1 relative
                ${location === item.path ? 'gold-text after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-amber-deep' : ''}
              `}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* Botón de menú móvil */}
        <div className="md:hidden">
          <button
            className="text-cream-soft focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Alternar menú de navegación"
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
      </div>
      
      {/* Menú móvil desplegable */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/95 backdrop-blur-sm z-40 pt-20 px-4 flex flex-col">
          <nav className="flex flex-col space-y-4 font-montserrat text-sm">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={handleNavigation}
                className={`
                  text-cream-soft/90 hover:gold-text transition-all p-3 flex items-center border-b border-amber-deep/10
                  ${location === item.path ? 'gold-text bg-amber-deep/5 rounded-md' : ''}
                `}
              >
                <i className={`fas ${item.icon} mr-3 w-6 text-center ${location === item.path ? 'text-amber-deep' : 'text-amber-deep/60'}`}></i>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
