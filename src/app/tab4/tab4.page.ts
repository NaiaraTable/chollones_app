import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonImg,
  IonInfiniteScroll,
  IonInfiniteScrollContent, IonSearchbar
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
  imageOutline
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
    IonImg,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar
  ]
})
export class Tab4Page implements OnInit, OnDestroy {

  listadoChollos: any[] = [];
  filtrados: any[] = [];
  chollosPaginados: any[] = [];

  categorias: any[] = [{ nombre: 'Todas', slug: 'todas' }];
  categoriaSeleccionada = 'todas';

  textoBusqueda = '';
  cargando = true;

  miLat = 37.3891;
  miLng = -5.9845;

  favoritosIds: Set<string> = new Set();

  itemsPorPagina = 10;
  paginaActual = 0;
  infiniteScrollDisabled = false;

  private searchSub?: Subscription;

  constructor(
    private supabaseService: SupabaseService,
    private locationService: LocationService,
    private searchService: SearchService,
    private router: Router,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      heart, heartOutline, bagOutline, add,
      searchOutline, locationOutline, storefrontOutline,
      cartOutline, imageOutline
    });
  }

  async ngOnInit() {
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

  async ionViewWillEnter() {
    // Sincronizar con el valor actual del servicio (por si se navegó desde otra pestaña)
    this.textoBusqueda = this.searchService.valorActual;

    if (this.listadoChollos.length > 0) {
      this.aplicarFiltros();
      return;
    }

    await this.cargarDatos();
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

  async cargarDatos() {
    this.cargando = true;

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
        this.aplicarFiltros();
      }
    } catch (e) {
      console.error('Error cargando chollos:', e);
    } finally {
      this.cargando = false;
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

    this.filtrados = tmp;
    this.paginaActual = 0;
    this.chollosPaginados = [];
    this.infiniteScrollDisabled = false;
    this.agregarChollos();
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
}
