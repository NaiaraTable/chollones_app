import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  searchOutline,
  heartOutline,
  heart,
  personOutline,
  bagOutline,
  flameOutline,
  timeOutline,
  openOutline,
  arrowForwardCircleOutline
} from 'ionicons/icons';

import { ApiService } from '../services/api.service';
import { SupabaseService } from '../services/supabase.service';
import { FavoritosEvent } from '../services/favoritos-event';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ],
})
export class Tab1Page implements OnInit {
  cartCount = 0;
  bannerUrl = 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=1400&auto=format&fit=crop';

  quickLinks = [
    { id: 'recientes', title: 'Recientes', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop', bgColor: 'rgba(255, 244, 204, 0.4)' },
    { id: 'destacados', title: 'Destacados', img: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=600&auto=format&fit=crop', bgColor: 'rgba(226, 226, 226, 0.4)' },
    { id: 'valorados', title: 'Mejor valorados', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop', bgColor: 'rgba(255, 226, 230, 0.4)' },
    { id: 'descuento', title: 'Mejores descuentos', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop', bgColor: 'rgba(230, 240, 250, 0.4)' }
  ];

  productosPopulares: any[] = [];
  chollosFiltrados: any[] = [];
  topVentas: any[] = [];
  categorias: any[] = [];

  favoritosIds: Set<string> = new Set();

  constructor(
    private apiService: ApiService,
    private supabaseService: SupabaseService,
    private favoritosEvent: FavoritosEvent,
    public router: Router
  ) {
    addIcons({
      searchOutline, heartOutline, heart, personOutline, bagOutline,
      flameOutline, timeOutline, openOutline, arrowForwardCircleOutline
    });
  }

  async ngOnInit() {
    await this.cargarDatos();
    await this.cargarFavoritos();
  }

  async ionViewWillEnter() {
    await this.cargarFavoritos();
  }

  async cargarDatos() {
    try {
      const [res, resTopVentas] = await Promise.all([
        this.apiService.getChollos(),
        this.apiService.getTopVentas()
      ]);

      const mapProduct = (c: any) => ({
        ...c,
        titulo: c.titulo,
        precioActual: c.precio_actual,
        precioOriginal: c.precio_original,
        imagen: c.imagen_url,
        proveedor: c.proveedores?.nombre,
        nuevo: this.esReciente(c.created_at)
      });

      const dataRaw = Array.isArray(res) ? res : (res as any)?.data;

      if (dataRaw && Array.isArray(dataRaw)) {
        const dataMapeada = dataRaw.map(mapProduct);

        this.productosPopulares = dataMapeada;
        this.chollosFiltrados = [...dataMapeada];

        const iconosPorNombre: { [key: string]: string } = {
          'Ahorro e Inversión': 'assets/img-categorias/ahorro-inversion.png',
          'Belleza y bienestar': 'assets/img-categorias/belleza-bienestar.png',
          'Bikinis y Bañadores': 'assets/img-categorias/bikini-bañadores.png',
          'Branding': 'assets/img-categorias/branding.png',
          'Complementos': 'assets/img-categorias/complementos.png',
          'Consultoría Online': 'assets/img-categorias/consultoria-online.png',
          'Cosmética Facial y Corporal': 'assets/img-categorias/cosmetica-facial-corporal.png',
          'Corporal': 'assets/img-categorias/corporal.png',
          'Cosmética Natural': 'assets/img-categorias/cosmetica-natural.png',
          'Depilación Láser Médica': 'assets/img-categorias/depilacion-laser-medica.png',
          'Diagnóstico Estético': 'assets/img-categorias/diagnostico-estetico.png',
          'Digitalización': 'assets/img-categorias/digitalizacion.png',
          'Electrónica': 'assets/img-categorias/electronica.png',
          'Experiencia de Compra': 'assets/img-categorias/experiencia-compra.png',
          'General': 'assets/img-categorias/general.png',
          'Hipotecas y Seguros': 'assets/img-categorias/hipotecas-seguros.png',
          'Kimonos': 'assets/img-categorias/kimono.png',
          'Manu Hipotecas': 'assets/img-categorias/manu-hipotecas.png',
          'Medicina Estética': 'assets/img-categorias/medicina-estetica.png',
          'Micropigmentación Estética': 'assets/img-categorias/micropigmentacion-estetica.png',
          'Moda Baño': 'assets/img-categorias/moda-baño.png',
          'Moda Deportiva': 'assets/img-categorias/moda-deportiva.png',
          'Nutrición y Bienestar': 'assets/img-categorias/nutricion-bienestar.png',
          'Nutricosmética': 'assets/img-categorias/nutricosmetica.png',
          'Páginas web': 'assets/img-categorias/paginas-web.png',
          'Redes sociales': 'assets/img-categorias/redes-sociales.png',
          'Revisión y Mejora de Hipotecas': 'assets/img-categorias/revision-mejoras-hipoteca.png',
          'Ropa': 'assets/img-categorias/ropa.png',
          'Ropa Deportiva Mujer': 'assets/img-categorias/ropa-deportiva-mujer.png',
          'SEO': 'assets/img-categorias/seo.png',
          'Servicios': 'assets/img-categorias/servicio.png',
          'Servicios Estéticos': 'assets/img-categorias/servicios-esteticos.png',
          'Servicios Financieros': 'assets/img-categorias/servicios-financieros.png',
          'Tatuajes': 'assets/img-categorias/tatuajes.png',
          'Training': 'assets/img-categorias/training.png',
          'Moda': 'assets/img-categorias/moda.png',
          'Mascotas': 'assets/img-categorias/mascotas.png',
          'Cocina': 'assets/img-categorias/cocina.png',
          'Marketing': 'assets/img-categorias/marketing.png',
          'Juguetes': 'assets/img-categorias/juguetes.png'
        };

        const catsMap = new Map<string, any>();
        dataRaw.forEach((c: any) => {
          const cats = Array.isArray(c.categorias) ? c.categorias : (c.categorias ? [c.categorias] : []);
          cats.forEach((cat: any) => {
            if (cat && cat.slug) {
              if (catsMap.has(cat.slug)) {
                catsMap.get(cat.slug)!.count++;
              } else {
                catsMap.set(cat.slug, {
                  id: cat.id,
                  nombre: cat.nombre,
                  slug: cat.slug,
                  img: cat.icono || iconosPorNombre[cat.nombre] || `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.nombre)}&background=random&color=fff&size=128`,
                  count: 1
                });
              }
            }
          });
        });

        this.categorias = Array.from(catsMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
      }

      const topRaw = Array.isArray(resTopVentas) ? resTopVentas : (resTopVentas as any)?.data;
      if (topRaw && Array.isArray(topRaw)) {
        this.topVentas = topRaw.map(mapProduct);
      } else {
        console.warn('No se pudo cargar el Top Ventas');
      }

    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }

  async cargarFavoritos() {
    try {
      const ids = await this.supabaseService.getFavoritosIds();
      const idsSeguros = Array.isArray(ids) ? ids : [];
      this.favoritosIds = new Set(idsSeguros);
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
    }
  }

  onSearch(ev: any) {
    const q = (ev?.target?.value || '').toLowerCase().trim();

    if (!q) {
      this.chollosFiltrados = [...this.productosPopulares];
      return;
    }

    this.chollosFiltrados = this.productosPopulares.filter((p) => {
      return (p.titulo || '').toLowerCase().includes(q) ||
        (p.proveedor || '').toLowerCase().includes(q);
    });
  }

  irAGuardados() {
    this.router.navigate(['/tabs/tab3']);
  }

  irACategoria(slug: string) {
    this.router.navigate(['/tabs', 'categoria', slug]);
  }

  async toggleFavorito(chollo: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // ¡AQUÍ ESTÁ LA MAGIA CORREGIDA!
    const token = localStorage.getItem('chollones_token');

    if (!token) {
      import('@ionic/angular/standalone').then(async ({ AlertController }) => {
        const alertCtrl = new AlertController();
        const alert = await alertCtrl.create({
          header: '¡Atención!',
          message: 'Debes iniciar sesión para poder guardar chollos en tus favoritos.',
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Iniciar Sesión',
              handler: () => {
                this.router.navigate(['/tabs/tab5']);
              }
            }
          ]
        });
        await alert.present();
      });
      return;
    }

    const id = chollo.id;
    const isFav = this.isFavorito(id);

    try {
      if (isFav) {
        await this.supabaseService.eliminarCholloFavorito(id);
        this.favoritosIds.delete(id);
      } else {
        await this.supabaseService.guardarCholloFavorito(id);
        this.favoritosIds.add(id);
      }

      this.favoritosEvent.notificarCambio();
    } catch (error) {
      console.error('Error al gestionar favorito:', error);
    }
  }

  isFavorito(cholloId: string): boolean {
    return this.favoritosIds.has(cholloId);
  }

  esReciente(fecha: string): boolean {
    if (!fecha) return false;
    const horas = (new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60);
    return horas < 24;
  }

  calcDescuento(c: any): number {
    const actual = Number(c?.precio_actual || 0);
    const original = Number(c?.precio_original || 0);
    if (!actual || !original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }

  irAProducto(chollo: any) {
    const id = chollo?.id;
    if (!id) return;

    this.router.navigate(['/tabs', 'producto', id]);
  }

  async anadirAlCarrito(item: any) {
    try {
      await this.supabaseService.anadirAlCarrito(item.id, 1);

      import('@ionic/angular/standalone').then(async ({ ToastController }) => {
        const toastCtrl = new ToastController();
        const toast = await toastCtrl.create({
          message: 'Producto añadido al carrito',
          duration: 2000,
          position: 'bottom',
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
          position: 'bottom',
          cssClass: 'toast-carrito'
        });
        toast.present();
      });
    }
  }

  calcDescuentoPopular(p: any): number {
    const actual = Number(p?.precioActual || 0);
    const original = Number(p?.precioOriginal || 0);
    if (!actual || !original || original <= actual) return 0;
    return Math.round(((original - actual) / original) * 100);
  }
}
