import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonGrid, IonRow, IonCol, IonCard, IonText
} from '@ionic/angular/standalone';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonCard, IonText
  ],
})
export class Tab2Page implements OnInit {
  categorias: any[] = [];
  loading = true;

  constructor(
    private supabase: ApiService,
    private router: Router
  ) { }

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
    'Moda' : 'assets/img-categorias/moda.png',
    'Mascotas': 'assets/img-categorias/mascotas.png',
    'Cocina' : 'assets/img-categorias/cocina.png',
    'Marketing' : 'assets/img-categorias/marketing.png',
    'Juguetes' : 'assets/img-categorias/juguetes.png' 
  };

    // Obtenemos chollos y extraemos categorías únicas
    const chollos = await this.supabase.getChollos();

    const catsMap = new Map<string, any>();
    chollos.forEach((c: any) => {
      const cats = Array.isArray(c.categorias) ? c.categorias : (c.categorias ? [c.categorias] : []);
      cats.forEach((cat: any) => {
        if (cat && cat.slug && !catsMap.has(cat.slug) && !hidden.includes(cat.slug)) {
          catsMap.set(cat.slug, {
            id: cat.id,
            nombre: cat.nombre,
            slug: cat.slug,
           //Usa icono del backend como no tiene usa el de nuestro mapa y si tampoco encuntra genera uno
            img: cat.icono || iconosPorNombre[cat.nombre] || `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.nombre)}&background=random&color=fff&size=128`
          });
        }
      });
    });

    // Convertimos map a array y ordenamos por nombre
    this.categorias = Array.from(catsMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );

  } finally {
    this.loading = false;
  }
}

  irACategoria(slug: string) {
    console.log('Navegando a la categoría:', slug);
    this.router.navigate(['/tabs/categoria', slug]);
  }

}
