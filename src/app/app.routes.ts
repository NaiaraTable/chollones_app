import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    // canActivate: [authGuard],
    children: [
      { path: 'tab1', loadComponent: () => import('./tab1/tab1.page').then(m => m.Tab1Page) },
      { path: 'tab2', loadComponent: () => import('./tab2/tab2.page').then(m => m.Tab2Page) },
      { path: 'tab3', loadComponent: () => import('./tab3/tab3.page').then(m => m.Tab3Page) },
      { path: 'tab4', loadComponent: () => import('./tab4/tab4.page').then(m => m.Tab4Page) },
      { path: 'tab5', loadComponent: () => import('./tab5/tab5.page').then(m => m.Tab5Page) },

      // Auth pages moved here to keep tab bar visible
      { path: 'login', loadComponent: () => import('./login/login.page').then(m => m.LoginPage) },
      { path: 'registro', loadComponent: () => import('./registro/registro.page').then(m => m.RegistroPage) },
      { path: 'mapa', loadComponent: () => import('./tabs/mapa/mapa.page').then(m => m.MapaPage) },

      // CATEGORIA
      { path: 'categoria/:slug', loadComponent: () => import('./categoria/categoria.page').then(m => m.CategoriaPage) },

      // PRODUCTO (DETALLE)
      { path: 'producto/:id', loadComponent: () => import('./productos/productos.page').then(m => m.ProductosPage) },

      // Rutas restauradas
      { path: 'editar-perfil', loadComponent: () => import('./editar-perfil/editar-perfil.page').then(m => m.EditarPerfilPage) },
      { path: 'mis-alertas', loadComponent: () => import('./mis-alertas/mis-alertas.page').then(m => m.MisAlertasPage) },

      // CARRITO
      { path: 'carrito', loadComponent: () => import('./carrito/carrito.page').then(m => m.CarritoPage) },

      // default
      { path: '', redirectTo: 'tab1', pathMatch: 'full' },
    ],
  },

  { path: '', redirectTo: '/tabs/tab1', pathMatch: 'full' },
  { path: '**', redirectTo: '/tabs/tab1' },
];