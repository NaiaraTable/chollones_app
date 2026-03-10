import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importante para *ngFor y *ngIf
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';


// Iconos
import { addIcons } from 'ionicons';
import { checkmarkCircle } from 'ionicons/icons';

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from "@ionic/angular/standalone";

// Tu servicio (Asegúrate de que la ruta sea la correcta según tus carpetas)
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-mis-categorias',
  templateUrl: './mis-categorias.component.html',
  styleUrls: ['./mis-categorias.component.scss'],
  standalone: true, // Aseguramos que sea standalone
  imports: [
    CommonModule, // ¡Añadido!
    IonButton,
    IonContent,
    IonTitle,
    IonBackButton,
    IonButtons,
    IonToolbar,
    IonHeader,
    IonCard,
    IonIcon
  ]
})
export class MisCategoriasComponent implements OnInit {

  categorias: any[] = [];
  favoritasSeleccionadas: any[] = []; // Array que guarda las categorías marcadas
  loading = true;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    // Registramos el icono del check para que funcione en este componente Standalone
    addIcons({ checkmarkCircle });
  }

  async ngOnInit() {
    await this.cargarCategorias();
  }

  async cargarCategorias() {
    this.loading = true;

    try {
      const hidden = ['', '', '']; // slug de categorías a ocultar

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

      // 1. Obtenemos chollos y extraemos categorías únicas
      const chollos = await this.apiService.getChollos();
      const catsMap = new Map<string, any>();

      chollos.forEach((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : (c.categorias ? [c.categorias] : []);
        cats.forEach((cat: any) => {
          if (cat && cat.slug && !catsMap.has(cat.slug) && !hidden.includes(cat.slug)) {
            catsMap.set(cat.slug, {
              id: cat.id,
              nombre: cat.nombre,
              slug: cat.slug,
              seleccionada: false, // Inicializamos en falso
              // Usa icono del backend, o el de nuestro mapa, o genera uno
              img: cat.icono || iconosPorNombre[cat.nombre] || `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.nombre)}&background=random&color=fff&size=128`
            });
          }
        });
      });

      // Convertimos map a array y ordenamos por nombre
      this.categorias = Array.from(catsMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );

      // 2. Traer las preferencias del usuario actual de la BD
      const misFavoritosIds = await this.apiService.getCategoriasFavoritasIds();

      // 3. Vincular las preferencias recuperadas con la lista visual
      this.favoritasSeleccionadas = [];
      this.categorias.forEach(cat => {
        // Comprobamos si el ID de la categoría está entre las que trajo la BD
        if (misFavoritosIds.includes(cat.id.toString())) {
          cat.seleccionada = true;
          this.favoritasSeleccionadas.push(cat);
        }
      });

    } catch (e) {
      console.error('Error cargando datos', e);
    } finally {
      this.loading = false;
    }
  }

  // Se activa al hacer click en el .html
  toggleCategoria(categoria: any) {
    if (categoria.seleccionada) {
      // Si ya estaba seleccionada, la quitamos
      categoria.seleccionada = false;
      this.favoritasSeleccionadas = this.favoritasSeleccionadas.filter(c => c.id !== categoria.id);
    } else {
      // Si no estaba seleccionada, verificamos límite
      if (this.favoritasSeleccionadas.length < 3) {
        categoria.seleccionada = true;
        this.favoritasSeleccionadas.push(categoria);
      } else {
        this.mostrarToast('Solo puedes elegir hasta 3 categorías', 'warning');
      }
    }
  }

  // Al pulsar el botón del .html
  async guardarCategorias() {
    // Extraemos solo los IDs de las seleccionadas
    const ids = this.favoritasSeleccionadas.map(c => c.id);

    try {
      this.loading = true;
      await this.apiService.guardarCategoriasFavoritas(ids);
      this.mostrarToast('Tus categorías se han guardado con éxito', 'success');
      this.router.navigate(['/tabs/perfil']);

    } catch (error) {
      this.mostrarToast('Hubo un error al guardar. Inténtalo de nuevo.', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

}
