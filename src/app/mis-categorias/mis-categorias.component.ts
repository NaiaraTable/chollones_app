
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';


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


import { ApiService } from '../services/api.service';


@Component({
  selector: 'app-mis-categorias',
  templateUrl: './mis-categorias.component.html',
  styleUrls: ['./mis-categorias.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
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

  categorias: any[] = []; // todas las categorias
  favoritasSeleccionadas: any[] = []; // guardara las categorías que el usuario marque
  loading = true; // para saber si estamos cargando datos

  // el constructor que es lo primero que se ejecuta
  constructor(
    private apiService: ApiService,     //  para tratar con la base de datos
    private router: Router,             // para cambiar de página
    private toastCtrl: ToastController  //  para mostrar mensajes
  ) {
    addIcons({ checkmarkCircle });
  }

  // se ejecuta justo cuando la pantalla está a punto de mostrarse
  async ngOnInit() {
    await this.cargarCategorias();
  }

  // cargamos los datos
  async cargarCategorias() {
    this.loading = true;

    try {
      const hidden = ['', '', ''];

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

      const chollos = await this.apiService.getChollos();

      // usamos map para guardar las categorías sin que se repitan
      const catsMap = new Map<string, any>();

      // recorremos todos los chollos uno por uno
      chollos.forEach((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : (c.categorias ? [c.categorias] : []);

        cats.forEach((cat: any) => {

          if (cat && cat.slug && !catsMap.has(cat.slug) && !hidden.includes(cat.slug)) {

            catsMap.set(cat.slug, {
              id: cat.id,
              nombre: cat.nombre,
              slug: cat.slug,

              img: cat.icono || iconosPorNombre[cat.nombre] || `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.nombre)}&background=random&color=fff&size=128`
            });
          }
        });
      });

      this.categorias = Array.from(catsMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );

      const misFavoritosIds = await this.apiService.getCategoriasFavoritasIds();

      this.favoritasSeleccionadas = [];
      this.categorias.forEach(cat => {
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

  // funcion para marcar o desmarcar una categoria al hacer click
  toggleCategoria(categoria: any) {
    if (categoria.seleccionada) {
      categoria.seleccionada = false; // Le quitamos la marca

      this.favoritasSeleccionadas = this.favoritasSeleccionadas.filter(c => c.id !== categoria.id);
    } else {
      // comprobamos que se hayan elegido maximo 5 categorias
      if (this.favoritasSeleccionadas.length < 5) {
        categoria.seleccionada = true; // La marcamos
        this.favoritasSeleccionadas.push(categoria);
      } else {
        this.mostrarToast('Solo puedes elegir hasta 5 categorías', 'warning');
      }
    }
  }

  // guardamos en base de datos
  async guardarCategorias() {
    // sacamos los ids de las categorias
    const ids = this.favoritasSeleccionadas.map(c => c.id);

    try {
      this.loading = true;
      //mandamos el id al servidor
      await this.apiService.guardarCategoriasFavoritas(ids);

      this.mostrarToast('Tus categorías se han guardado con éxito', 'success');

      this.router.navigate(['/tabs/perfil']);

    } catch (error) {
      //capturamos el erroor y mostramos mensaje de error
      this.mostrarToast('Hubo un error al guardar. Inténtalo de nuevo.', 'danger');
    } finally {
      this.loading = false;
    }
  }

  // muestra los toast
  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje, // El texto que se va a leer
      duration: 2500, // Cuánto tiempo dura en pantalla (2.5 segundos)
      color: color, // El color (success = verde, warning = amarillo, danger = rojo)
      position: 'bottom' // Sale por la parte de abajo de la pantalla
    });
    await toast.present(); // Ordena que se muestre en pantalla
  }

}
