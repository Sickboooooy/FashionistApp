import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface APIStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  activeAPIs: string[];
}

interface APIConfig {
  config: {
    replicate: { enabled: boolean; hasToken: boolean };
    gemini: { enabled: boolean; hasKey: boolean };
    openai: { enabled: boolean; hasKey: boolean };
    fallbackOrder: string[];
  };
  health: APIStatus;
  costs: { [key: string]: string };
}

const APIDebugPanel: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<APIStatus | null>(null);
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAPIStatus = async () => {
    setIsLoading(true);
    try {
      // Health check
      const healthResponse = await fetch('/api/debug/health');
      const healthData = await healthResponse.json();
      setApiStatus(healthData);

      // Config
      const configResponse = await fetch('/api/debug/config');
      const configData = await configResponse.json();
      setApiConfig(configData);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching API status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullAPITest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/test-apis', { method: 'POST' });
      const testResults = await response.json();
      
      // Mostrar resultados en consola (para desarrollo)
      console.log('🧪 API Test Results:', testResults);
      
      // Actualizar status después del test
      await fetchAPIStatus();
    } catch (error) {
      console.error('Error running API tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'critical':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-400">🔍 Panel de Debug APIs</h1>
          <p className="text-amber-200/80 mt-1">
            Monitor del estado de las APIs de generación de imágenes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchAPIStatus}
            disabled={isLoading}
            variant="outline"
            className="border-amber-600 text-amber-300"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
          <Button
            onClick={runFullAPITest}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-black"
          >
            🧪 Test Completo
          </Button>
        </div>
      </div>

      {lastUpdate && (
        <p className="text-xs text-amber-200/60">
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </p>
      )}

      {/* Status Overview */}
      {apiStatus && (
        <Card className="bg-black/50 border-amber-700/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              {getStatusIcon(apiStatus.status)}
              Estado General del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={getStatusColor(apiStatus.status)}>
              <AlertDescription>
                <strong>{apiStatus.message}</strong>
                {apiStatus.activeAPIs.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm">APIs activas: </span>
                    {apiStatus.activeAPIs.map((api, index) => (
                      <Badge key={index} variant="outline" className="ml-1 border-current">
                        {api}
                      </Badge>
                    ))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Detailed API Status */}
      {apiConfig && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Replicate */}
          <Card className="bg-black/50 border-amber-700/30">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center justify-between">
                🚀 Replicate FLUX
                <Badge 
                  variant={apiConfig.config.replicate.enabled ? "default" : "destructive"}
                  className={apiConfig.config.replicate.enabled ? "bg-green-600" : "bg-red-600"}
                >
                  {apiConfig.config.replicate.enabled ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="text-amber-200">Token: {apiConfig.config.replicate.hasToken ? "✅ Configurado" : "❌ Faltante"}</p>
                <p className="text-amber-200">Costo: {apiConfig.costs.replicate_flux_schnell}</p>
                <p className="text-green-400 font-medium">💎 RECOMENDADO - Ultra económico</p>
              </div>
              {!apiConfig.config.replicate.enabled && (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertDescription className="text-red-400 text-xs">
                    Configure REPLICATE_API_TOKEN para ahorrar 92.5% en costos
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Gemini */}
          <Card className="bg-black/50 border-amber-700/30">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center justify-between">
                🤖 Google Gemini
                <Badge 
                  variant={apiConfig.config.gemini.enabled ? "default" : "destructive"}
                  className={apiConfig.config.gemini.enabled ? "bg-green-600" : "bg-red-600"}
                >
                  {apiConfig.config.gemini.enabled ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="text-amber-200">API Key: {apiConfig.config.gemini.hasKey ? "✅ Configurado" : "❌ Faltante"}</p>
                <p className="text-amber-200">Costo: {apiConfig.costs.gemini}</p>
                <p className="text-blue-400 font-medium">🥈 RESPALDO - Confiable y rápido</p>
              </div>
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card className="bg-black/50 border-amber-700/30">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center justify-between">
                🔄 OpenAI DALL-E
                <Badge 
                  variant={apiConfig.config.openai.enabled ? "default" : "destructive"}
                  className={apiConfig.config.openai.enabled ? "bg-green-600" : "bg-red-600"}
                >
                  {apiConfig.config.openai.enabled ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="text-amber-200">API Key: {apiConfig.config.openai.hasKey ? "✅ Configurado" : "❌ Faltante"}</p>
                <p className="text-amber-200">Costo: {apiConfig.costs.openai_dalle3}</p>
                <p className="text-orange-400 font-medium">🥉 FALLBACK - Costoso pero confiable</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration Guide */}
      <Card className="bg-black/50 border-amber-700/30">
        <CardHeader>
          <CardTitle className="text-amber-300">📋 Guía de Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-amber-400 mb-2">🚀 Replicate (Prioridad 1)</h4>
              <ul className="space-y-1 text-amber-200">
                <li>• Ultra económico: $0.003/imagen</li>
                <li>• Velocidad: 2-5 segundos</li>
                <li>• Ideal para producción</li>
                <li>• <a href="https://replicate.com/account/api-tokens" className="text-blue-400 hover:underline">Obtener Token</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 mb-2">🤖 Gemini (Prioridad 2)</h4>
              <ul className="space-y-1 text-amber-200">
                <li>• Incluido en plan gratuito</li>
                <li>• Rápido y confiable</li>
                <li>• Excelente respaldo</li>
                <li>• <a href="https://aistudio.google.com/app/apikey" className="text-blue-400 hover:underline">Obtener API Key</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 mb-2">🔄 OpenAI (Prioridad 3)</h4>
              <ul className="space-y-1 text-amber-200">
                <li>• Máxima calidad</li>
                <li>• Más costoso: $0.040+/imagen</li>
                <li>• Solo fallback crítico</li>
                <li>• Requiere créditos OpenAI</li>
              </ul>
            </div>
          </div>
          
          <Separator className="bg-amber-700/30" />
          
          <div className="bg-amber-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-300 mb-2">💡 Recomendación para FashionistApp:</h4>
            <p className="text-amber-200 text-sm">
              Configure Replicate como prioridad para maximizar la rentabilidad. Con 92.5% de ahorro vs OpenAI, 
              puede procesar miles de imágenes diarias a bajo costo. Use Gemini como respaldo confiable.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables Guide */}
      <Card className="bg-black/50 border-amber-700/30">
        <CardHeader>
          <CardTitle className="text-amber-300">⚙️ Variables de Entorno Requeridas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
            <div className="text-green-400"># .env</div>
            <div className="text-amber-300">REPLICATE_API_TOKEN=r8_your_token_here</div>
            <div className="text-blue-400">GEMINI2APIKEY=your_gemini_key_here</div>
            <div className="text-orange-400">OPENAI_API_KEY=sk-your_openai_key_here</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default APIDebugPanel;