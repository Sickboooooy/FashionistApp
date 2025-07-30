import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import MyCloset from "@/pages/my-closet";
import SeleneDesignsPage from "@/pages/selene-designs-page";
import Profile from "@/pages/profile";
import MagazineView from "@/pages/magazine-view";
import AIImageGeneratorPage from "@/pages/ai-image-generator";
import { TextInputModal } from "@/components/text-input-modal";
import { OutfitProvider } from "@/contexts/outfit-context";
import { PreferencesProvider } from "@/contexts/preferences-context";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/closet" component={MyCloset} />
          <Route path="/selene-designs" component={SeleneDesignsPage} />
          <Route path="/profile" component={Profile} />
          <Route path="/magazine" component={MagazineView} />
          <Route path="/ai-images" component={AIImageGeneratorPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <TextInputModal />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <OutfitProvider>
          <Router />
          <Toaster />
        </OutfitProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

export default App;
