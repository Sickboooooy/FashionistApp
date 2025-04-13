import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, PlusCircle, Trash2, Pencil, Package } from 'lucide-react';
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

// Esquema de validación para el formulario de viaje
const tripFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es obligatorio' }),
  destination: z.string().min(1, { message: 'El destino es obligatorio' }),
  startDate: z.date({ required_error: 'La fecha de inicio es obligatoria' }),
  endDate: z.date({ required_error: 'La fecha de fin es obligatoria' }),
  season: z.string().nullable().optional(),
  activities: z.array(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  userId: z.number()
}).refine(data => {
  return data.endDate >= data.startDate;
}, {
  message: "La fecha de finalización debe ser posterior a la fecha de inicio",
  path: ["endDate"]
});

// Componente principal de la página de viajes
export default function TripsPage() {
  const [location, setLocation] = useLocation();
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Usuario simulado para pruebas - en una implementación real, esto vendría de un contexto de autenticación
  const currentUserId = 1;

  // Consulta para obtener los viajes del usuario
  const { data: trips, isLoading, error } = useQuery({
    queryKey: ['/api/users', currentUserId, 'trips'],
    queryFn: () => apiRequest('GET', `/api/users/${currentUserId}/trips`).then(res => res.json())
  });

  // Mutación para crear un nuevo viaje
  const createTripMutation = useMutation({
    mutationFn: (tripData: z.infer<typeof tripFormSchema>) => {
      return apiRequest('POST', '/api/trips', tripData).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Viaje creado",
        description: "El viaje ha sido creado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'trips'] });
      setShowTripDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al crear el viaje",
        variant: "destructive",
      });
    }
  });

  // Mutación para actualizar un viaje existente
  const updateTripMutation = useMutation({
    mutationFn: (tripData: z.infer<typeof tripFormSchema> & { id: number }) => {
      const { id, ...data } = tripData;
      return apiRequest('PUT', `/api/trips/${id}`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Viaje actualizado",
        description: "El viaje ha sido actualizado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'trips'] });
      setShowTripDialog(false);
      setEditingTrip(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al actualizar el viaje",
        variant: "destructive",
      });
    }
  });

  // Mutación para eliminar un viaje
  const deleteTripMutation = useMutation({
    mutationFn: (tripId: number) => {
      return apiRequest('DELETE', `/api/trips/${tripId}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Viaje eliminado",
        description: "El viaje ha sido eliminado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'trips'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al eliminar el viaje",
        variant: "destructive",
      });
    }
  });

  // Configuración del formulario
  const form = useForm<z.infer<typeof tripFormSchema>>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: '',
      destination: '',
      season: 'Verano',
      activities: [],
      description: '',
      imageUrl: '',
      userId: currentUserId
    }
  });

  // Función para abrir el diálogo de nuevo viaje
  const handleNewTrip = () => {
    form.reset({
      name: '',
      destination: '',
      season: 'Verano',
      activities: [],
      description: '',
      imageUrl: '',
      userId: currentUserId
    });
    setEditingTrip(null);
    setShowTripDialog(true);
  };

  // Función para abrir el diálogo de edición de viaje
  const handleEditTrip = (trip: Trip) => {
    form.reset({
      name: trip.name,
      destination: trip.destination,
      startDate: new Date(trip.startDate),
      endDate: new Date(trip.endDate),
      season: trip.season || undefined,
      activities: trip.activities || [],
      description: trip.description || '',
      imageUrl: trip.imageUrl || '',
      userId: trip.userId
    });
    setEditingTrip(trip);
    setShowTripDialog(true);
  };

  // Manejar el envío del formulario
  const onSubmit = (data: z.infer<typeof tripFormSchema>) => {
    if (editingTrip) {
      updateTripMutation.mutate({ ...data, id: editingTrip.id });
    } else {
      createTripMutation.mutate(data);
    }
  };

  // Función para manejar la eliminación de un viaje
  const handleDeleteTrip = (tripId: number) => {
    if (confirm('¿Estás seguro de eliminar este viaje? Esta acción no se puede deshacer.')) {
      deleteTripMutation.mutate(tripId);
    }
  };

  // Función para ir a la página de listas de equipaje de un viaje
  const navigateToPackingLists = (tripId: number) => {
    setLocation(`/trips/${tripId}/packing-lists`);
  };

  // Filtrar viajes por temporada
  const filteredTrips = seasonFilter 
    ? trips?.filter(trip => trip.season === seasonFilter) 
    : trips;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-playfair text-3xl gold-text">Planificación de Viajes</h1>
          <p className="text-cream-soft/80 mt-2">
            Organiza tus viajes y genera listas de equipaje personalizadas
          </p>
        </div>
        <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleNewTrip}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Viaje
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="font-playfair text-xl gold-text mb-4">Filtrar por Temporada</h2>
        <div className="flex space-x-2">
          <Button 
            variant={seasonFilter === null ? "default" : "outline"}
            onClick={() => setSeasonFilter(null)}
            className={seasonFilter === null ? "bg-amber-deep hover:bg-amber-deep/90" : ""}
          >
            Todos
          </Button>
          <Button 
            variant={seasonFilter === "Verano" ? "default" : "outline"}
            onClick={() => setSeasonFilter("Verano")}
            className={seasonFilter === "Verano" ? "bg-amber-deep hover:bg-amber-deep/90" : ""}
          >
            Verano
          </Button>
          <Button 
            variant={seasonFilter === "Otoño" ? "default" : "outline"}
            onClick={() => setSeasonFilter("Otoño")}
            className={seasonFilter === "Otoño" ? "bg-amber-deep hover:bg-amber-deep/90" : ""}
          >
            Otoño
          </Button>
          <Button 
            variant={seasonFilter === "Invierno" ? "default" : "outline"}
            onClick={() => setSeasonFilter("Invierno")}
            className={seasonFilter === "Invierno" ? "bg-amber-deep hover:bg-amber-deep/90" : ""}
          >
            Invierno
          </Button>
          <Button 
            variant={seasonFilter === "Primavera" ? "default" : "outline"}
            onClick={() => setSeasonFilter("Primavera")}
            className={seasonFilter === "Primavera" ? "bg-amber-deep hover:bg-amber-deep/90" : ""}
          >
            Primavera
          </Button>
        </div>
      </div>

      <Separator className="my-8 bg-amber-deep/30" />

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-deep border-r-transparent align-[-0.125em]" role="status">
            <span className="sr-only">Cargando...</span>
          </div>
          <p className="mt-4 text-cream-soft/70">Cargando tus viajes...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400">Error al cargar los viajes. Por favor, intenta de nuevo.</p>
        </div>
      ) : filteredTrips?.length === 0 ? (
        <div className="text-center py-12 bg-black-elegant rounded-lg border border-amber-deep/20 px-4">
          <p className="text-lg text-cream-soft/70 mb-4">
            Aún no tienes viajes {seasonFilter ? `para la temporada ${seasonFilter}` : ''}
          </p>
          <Button className="bg-amber-deep hover:bg-amber-deep/90" onClick={handleNewTrip}>
            <PlusCircle className="mr-2 h-4 w-4" /> Crear tu primer viaje
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips?.map((trip) => (
            <Card key={trip.id} className="bg-black-elegant border-amber-deep/30 overflow-hidden hover:shadow-[0_0_15px_rgba(255,215,0,0.15)] transition-all duration-300">
              {trip.imageUrl ? (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={trip.imageUrl} 
                    alt={trip.destination} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-b from-amber-deep/20 to-black-elegant flex items-center justify-center">
                  <h3 className="font-playfair text-3xl gold-text">{trip.destination}</h3>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="font-playfair gold-text">{trip.name}</CardTitle>
                <CardDescription className="text-cream-soft/70">
                  {format(new Date(trip.startDate), 'PPP', { locale: es })} - {format(new Date(trip.endDate), 'PPP', { locale: es })}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <p className="text-cream-soft mb-4">{trip.description}</p>
                
                {trip.season && (
                  <div className="mb-2 flex items-center">
                    <span className="text-amber-300 font-medium mr-2">Temporada:</span>
                    <span className="text-cream-soft/80">{trip.season}</span>
                  </div>
                )}
                
                {trip.activities && trip.activities.length > 0 && (
                  <div className="mb-2">
                    <span className="text-amber-300 font-medium block mb-1">Actividades:</span>
                    <div className="flex flex-wrap gap-1">
                      {trip.activities.map((activity, index) => (
                        <span 
                          key={index} 
                          className="bg-amber-deep/10 border border-amber-deep/30 rounded-full px-2 py-0.5 text-xs text-cream-soft/90"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditTrip(trip)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-100/10" onClick={() => handleDeleteTrip(trip.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                  </Button>
                </div>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-amber-deep hover:bg-amber-deep/90"
                  onClick={() => navigateToPackingLists(trip.id)}
                >
                  <Package className="h-4 w-4 mr-2" /> Equipaje
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo para crear/editar viaje */}
      <Dialog open={showTripDialog} onOpenChange={setShowTripDialog}>
        <DialogContent className="bg-black-elegant border-amber-deep/50 text-cream-soft sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-playfair gold-text text-xl">
              {editingTrip ? 'Editar Viaje' : 'Nuevo Viaje'}
            </DialogTitle>
            <DialogDescription className="text-cream-soft/70">
              {editingTrip ? 'Modifica los detalles de tu viaje' : 'Completa los detalles para tu nuevo viaje'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">Nombre del viaje</FormLabel>
                    <FormControl>
                      <Input placeholder="Vacaciones en la playa" {...field} className="bg-black border-amber-deep/30 text-cream-soft" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">Destino</FormLabel>
                    <FormControl>
                      <Input placeholder="Barcelona, España" {...field} className="bg-black border-amber-deep/30 text-cream-soft" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-cream-soft">Fecha de inicio</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="bg-black border-amber-deep/30 text-cream-soft"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black-elegant border-amber-deep/30" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className="text-cream-soft"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-cream-soft">Fecha de fin</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="bg-black border-amber-deep/30 text-cream-soft"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black-elegant border-amber-deep/30" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const startDate = form.getValues().startDate;
                              return startDate && date < startDate;
                            }}
                            initialFocus
                            className="text-cream-soft"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">Temporada</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-black border-amber-deep/30 text-cream-soft">
                          <SelectValue placeholder="Selecciona la temporada" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black-elegant border-amber-deep/30 text-cream-soft">
                        <SelectItem value="Primavera">Primavera</SelectItem>
                        <SelectItem value="Verano">Verano</SelectItem>
                        <SelectItem value="Otoño">Otoño</SelectItem>
                        <SelectItem value="Invierno">Invierno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">Descripción</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        className="w-full min-h-[100px] p-3 rounded-md bg-black border-amber-deep/30 text-cream-soft"
                        placeholder="Describe tu viaje..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cream-soft">URL de imagen</FormLabel>
                    <FormControl>
                      <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} className="bg-black border-amber-deep/30 text-cream-soft" />
                    </FormControl>
                    <FormDescription className="text-cream-soft/60">
                      URL de una imagen para ilustrar tu viaje (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowTripDialog(false)}
                  className="border-amber-deep/50 text-cream-soft"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-amber-deep hover:bg-amber-deep/90">
                  {editingTrip ? 'Guardar cambios' : 'Crear viaje'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}