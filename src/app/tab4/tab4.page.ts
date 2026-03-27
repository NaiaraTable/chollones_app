import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonPopover,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  heart,
  heartOutline,
  bagOutline,
  add,
  searchOutline,
  locationOutline,
  storefrontOutline,
  cartOutline,
  imageOutline,
  chevronDownOutline,
  checkmarkOutline
} from 'ionicons/icons';

import { SupabaseService } from '../services/supabase.service';
import { LocationService } from '../services/location.service';
import { SearchService } from '../services/Search.service';
import { Capacitor } from '@capacitor/core';
import { ToastController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonPopover,
    IonList,
    IonItem,
    IonLabel
  ]
})
export class Tab4Page implements OnInit, OnDestroy {

  listadoChollos: any[] = [];
  filtrados: any[] = [];
  chollosPaginados: any[] = [];

  categorias: any[] = [{ nombre: 'Todas', slug: 'todas' }];
  categoriaSeleccionada = 'todas';

  subFiltroSeleccionado = 'destacados';

  textoBusqueda = '';
  cargando = true;

  miLat = 37.3891;
  miLng = -5.9845;

  favoritosIds: Set<string> = new Set();

  itemsPorPagina = 10;
  paginaActual = 0;
  infiniteScrollDisabled = false;

  // Referencia al searchbar del template
  @ViewChild('searchbar', { static: false }) searchbarRef?: IonSearchbar;

  // Referencia al popover de categorías
  @ViewChild('popoverCats') popoverCats?: IonPopover;

  private searchSub?: Subscription;

  // Inyecciones usando `inject()` para evitar la regla prefer-inject
  private supabaseService = inject(SupabaseService);
  private locationService = inject(LocationService);
  private searchService = inject(SearchService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  // Búsqueda interna del popover de categorías
  catSearch: string = '';

  constructor() {}

  async ngOnInit() {
    // Registrar todos los iconos aquí
    addIcons({
      heart, heartOutline, bagOutline, add,
      searchOutline, locationOutline, storefrontOutline,
      cartOutline, imageOutline, chevronDownOutline, checkmarkOutline
    });

    await this.obtenerUbicacion();

    // Suscripción reactiva al buscador del header
    this.searchSub = this.searchService.getBusqueda$().subscribe(texto => {
      this.textoBusqueda = texto;
      if (this.listadoChollos.length > 0) {
        this.aplicarFiltros();
      }
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  buscar(event: any) {
    const texto = event.detail?.value || '';
    this.searchService.setBusqueda(texto);
  }

  onCatSearchInput(event: any) {
    // Normalizar valor: si viene undefined lo convertimos a cadena vacía
    const v = event?.detail?.value;
    this.catSearch = (v === undefined || v === null) ? '' : String(v);
  }

  async ionViewWillEnter() {
    // Sincronizar con el valor actual del servicio
    this.textoBusqueda = this.searchService.valorActual;
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q !== null) {
      this.textoBusqueda = q.trim();
      setTimeout(() => {
        if (this.searchbarRef) {
          this.searchbarRef.value = this.textoBusqueda;
        }
      }, 0);
    }

    const filtro = this.route.snapshot.queryParamMap.get('filtro');
    if (filtro) {
      this.categoriaSeleccionada = 'todas';
      this.subFiltroSeleccionado = filtro;
    }

    // ACTUALIZACIÓN AUTOMÁTICA (TU CÓDIGO): Si ya tenemos datos, recargamos "en silencio"
    // para actualizar las notas sin mostrar la pantalla de carga de nuevo
    if (this.listadoChollos.length > 0) {
      this.cargarDatos(true); // true = recargar en silencio sin pantalla de carga
      return;
    }

    await this.cargarDatos(false); // false = cargar por primera vez mostrando el spinner
  }

  async obtenerUbicacion() {
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const coords = await this.locationService.getPosition();
        this.miLat = coords.latitude;
        this.miLng = coords.longitude;
      } catch (e) {
        console.warn('Usando ubicación por defecto');
      }
    }
  }

  // TU CÓDIGO AÑADIDO: Parámetro "isSilent" para que no moleste al recargar
  async cargarDatos(isSilent: boolean = false) {
    if (!isSilent) {
      this.cargando = true;
    }

    try {
      const data = await this.supabaseService.getChollos();
      const favs = await this.supabaseService.getFavoritosIds();
      this.favoritosIds = new Set(favs);

      if (data) {
        this.listadoChollos = data.map((c: any) => ({
          ...c,
          distanciaKM: c.proveedores?.lat
            ? this.locationService
              .calcularDistancia(this.miLat, this.miLng, c.proveedores.lat, c.proveedores.lng)
              .toFixed(1)
            : '?'
        }));

        const catsMap = new Map<string, any>();
        data.forEach((c: any) => {
          const cats = Array.isArray(c.categorias) ? c.categorias : [c.categorias];
          cats.forEach((cat: any) => {
            if (cat?.slug) catsMap.set(cat.slug, { nombre: cat.nombre, slug: cat.slug });
          });
        });

        this.categorias = [{ nombre: 'Todas', slug: 'todas' }, ...Array.from(catsMap.values())];

        // Al terminar de recargar los datos frescos, actualizamos la vista
        this.aplicarFiltros();
      }
    } catch (e) {
      console.error('Error cargando chollos:', e);
    } finally {
      if (!isSilent) {
        this.cargando = false;
      }
    }
  }

  aplicarFiltros() {
    let tmp = [...this.listadoChollos];

    if (this.textoBusqueda.trim()) {
      const q = this.textoBusqueda.trim().toLowerCase();
      tmp = tmp.filter(c => c.titulo?.toLowerCase().includes(q));
    }

    if (this.categoriaSeleccionada !== 'todas') {
      tmp = tmp.filter((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : [c.categorias];
        return cats.some((cat: any) => cat?.slug === this.categoriaSeleccionada);
      });
    }

    if (this.categoriaSeleccionada === 'todas') {
      if (this.subFiltroSeleccionado === 'recientes') {
        tmp.sort((a, b) => {
          const dateA = new Date(a.created_at || a.fecha_creacion || a.date_created || 0).getTime();
          const dateB = new Date(b.created_at || b.fecha_creacion || b.date_created || 0).getTime();
          return dateB - dateA;
        });
      } else if (this.subFiltroSeleccionado === 'valoracion') {

        // LÓGICA DE TU COMPAÑERO CONSERVADA PARA MAYOR COMPATIBILIDAD CON SU BASE DE DATOS
        tmp = tmp.filter(c => {
          const val = parseFloat(c.valoracion ?? c.rating ?? c.puntuacion ?? c.average_rating ?? c._wc_average_rating ?? 0) || 0;

          const numComentarios = parseInt(c.comentarios ?? c.rating_count ?? c.review_count ?? c.cantidad_comentarios ?? 0) || 0;
          const arrayComentarios = Array.isArray(c.comentarios) ? c.comentarios.length : 0;
          const arrayReviews = Array.isArray(c.reviews) ? c.reviews.length : 0;

          const totalComentarios = numComentarios + arrayComentarios + arrayReviews;

          const estaValorado = val > 0;

          // Si está valorado, lo incluimos solo si la nota >= 2.3; si no está valorado, lo incluimos solo si tiene comentarios
          return estaValorado ? val >= 2.3 : totalComentarios > 0;
        });

        // Ordenar de mayor nota a menor
        tmp.sort((a, b) => {
          const valA = parseFloat(a.valoracion ?? a.rating ?? a.puntuacion ?? a.average_rating ?? a._wc_average_rating ?? 0) || 0;
          const valB = parseFloat(b.valoracion ?? b.rating ?? b.puntuacion ?? b.average_rating ?? b._wc_average_rating ?? 0) || 0;
          return valB - valA;
        });

      } else if (this.subFiltroSeleccionado === 'descuentos') {
        tmp.sort((a, b) => this.calcDescuento(b) - this.calcDescuento(a));
      }
    }

    this.filtrados = tmp;
    this.paginaActual = 0;
    this.chollosPaginados = [];
    this.infiniteScrollDisabled = false;
    this.agregarChollos();
  }

  seleccionarSubFiltro(subFiltro: string) {
    this.subFiltroSeleccionado = subFiltro;
    this.aplicarFiltros();
  }

  agregarChollos() {
    const inicio = this.paginaActual * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.chollosPaginados = [...this.chollosPaginados, ...this.filtrados.slice(inicio, fin)];
    this.paginaActual++;

    if (this.chollosPaginados.length >= this.filtrados.length) {
      this.infiniteScrollDisabled = true;
    }

    this.cdr.detectChanges();
  }

  cargarMas(event: any) {
    setTimeout(() => {
      this.agregarChollos();
      event.target.complete();
    }, 500);
  }

  seleccionarCategoria(slug: string) {
    this.categoriaSeleccionada = slug;
    this.aplicarFiltros();
  }

  onSelectCategory(slug: string) {
    // Cerrar el popover y limpiar la búsqueda de categoría
    this.popoverCats?.dismiss();
    this.catSearch = '';
    this.seleccionarCategoria(slug);
  }

  // Determina si una categoría coincide con el texto de búsqueda del popover
  matchesCategory(cat: any): boolean {
    const name = (cat?.nombre || '').toString();
    const search = (this.catSearch || '').toString().trim().toLowerCase();
    return !search || name.toLowerCase().includes(search);
  }

  calcDescuento(c: any): number {
    const actual = Number(c.precio_actual);
    const original = Number(c.precio_original);
    if (!original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }

  esFavorito(id: string): boolean {
    return this.favoritosIds.has(id);
  }

  async toggleFavorito(c: any, e: Event) {
    e.stopPropagation();
    try {
      if (this.esFavorito(c.id)) {
        await this.supabaseService.eliminarCholloFavorito(c.id);
        this.favoritosIds.delete(c.id);
      } else {
        await this.supabaseService.guardarCholloFavorito(c.id);
        this.favoritosIds.add(c.id);
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error toggle favorito', error);
    }
  }

  irADetalle(id: string) {
    this.router.navigate(['/tabs/producto', id]);
  }

  async anadirAlCarrito(chollo: any, e: Event) {
    e.stopPropagation();
    try {
      await this.supabaseService.anadirAlCarrito(chollo.id, 1);
      const toast = await this.toastCtrl.create({
        message: 'Producto añadido al carrito',
        duration: 2000,
        position: 'bottom',
        cssClass: 'toast-carrito'
      });
      await toast.present();
    } catch (error) {
      console.error('Error añadiendo al carrito:', error);
    }
  }

  get categoriaSeleccionadaNombre(): string {
    const cat = this.categorias.find(x => x.slug === this.categoriaSeleccionada);
    return cat?.nombre || 'Todas';
  }
}
