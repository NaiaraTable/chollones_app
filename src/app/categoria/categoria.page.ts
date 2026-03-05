import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';
import {
  IonContent, NavController, IonButton, IonIcon, IonSpinner
} from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-categoria',
  templateUrl: './categoria.page.html',
  styleUrls: ['./categoria.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonButton, IonIcon, IonSpinner
  ],
})
export class CategoriaPage implements OnInit {
  slug = '';
  productos: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: ApiService,
    private navCtrl: NavController
  ) { addIcons({ arrowBack }); }

  async ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    await this.cargarProductos();
  }

  get tituloCategoria() {
    if (!this.slug) return 'Categoría';
    const nombreLimpio = this.slug.replace(/-/g, ' '); //Reemplazamos todos los guiones por espacios
    return nombreLimpio.charAt(0).toUpperCase() + nombreLimpio.slice(1); //Ponemos la primera letra en mayúscula
  }

  async cargarProductos() {
    this.loading = true;

    try {
      // Obtener todos los chollos y filtrar por categoría
      const todosLosChollos = await this.supabase.getChollos();

      this.productos = todosLosChollos.filter((c: any) => {
        const cats = Array.isArray(c.categorias) ? c.categorias : (c.categorias ? [c.categorias] : []);
        return cats.some((cat: any) => cat.slug === this.slug);
      });

      console.log('✅ Chollos filtrados por categoría:', this.productos.length);

    } catch (error) {
      console.error('🔥 Error crítico:', error);
      this.productos = [];
    } finally {
      this.loading = false;
    }
  }

  irADetalle(id: string) {
    console.log('Navegando al detalle desde categoría:', id);
    this.router.navigate(['/tabs/producto', id]);
  }

  volverAtras() {
    this.navCtrl.back();
  }
}
