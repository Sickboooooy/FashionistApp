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
              AI-powered styling with an artisanal touch
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6 md:mb-0">
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-sm mb-3 gold-text">NAVIGATION</h3>
              <ul className="space-y-2 font-montserrat text-xs">
                <li><Link href="/"><a className="hover:gold-text transition-colors">Home</a></Link></li>
                <li><Link href="/closet"><a className="hover:gold-text transition-colors">My Closet</a></Link></li>
                <li><Link href="/selene-designs"><a className="hover:gold-text transition-colors">Selene Designs</a></Link></li>
                <li><Link href="/profile"><a className="hover:gold-text transition-colors">Style Profile</a></Link></li>
              </ul>
            </div>
            
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-sm mb-3 gold-text">CONTACT</h3>
              <ul className="space-y-2 font-montserrat text-xs">
                <li><a href="#" className="hover:gold-text transition-colors">Custom Orders</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Support</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Partnership</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Press Inquiries</a></li>
              </ul>
            </div>
            
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-sm mb-3 gold-text">LEGAL</h3>
              <ul className="space-y-2 font-montserrat text-xs">
                <li><a href="#" className="hover:gold-text transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Refund Policy</a></li>
                <li><a href="#" className="hover:gold-text transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <h3 className="font-playfair text-sm mb-3 gold-text">FOLLOW US</h3>
            <div className="flex space-x-4 justify-center md:justify-end">
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors">
                <i className="fab fa-pinterest-p"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-amber-deep flex items-center justify-center hover:border-gold-light transition-colors">
                <i className="fab fa-twitter"></i>
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-amber-deep/30 text-center">
          <p className="font-montserrat text-xs opacity-60">
            &copy; {new Date().getFullYear()} FashionistApp - Selene Style. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
