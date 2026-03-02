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
              img: cat.icono || null,
            });
          }
        });
      });

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
