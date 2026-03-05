import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadComponent: () =>
          import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'tab3',
        loadComponent: () =>
          import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: 'tab4',
        loadComponent: () =>
          import('../tab4/tab4.page').then((m) => m.Tab4Page),
      },
      {
        path: 'tab5',
        loadComponent: () =>
          import('../tab5/tab5.page').then((m) => m.Tab5Page),
      },

      // MAPA
      {
        path: 'mapa',
        loadComponent: () =>
          import('./mapa/mapa.page').then((m) => m.MapaPage),
      },

      // CATEGORIA
      {
        path: 'categoria/:slug',
        loadComponent: () =>
          import('../categoria/categoria.page').then((m) => m.CategoriaPage),
      },

      // ✅ PRODUCTO (DETALLE)
      {
        path: 'productos',
        loadComponent: () =>
          import('../productos/productos.page').then(m => m.ProductosPage),
      },
      // ✅ CARRITO
      {
        path: 'carrito',
        loadComponent: () =>
          import('../carrito/carrito.page').then((m) => m.CarritoPage),
      },

      // DEFAULT TAB
      {
        path: '',
        redirectTo: 'tab1',
        pathMatch: 'full',
      },
    ],
  },
];