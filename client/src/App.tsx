import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import MyCloset from "@/pages/my-closet";
import AnnaDesignsPage from "@/pages/anna-designs-page";
import Profile from "@/pages/profile";
import MagazineView from "@/pages/magazine-view";
import AIImageGeneratorPage from "@/pages/ai-image-generator";
import APIDebugPage from "@/pages/api-debug-page";
import { TextInputModal } from "@/components/text-input-modal";
import { OutfitProvider } from "@/contexts/outfit-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import ProductSearchPage from "@/pages/product-search";
import TripsPage from "@/pages/trips";
import PackingListsPage from "@/pages/packing-lists";
import ImmersiveExperiencePage from "@/pages/immersive-experience";
import { useState, useEffect } from "react";

// Ruta base para despliegue
const basePath = ""; // Si se despliega en una subruta, cambia esto a "/subruta"

function AppRouter() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/closet" component={MyCloset} />
          <Route path="/anna-designs" component={AnnaDesignsPage} />
          <Route path="/profile" component={Profile} />
          <Route path="/magazine" component={MagazineView} />
          <Route path="/ai-images" component={AIImageGeneratorPage} />
          <Route path="/immersive-experience" component={ImmersiveExperiencePage} />
          <Route path="/api-debug" component={APIDebugPage} />
          <Route path="/product-search" component={ProductSearchPage} />
          <Route path="/trips" component={TripsPage} />
          <Route path="/trips/:tripId/packing-lists" component={PackingListsPage} />
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
          <AppRouter />
          <Toaster />
        </OutfitProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

export default App;