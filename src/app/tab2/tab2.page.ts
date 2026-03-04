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
    'Branding': 'https://cdn-icons-png.flaticon.com/512/3135/3135675.png',
    'Complementos': 'https://cdn-icons-png.flaticon.com/512/3523/3523068.png',
    'Consultoría Online': 'https://cdn-icons-png.flaticon.com/512/3081/3081965.png',
    'Cosmética Facial y Corporal': 'https://cdn-icons-png.flaticon.com/512/1140/1140579.png',
    'Cosmética Natural': 'https://cdn-icons-png.flaticon.com/512/2907/2907190.png',
    'Depilacion Láser Médica': 'https://cdn-icons-png.flaticon.com/512/3523/3523065.png',
    'Diagnóstico Estético': 'https://cdn-icons-png.flaticon.com/512/3523/3523047.png',
    'Digitalización': 'https://cdn-icons-png.flaticon.com/512/3064/3064183.png',
    'Electrónica': 'https://cdn-icons-png.flaticon.com/512/1041/1041824.png',
    'Experiencia de Compra': 'https://cdn-icons-png.flaticon.com/512/2921/2921822.png',
    'General': 'https://cdn-icons-png.flaticon.com/512/565/565547.png',
    'Hipotecas y Seguros': 'https://cdn-icons-png.flaticon.com/512/3135/3135696.png',
    'Kimonos': 'https://cdn-icons-png.flaticon.com/512/892/892446.png',
    'Manu Hipotecas': 'https://cdn-icons-png.flaticon.com/512/3135/3135696.png',
    'Medicina Estética': 'https://cdn-icons-png.flaticon.com/512/3523/3523052.png',
    'Micropigmentación Estética': 'https://cdn-icons-png.flaticon.com/512/3523/3523054.png',
    'Moda Baño': 'https://cdn-icons-png.flaticon.com/512/892/892459.png',
    'Moda Deportiva': 'https://cdn-icons-png.flaticon.com/512/892/892460.png',
    'Nutrición y Bienestar': 'https://cdn-icons-png.flaticon.com/512/1046/1046783.png',
    'Nutricosmética': 'https://cdn-icons-png.flaticon.com/512/1140/1140583.png',
    'Páginas web': 'https://cdn-icons-png.flaticon.com/512/1055/1055684.png',
    'Redes sociales': 'https://cdn-icons-png.flaticon.com/512/1055/1055681.png',
    'Revisión y Mejora de Hipotecas': 'https://cdn-icons-png.flaticon.com/512/3135/3135696.png',
    'Ropa': 'https://cdn-icons-png.flaticon.com/512/892/892461.png',
    'Ropa Deportiva Mujer': 'https://cdn-icons-png.flaticon.com/512/892/892462.png',
    'SEO': 'https://cdn-icons-png.flaticon.com/512/1055/1055675.png',
    'Servicios': 'https://cdn-icons-png.flaticon.com/512/3135/3135672.png',
    'Servicios Estéticos': 'https://cdn-icons-png.flaticon.com/512/1140/1140581.png',
    'Servicios Financieros': 'https://cdn-icons-png.flaticon.com/512/3135/3135700.png',
    'Tatuajes': 'https://cdn-icons-png.flaticon.com/512/3017/3017955.png',
    'Training': 'https://cdn-icons-png.flaticon.com/512/3064/3064195.png'
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
