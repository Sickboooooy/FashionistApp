import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import Logo from './ui/logo';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { name: 'INICIO', path: '/' },
    { name: 'MI ARMARIO', path: '/closet' },
    { name: 'DISEÑOS SELENE', path: '/selene-designs' },
    { name: 'REVISTA', path: '/magazine' },
    { name: 'IMÁGENES IA', path: '/ai-images' },
    { name: 'PERFIL', path: '/profile' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="py-4 px-4 md:px-8 border-b border-amber-deep">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        
        <nav className={`
          hidden md:flex space-x-6 font-montserrat text-sm
          ${isMobileMenuOpen ? 'flex flex-col absolute top-16 right-4 bg-black z-50 p-4 rounded-lg gold-border space-y-4' : 'hidden'}
        `}>
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`
                text-cream-soft hover:gold-text transition-colors
                ${location === item.path ? 'gold-text' : ''}
              `}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
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
    </header>
  );
};

export default Navbar;
