import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonSearchbar,
  IonButtons, IonButton, IonIcon, IonSpinner, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
<<<<<<< HEAD
  storefrontOutline,
  informationCircleOutline,
  locationOutline,
  navigateOutline,
  heart, heartOutline,
  searchOutline
=======
  heart, heartOutline, bagOutline, add, searchOutline,
  locationOutline, storefrontOutline
>>>>>>> sara
} from 'ionicons/icons';
import { SupabaseService } from '../services/supabase.service';
import { LocationService } from '../services/location.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar,
    IonSearchbar, IonButtons, IonButton, IonIcon, IonSpinner, IonBadge
  ]
})
export class Tab4Page implements OnInit {
  listadoChollos: any[] = [];
  filtrados: any[] = [];
<<<<<<< HEAD
  mostrarTodos: boolean = false;
  miLat: number = 0;
  miLng: number = 0;

  //Estado para favoritos (mg)
  favoritosIds: Set<string> = new Set();

  textoBusqueda = '';
  busquedaActiva = '';
=======
  categorias: any[] = [{ nombre: 'Todas', slug: 'todas' }];
>>>>>>> sara
  categoriaSeleccionada = 'todas';
  textoBusqueda = '';
  cargando = true;
  miLat = 37.3891;
  miLng = -5.9845;
  favoritosIds: Set<string> = new Set();

  constructor(
    private supabaseService: SupabaseService,
    private locationService: LocationService,
    private router: Router
  ) {
<<<<<<< HEAD
    addIcons({ storefrontOutline, informationCircleOutline, locationOutline, navigateOutline, heart, heartOutline, searchOutline });
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

    // Recoger query params — búsqueda desde header o filtro rápido
    this.route.queryParams.subscribe(params => {
      let cambio = false;

      if (params["q"] !== undefined) {
        this.textoBusqueda = (params["q"] || "").toLowerCase().trim();
        this.busquedaActiva = params["q"] || "";
        cambio = true;
      }

      if (params["filtro"]) {
        const isQuickFilter = this.filtrosRapidos.some(f => f.id === params["filtro"]);
        if (isQuickFilter) {
          this.filtroRapidoSeleccionado = params["filtro"];
          this.categoriaSeleccionada = "todas";
          cambio = true;
        }
      }

      if (cambio) this.aplicarFiltros();
=======
    addIcons({
      heart, heartOutline, bagOutline, add, searchOutline,
      locationOutline, storefrontOutline
>>>>>>> sara
    });
  }

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      // Intentar obtener ubicación si no es web
      if (Capacitor.getPlatform() !== 'web') {
        try {
          const coords = await this.locationService.getPosition();
          this.miLat = coords.latitude;
          this.miLng = coords.longitude;
        } catch (e) { console.warn('Ubicación por defecto activada'); }
      }

      const data = await this.supabaseService.getChollos();
      const favs = await this.supabaseService.getFavoritosIds();
      this.favoritosIds = new Set(favs);

      if (data) {
        this.listadoChollos = data.map((c: any) => {
          // Limpiar HTML de la descripción como tenías antes
          let textoOriginal = (c.descripcion || '').replace(/<[^>]*>/g, '');
          const palabras = textoOriginal.split(/\s+/);
          const descCorta = palabras.length > 15 ? palabras.slice(0, 15).join(' ') + '...' : textoOriginal;

          // Cálculo de distancia
          let distancia = '?';
          if (c.proveedores?.lat && c.proveedores?.lng) {
            distancia = this.locationService.calcularDistancia(this.miLat, this.miLng, c.proveedores.lat, c.proveedores.lng).toFixed(1);
          }

          return { ...c, descripcionCorta: descCorta, distanciaKM: distancia };
        });

        // Categorías únicas
        const catsMap = new Map();
        data.forEach((c: any) => {
          const cats = Array.isArray(c.categorias) ? c.categorias : [c.categorias];
          cats.forEach((cat: any) => {
            if (cat?.slug) catsMap.set(cat.slug, { nombre: cat.nombre, slug: cat.slug });
          });
        });
        this.categorias = [{ nombre: 'Todas', slug: 'todas' }, ...Array.from(catsMap.values())];

        this.aplicarFiltros();
      }
    } catch (e) { console.error(e); } finally { this.cargando = false; }
  }

  aplicarFiltros() {
    let tmp = [...this.listadoChollos];
    if (this.textoBusqueda) {
      tmp = tmp.filter(c => c.titulo?.toLowerCase().includes(this.textoBusqueda.toLowerCase()));
    }
    if (this.categoriaSeleccionada !== 'todas') {
      tmp = tmp.filter((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : [c.categorias];
        return cats.some((cat: any) => cat?.slug === this.categoriaSeleccionada);
      });
    }
    this.filtrados = tmp;
  }

  buscar(ev: any) {
    this.textoBusqueda = ev.detail.value || '';
    this.aplicarFiltros();
  }

  seleccionarCategoria(slug: string) {
    this.categoriaSeleccionada = slug;
    this.aplicarFiltros();
  }

  calcDescuento(c: any) {
    if (!c.precio_original || c.precio_original <= c.precio_actual) return 0;
    return Math.round(((c.precio_original - c.precio_actual) / c.precio_original) * 100);
  }

  esFavorito(id: string) { return this.favoritosIds.has(id); }

  async toggleFavorito(c: any, e: Event) {
    e.stopPropagation();
    if (this.esFavorito(c.id)) {
      await this.supabaseService.eliminarCholloFavorito(c.id);
      this.favoritosIds.delete(c.id);
    } else {
<<<<<<< HEAD
      this.filtroRapidoSeleccionado = id;
    }
    this.mostrarTodos = false;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let resultado = [...this.listadoChollos];

    // 1. Filtrar solo por título del producto
    if (this.textoBusqueda) {
      resultado = resultado.filter(c =>
        (c.titulo || '').toLowerCase().includes(this.textoBusqueda)
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
=======
      await this.supabaseService.guardarCholloFavorito(c.id);
      this.favoritosIds.add(c.id);
>>>>>>> sara
    }
  }

  irADetalle(id: string) { this.router.navigate(['/tabs/producto', id]); }

  async anadirAlCarrito(c: any, e: Event) {
    e.stopPropagation();
    await this.supabaseService.anadirAlCarrito(c.id, 1);
  }
}
