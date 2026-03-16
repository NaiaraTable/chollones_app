import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonList, IonContent,
  IonItem, IonThumbnail, IonLabel, IonBadge, IonIcon, IonButton, IonTitle, IonToolbar, IonHeader, IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  storefrontOutline,
  informationCircleOutline,
  locationOutline,
  navigateOutline,
  heart, heartOutline
} from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { LocationService } from '../services/location.service';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonList, IonItem, IonThumbnail, IonLabel, IonBadge, IonIcon, IonButton, IonContent, IonTitle, IonToolbar, IonHeader, IonCardContent
  ]
})
export class Tab4Page implements OnInit {

  listadoChollos: any[] = [];
  filtradosTotales: any[] = [];
  filtrados: any[] = [];
  mostrarTodos: boolean = false;
  miLat: number = 0;
  miLng: number = 0;

  //Estado para favoritos (mg)
  favoritosIds: Set<string> = new Set();

  textoBusqueda = '';
  categoriaSeleccionada = 'todas';
  filtroRapidoSeleccionado = '';

  categorias: any[] = [
    { nombre: 'Todas', slug: 'todas' }
  ];

  filtrosRapidos = [
    { id: 'recientes', nombre: 'Recientes' },
    { id: 'destacados', nombre: 'Destacados' },
    { id: 'distancia', nombre: 'Distancia' },
    { id: 'valorados', nombre: 'Mejor valorados' },
    { id: 'descuento', nombre: 'Mejor descuento' },
    { id: 'top_ventas', nombre: 'Top ventas' }
  ];

  constructor(
    private supabaseService: SupabaseService,
    private locationService: LocationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({ storefrontOutline, informationCircleOutline, locationOutline, navigateOutline, heart, heartOutline });
  }

  async ngOnInit() {
    try {
      const coords = await this.locationService.getPosition();
      this.miLat = coords.latitude;
      this.miLng = coords.longitude;
    } catch (e) {
      console.warn('GPS no disponible, usando Sevilla por defecto');
      this.miLat = 37.3891;
      this.miLng = -5.9845;
    }

    try {
      const chollos = await this.supabaseService.getChollos();
      // Extraer categorías únicas de los chollos
      const catsMap = new Map();
      chollos.forEach((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : (c.categorias ? [c.categorias] : []);
        cats.forEach((cat: any) => {
          if (cat && cat.slug && !catsMap.has(cat.slug)) {
            catsMap.set(cat.slug, { nombre: cat.nombre, slug: cat.slug });
          }
        });
      });
      if (catsMap.size > 0) {
        this.categorias = [
          { nombre: 'Todas', slug: 'todas' },
          ...Array.from(catsMap.values())
        ];
      }
    } catch (err) {
      console.error('Error cargando categorias en tab4', err);
    }

    // Cargamos favoritos y chollos al iniciar
    await this.cargarFavoritos();
    await this.cargarChollos();

    // Check query params for active filter
    this.route.queryParams.subscribe(params => {
      if (params['filtro']) {
        // Find if it's a valid quick filter
        const isQuickFilter = this.filtrosRapidos.some(f => f.id === params['filtro']);
        if (isQuickFilter) {
          this.filtroRapidoSeleccionado = params['filtro'];
          this.categoriaSeleccionada = 'todas';
        }
        this.aplicarFiltros();
      }
    });
  }

  // Recargar favoritos cuando vuelves a este tab
  async ionViewWillEnter() {
    await this.cargarFavoritos();
  }

  async cargarChollos() {
    try {
      const chollos = await this.supabaseService.getChollos();

      if (chollos && Array.isArray(chollos)) {

        this.listadoChollos = chollos.map(c => {
          const pLat = c.proveedores?.lat;
          const pLng = c.proveedores?.lng;

          // --- LÓGICA DE LAS 15 PALABRAS ---
          // 1. Intentamos pillar 'descripcion' o 'description' (ajusta según tu DB)
          let textoOriginal = c.descripcion || c.description || '';

          // 2. Limpiamos HTML
          textoOriginal = textoOriginal.replace(/<[^>]*>/g, '');

          // 3. Convertimos el texto en un array de palabras
          const palabras = textoOriginal.split(/\s+/); // Divide por espacios

          let textoProcesado = '';
          if (palabras.length > 15) {
            // Si tiene más de 15, agarramos las primeras 15 y añadimos "..."
            textoProcesado = palabras.slice(0, 15).join(' ') + '...';
          } else {
            // Si tiene menos, lo dejamos tal cual
            textoProcesado = textoOriginal;
          }
          // ---------------------------------

          let distancia = '?';
          if (pLat && pLng) {
            const d = this.locationService.calcularDistancia(this.miLat, this.miLng, pLat, pLng);
            distancia = d.toFixed(1);
          }

          return {
            ...c,
            descripcionCorta: textoProcesado, // Esta es la que usaremos en el HTML
            distanciaKM: distancia,
            lat: pLat,
            lng: pLng
          };
        });

        // Ordenar por cercanía (mantenemos tu lógica original)
        this.listadoChollos.sort((a, b) => {
          if (a.distanciaKM === '?') return 1;
          if (b.distanciaKM === '?') return -1;
          return parseFloat(a.distanciaKM) - parseFloat(b.distanciaKM);
        });

        this.filtrados = [...this.listadoChollos];

        if (this.listadoChollos.length > 0) {
          this.locationService.iniciarVigilancia(this.listadoChollos);
        }
      }
    } catch (error) {
      console.error('Error al cargar chollos:', error);
    }
  }

  // Nueva función: Cargar favoritos del usuario
  async cargarFavoritos() {
    try {
      const ids = await this.supabaseService.getFavoritosIds();
      this.favoritosIds = new Set(ids);
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    }
  }

  // Toggle de favorito (usa ApiService)
  async toggleFavorito(chollo: any, event: Event) {
    event.stopPropagation();

    const isFav = this.favoritosIds.has(chollo.id);

    try {
      if (isFav) {
        await this.supabaseService.eliminarCholloFavorito(chollo.id);
        this.favoritosIds.delete(chollo.id);
      } else {
        await this.supabaseService.guardarCholloFavorito(chollo.id);
        this.favoritosIds.add(chollo.id);
      }
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
    }
  }

  // Nueva función: Comprobar si es favorito
  esFavorito(id: string): boolean {
    return this.favoritosIds.has(id);
  }

  calcDescuento(chollo: any): number {
    const actual = Number(chollo?.precio_actual || 0);
    const original = Number(chollo?.precio_original || 0);
    if (!actual || !original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }

  buscar(event: any) {
    this.textoBusqueda = (event.target.value || '').toLowerCase().trim();
    this.mostrarTodos = false;
    this.aplicarFiltros();
  }

  seleccionarCategoria(slug: string) {
    this.categoriaSeleccionada = slug;
    this.mostrarTodos = false;
    this.aplicarFiltros();
  }

  seleccionarFiltroRapido(id: string) {
    if (this.filtroRapidoSeleccionado === id) {
      this.filtroRapidoSeleccionado = ''; // Deseleccionar
    } else {
      this.filtroRapidoSeleccionado = id;
    }
    this.mostrarTodos = false;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let resultado = [...this.listadoChollos];

    // 1. Filtrar por texto
    if (this.textoBusqueda) {
      resultado = resultado.filter(c =>
        (c.titulo || '').toLowerCase().includes(this.textoBusqueda) ||
        (c.proveedores?.nombre || '').toLowerCase().includes(this.textoBusqueda) ||
        (c.descripcion || '').toLowerCase().includes(this.textoBusqueda)
      );
    }

    // 2. Filtrar por categoría
    if (this.categoriaSeleccionada !== 'todas') {
      resultado = resultado.filter((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : (c.categorias ? [c.categorias] : []);
        return cats.some((cat: any) => (cat.slug || '').toLowerCase() === this.categoriaSeleccionada);
      });
    }

    // 3. Filtros rápidos
    if (this.filtroRapidoSeleccionado) {
      if (this.filtroRapidoSeleccionado === 'recientes') {
        resultado.sort((a, b) => {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          return tB - tA;
        });
      } else if (this.filtroRapidoSeleccionado === 'destacados') {
        resultado = resultado.filter(c => c.punto?.estado === 'Caliente');
      } else if (this.filtroRapidoSeleccionado === 'descuento') {
        resultado.sort((a, b) => this.calcDescuento(b) - this.calcDescuento(a));
      } else if (this.filtroRapidoSeleccionado === 'distancia') {
        resultado.sort((a, b) => {
          if (a.distanciaKM === '?') return 1;
          if (b.distanciaKM === '?') return -1;
          return parseFloat(a.distanciaKM) - parseFloat(b.distanciaKM);
        });
      } else if (this.filtroRapidoSeleccionado === 'top_ventas') {
        resultado.sort((a, b) => (b.ventas || 0) - (a.ventas || 0));
      }
      // 'valorados' can either be sorted by an average rating if exists, otherwise do nothing
    } else {
      // Orden por cercanía por defecto
      resultado.sort((a, b) => {
        if (a.distanciaKM === '?') return 1;
        if (b.distanciaKM === '?') return -1;
        return parseFloat(a.distanciaKM) - parseFloat(b.distanciaKM);
      });
    }

    this.filtradosTotales = resultado;

    if (this.mostrarTodos) {
      this.filtrados = resultado;
    } else {
      this.filtrados = resultado.slice(0, 10);
    }
  }

  verTodos() {
    this.mostrarTodos = true;
    this.aplicarFiltros();
  }

  abrirNavegacion(chollo: any) {
    if (!chollo.lat || !chollo.lng) return;

    const lat = chollo.lat;
    const lng = chollo.lng;

    // HE CORREGIDO TUS URLS. La que tenías de googleusercontent no iba a funcionar.
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const appleMapsUrl = `maps://maps.apple.com/?daddr=${lat},${lng}`;

    if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
      window.open(appleMapsUrl, '_system');
    } else {
      window.open(googleMapsUrl, '_system');
    }
  }

  irADetalle(id: string) {
    console.log('Navegando al producto:', id); // Esto te ayuda a ver si hace clic
    this.router.navigate(['/tabs/producto', id]);
  }

  async anadirAlCarrito(chollo: any, event?: Event) {
    if (event) event.stopPropagation();
    try {
      await this.supabaseService.anadirAlCarrito(chollo.id, 1);

      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Producto añadido al carrito',
          duration: 2000,
          position: 'top',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });
    } catch (e) {
      console.error('Error al añadir al carrito', e);
      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Error al añadir. ¿Iniciaste sesión?',
          duration: 3000,
          position: 'top',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });
    }
  }

}
