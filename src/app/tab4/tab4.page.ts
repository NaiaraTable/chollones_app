import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
  IonImg,
  IonInfiniteScroll,
  IonInfiniteScrollContent
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
import { Capacitor } from '@capacitor/core';


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
    IonSearchbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonImg,
    IonInfiniteScroll,
    IonInfiniteScrollContent
  ]
})
export class Tab4Page implements OnInit {

  @ViewChild('searchbar') searchbarRef!: IonSearchbar;

  listadoChollos: any[] = [];
  filtrados: any[] = [];
  chollosPaginados: any[] = [];

  categorias: any[] = [{ nombre: 'Todas', slug: 'todas' }];
  categoriaSeleccionada = 'todas';

  // Variable para el subfiltro
  subFiltroSeleccionado = 'destacados';

  textoBusqueda = '';
  cargando = true;

  miLat = 37.3891;
  miLng = -5.9845;

  favoritosIds: Set<string> = new Set();

  itemsPorPagina = 10;
  paginaActual = 0;
  infiniteScrollDisabled = false;

  constructor(
    private supabaseService: SupabaseService,
    private locationService: LocationService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      heart,
      heartOutline,
      bagOutline,
      add,
      searchOutline,
      locationOutline,
      storefrontOutline,
      cartOutline,
      imageOutline
    });
  }

  async ngOnInit() {
    await this.obtenerUbicacion();
  }

  async ionViewWillEnter() {
    // 1. Recibir búsqueda por texto
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
        console.warn('Ubicación manual');
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
              .calcularDistancia(
                this.miLat,
                this.miLng,
                c.proveedores.lat,
                c.proveedores.lng
              )
              .toFixed(1)
            : '?'
        }));

        const catsMap = new Map();

        data.forEach((c: any) => {
          const cats = Array.isArray(c.categorias)
            ? c.categorias
            : [c.categorias];

          cats.forEach((cat: any) => {
            if (cat?.slug) {
              catsMap.set(cat.slug, {
                nombre: cat.nombre,
                slug: cat.slug
              });
            }
          });
        });

        this.categorias = [
          { nombre: 'Todas', slug: 'todas' },
          ...Array.from(catsMap.values())
        ];

        this.aplicarFiltros();
      }

    } catch (e) {
      console.error(e);
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    let tmp = [...this.listadoChollos];

    if (this.textoBusqueda.trim()) {
      const q = this.textoBusqueda.trim().toLowerCase();
      tmp = tmp.filter(c =>
        c.titulo?.toLowerCase().includes(q)
      );
    }

    if (this.categoriaSeleccionada !== 'todas') {
      tmp = tmp.filter((c: any) => {
        const cats = Array.isArray(c.categorias)
          ? c.categorias
          : [c.categorias];

        return cats.some(
          (cat: any) => cat?.slug === this.categoriaSeleccionada
        );
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

        console.log("---- DEBUG FILTRO MEJOR VALORADOS ----");
        if (tmp.length > 0) {
          console.log("🔍 Estructura del primer chollo:", tmp[0]);
        }

        tmp = tmp.filter(c => {
          // Buscamos cualquier posible nombre de campo de valoración
          const val = parseFloat(c.valoracion ?? c.rating ?? c.puntuacion ?? c.average_rating ?? c._wc_average_rating ?? 0) || 0;

          // Buscamos comentarios por número o si es un array
          const numComentarios = parseInt(c.comentarios ?? c.rating_count ?? c.review_count ?? c.cantidad_comentarios ?? 0) || 0;
          const arrayComentarios = Array.isArray(c.comentarios) ? c.comentarios.length : 0;
          const arrayReviews = Array.isArray(c.reviews) ? c.reviews.length : 0;

          const totalComentarios = numComentarios + arrayComentarios + arrayReviews;

          const estaValorado = val > 0;
          const tieneComentarios = totalComentarios > 0;

          // Si descomentas esta línea, verás por qué se ocultan en la consola
          // console.log(`Chollo: ${c.titulo} | Nota: ${val} | Comentarios: ${totalComentarios}`);

          if (!estaValorado && !tieneComentarios) {
            return false;
          }

          if (estaValorado && val < 2.3) {
            return false;
          }

          return true;
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
    const nuevosChollos = this.filtrados.slice(inicio, fin);

    this.chollosPaginados = [...this.chollosPaginados, ...nuevosChollos];
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

  buscar(ev: any) {
    const valor = ev?.detail?.value ?? ev?.target?.value ?? '';
    this.textoBusqueda = valor;
    this.aplicarFiltros();
  }

  seleccionarCategoria(slug: string) {
    this.categoriaSeleccionada = slug;
    this.aplicarFiltros();
  }

  calcDescuento(c: any) {
    const actual = Number(c.precio_actual);
    const original = Number(c.precio_original);

    if (!original || original <= actual) return 0;

    return Math.round(((original - actual) / original) * 100);
  }

  esFavorito(id: string) {
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
      console.error(error);
    }
  }
}
