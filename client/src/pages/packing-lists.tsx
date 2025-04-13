import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams, Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Pencil, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { apiRequest } from '@/lib/queryClient';

// Definición de tipos
interface Trip {
  id: number;
  userId: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  season: string | null;
  activities: string[] | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface PackingList {
  id: number;
  tripId: number;
  name: string;
  isRecommended: boolean | null;
  createdAt: string;
}

interface PackingItem {
  id: number;
  packingListId: number;
  name: string;
  category: string;
  quantity: number | null;
  isPacked: boolean | null;
  isEssential: boolean | null;
  imageUrl: string | null;
  notes: string | null;
  garmentId: number | null;
  createdAt: string;
}

// Esquema de validación para el formulario de lista de equipaje
const packingListFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es obligatorio' }),
  isRecommended: z.boolean().default(false).optional(),
  tripId: z.number()
});

// Esquema de validación para el formulario de elementos
const packingItemFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es obligatorio' }),
  category: z.string().min(1, { message: 'La categoría es obligatoria' }),
  quantity: z.number().min(1).default(1),
  isPacked: z.boolean().default(false),
  isEssential: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  garmentId: z.number().nullable().optional(),
  packingListId: z.number()
});

// Componente principal de la página de listas de equipaje
export default function PackingListsPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = parseInt(params.tripId);
  const [location, setLocation] = useLocation();
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [showListDialog, setShowListDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingList, setEditingList] = useState<PackingList | null>(null);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Usuario simulado para pruebas - en una implementación real, esto vendría de un contexto de autenticación
  const currentUserId = 1;

  // Consulta para obtener el viaje
  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['/api/trips', tripId],
    queryFn: () => apiRequest('GET', `/api/trips/${tripId}`).then(res => res.json()),
    enabled: !isNaN(tripId)
  });

  // Consulta para obtener las listas de equipaje del viaje
  const { 
    data: packingLists, 
    isLoading: listsLoading,
    error: listsError
  } = useQuery({
    queryKey: ['/api/trips', tripId, 'packing-lists'],
    queryFn: () => apiRequest('GET', `/api/trips/${tripId}/packing-lists`).then(res => res.json()),
    enabled: !isNaN(tripId),
    onSuccess: (data) => {
      // Seleccionar la primera lista por defecto si no hay ninguna seleccionada
      if (data.length > 0 && !activeListId) {
        setActiveListId(data[0].id);
      }
    }
  });

  // Consulta para obtener los elementos de la lista de equipaje activa
  const { 
    data: packingItems, 
    isLoading: itemsLoading,
    error: itemsError
  } = useQuery({
    queryKey: ['/api/packing-lists', activeListId, 'items'],
    queryFn: () => apiRequest('GET', `/api/packing-lists/${activeListId}/items`).then(res => res.json()),
    enabled: activeListId !== null
  });

  // Mutación para crear una nueva lista de equipaje
  const createListMutation = useMutation({
    mutationFn: (listData: z.infer<typeof packingListFormSchema>) => {
      return apiRequest('POST', '/api/packing-lists', listData).then(res => res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "Lista creada",
        description: "La lista de equipaje ha sido creada exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'packing-lists'] });
      setActiveListId(data.id);
      setShowListDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al crear la lista de equipaje",
        variant: "destructive",
      });
    }
  });

  // Mutación para actualizar una lista de equipaje existente
  const updateListMutation = useMutation({
    mutationFn: (listData: z.infer<typeof packingListFormSchema> & { id: number }) => {
      const { id, ...data } = listData;
      return apiRequest('PUT', `/api/packing-lists/${id}`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Lista actualizada",
        description: "La lista de equipaje ha sido actualizada exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'packing-lists'] });
      setShowListDialog(false);
      setEditingList(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al actualizar la lista de equipaje",
        variant: "destructive",
      });
    }
  });

  // Mutación para eliminar una lista de equipaje
  const deleteListMutation = useMutation({
    mutationFn: (listId: number) => {
      return apiRequest('DELETE', `/api/packing-lists/${listId}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Lista eliminada",
        description: "La lista de equipaje ha sido eliminada exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'packing-lists'] });
      if (activeListId && packingLists && packingLists.length > 1) {
        // Seleccionar otra lista si hay disponibles
        const newActiveId = packingLists.find(list => list.id !== activeListId)?.id;
        setActiveListId(newActiveId || null);
      } else {
        setActiveListId(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al eliminar la lista de equipaje",
        variant: "destructive",
      });
    }
  });

  // Mutación para crear un nuevo elemento
  const createItemMutation = useMutation({
    mutationFn: (itemData: z.infer<typeof packingItemFormSchema>) => {
      return apiRequest('POST', '/api/packing-items', itemData).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Elemento añadido",
        description: "El elemento ha sido añadido exitosamente a la lista",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists', activeListId, 'items'] });
      setShowItemDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al añadir el elemento",
        variant: "destructive",
      });
    }
  });

  // Mutación para actualizar un elemento existente
  const updateItemMutation = useMutation({
    mutationFn: (itemData: z.infer<typeof packingItemFormSchema> & { id: number }) => {
      const { id, ...data } = itemData;
      return apiRequest('PUT', `/api/packing-items/${id}`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Elemento actualizado",
        description: "El elemento ha sido actualizado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists', activeListId, 'items'] });
      setShowItemDialog(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al actualizar el elemento",
        variant: "destructive",
      });
    }
  });

  // Mutación para eliminar un elemento
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => {
      return apiRequest('DELETE', `/api/packing-items/${itemId}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Elemento eliminado",
        description: "El elemento ha sido eliminado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists', activeListId, 'items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al eliminar el elemento",
        variant: "destructive",
      });
    }
  });

  // Mutación para marcar/desmarcar un elemento como empacado
  const toggleItemPackedMutation = useMutation({
    mutationFn: ({ itemId, isPacked }: { itemId: number; isPacked: boolean }) => {
      return apiRequest('PUT', `/api/packing-items/${itemId}`, { isPacked }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists', activeListId, 'items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al actualizar el estado del elemento",
        variant: "destructive",
      });
    }
  });

  // Mutación para generar una lista de equipaje recomendada
  const generatePackingListMutation = useMutation({
    mutationFn: () => {
      return apiRequest('POST', `/api/trips/${tripId}/generate-packing-list`, { userId: currentUserId }).then(res => res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "Lista generada",
        description: "Se ha generado una nueva lista de equipaje recomendada",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'packing-lists'] });
      setActiveListId(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al generar la lista de equipaje",
        variant: "destructive",
      });
    }
  });

  // Configuración del formulario de lista de equipaje
  const listForm = useForm<z.infer<typeof packingListFormSchema>>({
    resolver: zodResolver(packingListFormSchema),
    defaultValues: {
      name: '',
      isRecommended: false,
      tripId: tripId
    }
  });

  // Configuración del formulario de elemento
  const itemForm = useForm<z.infer<typeof packingItemFormSchema>>({
    resolver: zodResolver(packingItemFormSchema),
    defaultValues: {
      name: '',
      category: 'Ropa',
      quantity: 1,
      isPacked: false,
      isEssential: false,
      notes: '',
      packingListId: activeListId || 0
    }
  });

  // Actualizar el valor de packingListId en el formulario cuando cambia el activeListId
  useEffect(() => {
    if (activeListId) {
      itemForm.setValue('packingListId', activeListId);
    }
  }, [activeListId, itemForm]);

  // Función para abrir el diálogo de nueva lista
  const handleNewList = () => {
    listForm.reset({
      name: '',
      isRecommended: false,
      tripId: tripId
    });
    setEditingList(null);
    setShowListDialog(true);
  };

  // Función para abrir el diálogo de edición de lista
  const handleEditList = (list: PackingList) => {
    listForm.reset({
      name: list.name,
      isRecommended: list.isRecommended || false,
      tripId: list.tripId
    });
    setEditingList(list);
    setShowListDialog(true);
  };

  // Función para abrir el diálogo de nuevo elemento
  const handleNewItem = () => {
    if (!activeListId) {
      toast({
        title: "Error",
        description: "Primero debes seleccionar o crear una lista de equipaje",
        variant: "destructive",
      });
      return;
    }

    itemForm.reset({
      name: '',
      category: 'Ropa',
      quantity: 1,
      isPacked: false,
      isEssential: false,
      notes: '',
      packingListId: activeListId
    });
    setEditingItem(null);
    setShowItemDialog(true);
  };

  // Función para abrir el diálogo de edición de elemento
  const handleEditItem = (item: PackingItem) => {
    itemForm.reset({
      name: item.name,
      category: item.category,
      quantity: item.quantity || 1,
      isPacked: item.isPacked || false,
      isEssential: item.isEssential || false,
      notes: item.notes || '',
      imageUrl: item.imageUrl || '',
      garmentId: item.garmentId || undefined,
      packingListId: item.packingListId
    });
    setEditingItem(item);
    setShowItemDialog(true);
  };

  // Función para cambiar el estado de empacado de un elemento
  const handleToggleItemPacked = (itemId: number, currentStatus: boolean | null) => {
    toggleItemPackedMutation.mutate({
      itemId,
      isPacked: !(currentStatus || false)
    });
  };

  // Manejar el envío del formulario de lista
  const onListSubmit = (data: z.infer<typeof packingListFormSchema>) => {
    if (editingList) {
      updateListMutation.mutate({ ...data, id: editingList.id });
    } else {
      createListMutation.mutate(data);
    }
  };

  // Manejar el envío del formulario de elemento
  const onItemSubmit = (data: z.infer<typeof packingItemFormSchema>) => {
    if (editingItem) {
      updateItemMutation.mutate({ ...data, id: editingItem.id });
    } else {
      createItemMutation.mutate(data);
    }
  };

  // Función para manejar la eliminación de una lista
  const handleDeleteList = (listId: number) => {
    if (confirm('¿Estás seguro de eliminar esta lista? También se eliminarán todos sus elementos. Esta acción no se puede deshacer.')) {
      deleteListMutation.mutate(listId);
    }
  };

  // Función para manejar la eliminación de un elemento
  const handleDeleteItem = (itemId: number) => {
    if (confirm('¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  // Función para volver a la página de viajes
  const handleBackToTrips = () => {
    setLocation('/trips');
  };

  // Función para generar una lista de equipaje recomendada
  const handleGeneratePackingList = () => {
    generatePackingListMutation.mutate();
  };

  // Obtener categorías únicas para el filtro
  const uniqueCategories = packingItems ? 
    Array.from(new Set(packingItems.map(item => item.category))) : 
    [];

  // Filtrar elementos por categoría
  const filteredItems = categoryFilter 
    ? packingItems?.filter(item => item.category === categoryFilter) 
    : packingItems;

  // Calcular progreso de empacado
  const packedCount = packingItems?.filter(item => item.isPacked).length || 0;
  const totalItems = packingItems?.length || 0;
  const packingProgress = totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

  // Ordenar elementos: primeros los no empacados, luego esenciales primero
  const sortedItems = filteredItems?.sort((a, b) => {
    // Primero ordenar por estado empacado
    if ((a.isPacked || false) === (b.isPacked || false)) {
      // Si ambos tienen el mismo estado, ordenar por esencial (los esenciales primero)
      if ((a.isEssential || false) === (b.isEssential || false)) {
        // Si ambos son igualmente esenciales, ordenar por nombre
        return a.name.localeCompare(b.name);
      }
      return (b.isEssential || false) ? 1 : -1;
    }
    return (a.isPacked || false) ? 1 : -1;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-2" onClick={handleBackToTrips}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-playfair text-3xl gold-text">
              {tripLoading ? 'Cargando...' : `Equipaje para ${trip?.name}`}
            </h1>
            <p className="text-cream-soft/80 mt-2">
              {tripLoading ? '' : `Destino: ${trip?.destination}`}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleGeneratePackingList}>
            <RefreshCw className="mr-2 h-4 w-4" /> Generar Recomendación
          </Button>
          <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleNewList}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Lista
          </Button>
        </div>
      </div>

      {listsLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-deep border-r-transparent align-[-0.125em]" role="status">
            <span className="sr-only">Cargando...</span>
          </div>
          <p className="mt-4 text-cream-soft/70">Cargando listas de equipaje...</p>
        </div>
      ) : listsError ? (
        <div className="text-center py-12">
          <p className="text-red-400">Error al cargar las listas de equipaje. Por favor, intenta de nuevo.</p>
        </div>
      ) : packingLists?.length === 0 ? (
        <div className="text-center py-12 bg-black-elegant rounded-lg border border-amber-deep/20 px-4">
          <p className="text-lg text-cream-soft/70 mb-4">
            Aún no tienes listas de equipaje para este viaje
          </p>
          <div className="flex justify-center space-x-4">
            <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleNewList}>
              <PlusCircle className="mr-2 h-4 w-4" /> Crear lista manualmente
            </Button>
            <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleGeneratePackingList}>
              <RefreshCw className="mr-2 h-4 w-4" /> Generar lista automáticamente
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sección de listas de equipaje */}
          <div className="lg:col-span-1">
            <div className="bg-black-elegant rounded-lg border border-amber-deep/30 p-4">
              <h2 className="font-playfair text-xl gold-text mb-4">Mis Listas</h2>
              <div className="space-y-2">
                {packingLists?.map((list) => (
                  <div 
                    key={list.id} 
                    className={`p-3 rounded-md cursor-pointer transition-all ${
                      activeListId === list.id 
                        ? 'bg-amber-deep/20 border border-amber-deep/50' 
                        : 'hover:bg-black-elegant/50 border border-transparent'
                    }`}
                    onClick={() => setActiveListId(list.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-cream-soft">{list.name}</h3>
                        {list.isRecommended && (
                          <Badge variant="outline" className="mt-1 bg-amber-deep/10 text-amber-300 border-amber-500/50">
                            Recomendada
                          </Badge>
                        )}
                      </div>
                      {activeListId === list.id && (
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditList(list);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-cream-soft/70" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100/10" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteList(list.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sección de elementos de la lista activa */}
          <div className="lg:col-span-3">
            {activeListId ? (
              <div className="bg-black-elegant rounded-lg border border-amber-deep/30 p-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="font-playfair text-xl gold-text">
                      {packingLists?.find(list => list.id === activeListId)?.name || 'Lista de equipaje'}
                    </h2>
                    <div className="mt-2 w-full bg-gray-900 rounded-full h-2.5">
                      <div 
                        className="bg-amber-deep h-2.5 rounded-full" 
                        style={{ width: `${packingProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-cream-soft/70 mt-2">
                      {packedCount} de {totalItems} elementos empacados ({packingProgress}%)
                    </p>
                  </div>
                  <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleNewItem}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Elemento
                  </Button>
                </div>

                {/* Filtros por categoría */}
                <div className="mb-6">
                  <h3 className="text-cream-soft/90 mb-2 text-sm font-medium">Filtrar por categoría</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={categoryFilter === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(null)}
                      className={categoryFilter === null ? "bg-amber-deep hover:bg-amber-deep/90" : ""}
                    >
                      Todos
                    </Button>
                    {uniqueCategories.map(category => (
                      <Button 
                        key={category}
                        variant={categoryFilter === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategoryFilter(category)}
                        className={categoryFilter === category ? "bg-amber-deep hover:bg-amber-deep/90" : ""}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator className="my-4 bg-amber-deep/30" />

                {/* Lista de elementos */}
                {itemsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-amber-deep border-r-transparent align-[-0.125em]" role="status">
                      <span className="sr-only">Cargando...</span>
                    </div>
                    <p className="mt-4 text-cream-soft/70">Cargando elementos...</p>
                  </div>
                ) : itemsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-400">Error al cargar los elementos. Por favor, intenta de nuevo.</p>
                  </div>
                ) : sortedItems?.length === 0 ? (
                  <div className="text-center py-8 bg-black/20 rounded-lg">
                    <p className="text-cream-soft/70 mb-4">
                      {categoryFilter 
                        ? `No hay elementos en la categoría ${categoryFilter}` 
                        : 'Esta lista aún no tiene elementos'}
                    </p>
                    <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleNewItem}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir elemento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedItems?.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-md border transition-all ${
                          item.isPacked 
                            ? 'bg-black/20 border-gray-800/50 opacity-60' 
                            : item.isEssential
                              ? 'bg-amber-deep/10 border-amber-deep/30'
                              : 'bg-black/10 border-gray-700/30'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="mr-3">
                            <Checkbox 
                              id={`packed-${item.id}`} 
                              checked={item.isPacked || false}
                              onCheckedChange={() => handleToggleItemPacked(item.id, item.isPacked)}
                              className="border-amber-deep data-[state=checked]:bg-amber-deep data-[state=checked]:text-black"
                            />
                          </div>
                          <div className="flex-grow">
                            <div className={`text-lg ${item.isPacked ? 'line-through text-cream-soft/50' : 'text-cream-soft'}`}>
                              {item.name}
                              {item.quantity && item.quantity > 1 && (
                                <span className="ml-2 text-cream-soft/70 text-sm">
                                  x{item.quantity}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center mt-1">
                              <Badge variant="outline" className="mr-2 bg-black/30 text-cream-soft/70 border-gray-700/50">
                                {item.category}
                              </Badge>
                              {item.isEssential && (
                                <Badge variant="outline" className="bg-amber-deep/10 text-amber-300 border-amber-500/50">
                                  Esencial
                                </Badge>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-sm text-cream-soft/60 mt-1">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0" 
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4 text-cream-soft/70" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100/10" 
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-black-elegant rounded-lg border border-amber-deep/30 p-8 text-center">
                <p className="text-cream-soft/70 mb-4">
                  Selecciona una lista de equipaje o crea una nueva para comenzar
                </p>
                <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleNewList}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Lista
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diálogo para crear/editar lista */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent className="bg-black-elegant border-amber-deep/50 text-cream-soft sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-playfair gold-text text-xl">
              {editingList ? 'Editar Lista de Equipaje' : 'Nueva Lista de Equipaje'}
            </DialogTitle>
            <DialogDescription className="text-cream-soft/70">
              {editingList ? 'Modifica los detalles de tu lista' : 'Crea una nueva lista de equipaje para tu viaje'}
            </DialogDescription>
          </DialogHeader>

          <Form {...listForm}>
            <form onSubmit={listForm.handleSubmit(onListSubmit)} className="space-y-6">
              <FormField
                control={listForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">Nombre de la lista</FormLabel>
                    <FormControl>
                      <Input placeholder="Lista principal" {...field} className="bg-black border-amber-deep/30 text-cream-soft" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={listForm.control}
                name="isRecommended"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-amber-deep data-[state=checked]:bg-amber-deep data-[state=checked]:text-black"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-cream-soft">
                        Marcar como lista recomendada
                      </FormLabel>
                      <FormDescription className="text-cream-soft/60">
                        Las listas recomendadas son las generadas por el sistema o preferidas por ti
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowListDialog(false)}
                  className="border-amber-deep/50 text-cream-soft"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-amber-deep hover:bg-amber-deep/90">
                  {editingList ? 'Guardar cambios' : 'Crear lista'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para crear/editar elemento */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="bg-black-elegant border-amber-deep/50 text-cream-soft sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-playfair gold-text text-xl">
              {editingItem ? 'Editar Elemento' : 'Nuevo Elemento'}
            </DialogTitle>
            <DialogDescription className="text-cream-soft/70">
              {editingItem ? 'Modifica los detalles del elemento' : 'Añade un nuevo elemento a tu lista de equipaje'}
            </DialogDescription>
          </DialogHeader>

          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-6">
              <FormField
                control={itemForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">Nombre del elemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Camiseta" {...field} className="bg-black border-amber-deep/30 text-cream-soft" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={itemForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cream-soft">Categoría</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-black border-amber-deep/30 text-cream-soft">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-black-elegant border-amber-deep/30 text-cream-soft">
                          <SelectItem value="Ropa">Ropa</SelectItem>
                          <SelectItem value="Calzado">Calzado</SelectItem>
                          <SelectItem value="Accesorios">Accesorios</SelectItem>
                          <SelectItem value="Higiene">Higiene</SelectItem>
                          <SelectItem value="Electrónicos">Electrónicos</SelectItem>
                          <SelectItem value="Documentos">Documentos</SelectItem>
                          <SelectItem value="Otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-cream-soft">Cantidad</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          {...field} 
                          className="bg-black border-amber-deep/30 text-cream-soft"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex space-x-6">
                <FormField
                  control={itemForm.control}
                  name="isEssential"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-amber-deep data-[state=checked]:bg-amber-deep data-[state=checked]:text-black"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-cream-soft">
                          Elemento esencial
                        </FormLabel>
                        <FormDescription className="text-cream-soft/60">
                          Marcar como imprescindible
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="isPacked"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-amber-deep data-[state=checked]:bg-amber-deep data-[state=checked]:text-black"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-cream-soft">
                          Ya empacado
                        </FormLabel>
                        <FormDescription className="text-cream-soft/60">
                          Marcar como empacado
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={itemForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">Notas</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        className="w-full min-h-[80px] p-3 rounded-md bg-black border-amber-deep/30 text-cream-soft"
                        placeholder="Notas adicionales..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowItemDialog(false)}
                  className="border-amber-deep/50 text-cream-soft"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-amber-deep hover:bg-amber-deep/90">
                  {editingItem ? 'Guardar cambios' : 'Añadir elemento'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}