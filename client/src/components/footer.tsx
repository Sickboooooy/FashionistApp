import Logo from './ui/logo';
import { Link } from 'wouter';

const Footer = () => {
  return (
    <footer className="py-8 px-4 md:px-8 border-t border-amber-deep">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center justify-center md:justify-start">
              <Logo size="sm" />
            </div>
            <p className="font-cormorant text-sm mt-2 opacity-80 text-center md:text-left">
              Estilismo potenciado por IA con un toque artesanal
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6 md:mb-0">
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-sm mb-3 gold-text">NAVEGACIÓN</h3>
              <ul className="space-y-2 font-montserrat text-xs">
                <li><Link href="/" className="hover:gold-text transition-colors">Inicio</Link></li>
                <li><Link href="/closet" className="hover:gold-text transition-colors">Mi Armario</Link></li>
                <li><Link href="/anna-designs" className="hover:gold-text transition-colors">Diseños Anna</Link></li>
                <li><Link href="/profile" className="hover:gold-text transition-colors">Perfil de Estilo</Link></li>
              </ul>
            </div>
            
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-sm mb-3 gold-text">CONTACTO</h3>
              <ul className="space-y-2 font-montserrat text-xs">
                <li><a href="#" className="hover:gold-text transition-colors">Pedidos Personalizados</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Soporte</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Colaboraciones</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Prensa</a></li>
              </ul>
            </div>
            
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-sm mb-3 gold-text">LEGAL</h3>
              <ul className="space-y-2 font-montserrat text-xs">
                <li><a href="#" className="hover:gold-text transition-colors">Política de Privacidad</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Términos de Servicio</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Política de Reembolso</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Política de Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <h3 className="font-playfair text-sm mb-3 gold-text">SÍGUENOS</h3>
            <div className="flex space-x-4 justify-center md:justify-end">
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 text-amber-deep fill-current">
                  <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors" title="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-4 h-4 text-amber-deep fill-current">
                  <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors" title="Pinterest">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-4 h-4 text-amber-deep fill-current">
                  <path d="M204 6.5C101.4 6.5 0 74.9 0 185.6 0 256 39.6 296 63.6 296c9.9 0 15.6-27.6 15.6-35.4 0-9.3-23.7-29.1-23.7-67.8 0-80.4 61.2-137.4 140.4-137.4 68.1 0 118.5 38.7 118.5 109.8 0 53.1-21.3 152.7-90.3 152.7-24.9 0-46.2-18-46.2-43.8 0-37.8 26.4-74.4 26.4-113.4 0-66.2-93.9-54.2-93.9 25.8 0 16.8 2.1 35.4 9.6 50.7-13.8 59.4-42 147.9-42 209.1 0 18.9 2.7 37.5 4.5 56.4 3.4 3.8 1.7 3.4 6.9 1.5 50.4-69 48.6-82.5 71.4-172.8 12.3 23.4 44.1 36 69.3 36 106.2 0 153.9-103.5 153.9-196.8C384 71.3 298.2 6.5 204 6.5z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors" title="TikTok">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 text-amber-deep fill-current">
                  <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-amber-deep/30 text-center">
          <p className="font-montserrat text-xs opacity-60">
            &copy; {new Date().getFullYear()} FashionistApp - Anna Style. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
