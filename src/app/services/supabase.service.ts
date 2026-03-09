import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  public supabase: SupabaseClient;

  // Fuente de verdad del estado del usuario
  private currentUser = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUser.asObservable();

  constructor(private apiService: ApiService) {
    // CLIENTE MINIMALISTA: Desactivamos persistencia y locks para evitar conflictos en el navegador
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: false, // Evita conflictos con LocalStorage/Preferences
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Cambio en Auth Supabase:', event);
      this.currentUser.next(session?.user ?? null);
    });
  }

  public get client(): SupabaseClient {
    return this.supabase;
  }

  get userValue() {
    return this.apiService.userValue ?? this.currentUser.value;
  }

  // --- MÉTODOS DE AUTENTICACIÓN ---

  async login(email: string, pass: string) {
    const result = await this.apiService.login(email, pass);
    if (result.data?.user) {
      this.currentUser.next(result.data.user);
    }
    return result;
  }

  async registro(email: string, pass: string, nombre: string) {
    const result = await this.apiService.registro(email, pass, nombre);
    if (result.data?.user) {
      this.currentUser.next(result.data.user);
    }
    return result;
  }

  async logout() {
    try {
      await this.apiService.logout();
      this.currentUser.next(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // --- MÉTODOS DE DATOS (BLINDADOS CONTRA CRASHES) ---

  async getChollos(): Promise<any[]> {
    try {
      return await this.apiService.getChollos();
    } catch (err) {
      console.error("Error al obtener chollos:", err);
      return [];
    }
  }

  async getChollosGuardados() {
    try {
      return await this.apiService.getChollosGuardados();
    } catch (error) {
      console.error('Error al cargar guardados:', error);
      return [];
    }
  }

  async getFavoritosIds() {
    try {
      const response = await this.apiService.getFavoritosIds();
      return Array.isArray(response) ? response : response.ids || [];
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      return [];
    }
  }

  async guardarCholloFavorito(cholloId: string) {
    try {
      await this.apiService.guardarCholloFavorito(cholloId);
    } catch (e) {
      console.error("Error al guardar favorito:", e);
      throw e;
    }
  }

  async eliminarCholloFavorito(cholloId: string) {
    try {
      await this.apiService.eliminarCholloFavorito(cholloId);
    } catch (e) {
      console.error("❌ Error al eliminar favorito:", e);
      throw e;
    }
  }

  async getCupones() {
    try {
      return await this.apiService.getCupones();
    } catch (e) {
      console.error('Error al cargar cupones:', e);
      return [];
    }
  }

  // --- CARRITO DE COMPRAS ---

  async getCarrito() {
    try {
      return await this.apiService.request('carrito.php');
    } catch (error) {
      console.error('Error al cargar carrito:', error);
      return [];
    }
  }

  async anadirAlCarrito(cholloId: string, cantidad: number = 1) {
    const user = this.apiService.userValue;
    if (!user) throw new Error('Debes estar logueado para añadir al carrito');

    try {
      await this.apiService.request('carrito.php?action=add', {
        method: 'POST',
        body: JSON.stringify({ chollo_id: cholloId, cantidad }),
      });
    } catch (e) {
      console.error("Error al añadir al carrito", e);
      throw e;
    }
  }

  async actualizarCantidadCarrito(carroId: string, cantidad: number) {
    const user = this.apiService.userValue;
    if (!user) throw new Error('Debes estar logueado');

    try {
      if (cantidad <= 0) {
        await this.eliminarDelCarrito(carroId);
      } else {
        await this.apiService.request('carrito.php?action=update', {
          method: 'POST',
          body: JSON.stringify({ id: carroId, cantidad }),
        });
      }
    } catch (e) {
      console.error("Error al actualizar cantidad", e);
      throw e;
    }
  }

  async eliminarDelCarrito(carroId: string) {
    const user = this.apiService.userValue;
    if (!user) throw new Error('Debes estar logueado');

    try {
      await this.apiService.request('carrito.php?action=remove', {
        method: 'POST',
        body: JSON.stringify({ id: carroId }),
      });
    } catch (e) {
      console.error("Error al eliminar del carrito", e);
      throw e;
    }
  }

  // --- PERFIL Y AVATAR ---

  async updateProfile(data: any) {
    try {
      await this.apiService.request('perfil.php?action=update', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return { data: {}, error: null };
    } catch (e) {
      console.error('Error al actualizar perfil:', e);
      return { data: null, error: e };
    }
  }

  async updatePassword(newPassword: string) {
    try {
      await this.apiService.request('perfil.php?action=password', {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      return { data: {}, error: null };
    } catch (e) {
      console.error('Error al cambiar contraseña:', e);
      return { data: null, error: e };
    }
  }

  async uploadAvatar(file: File): Promise<string> {
    const user = this.apiService.userValue;
    if (!user) throw new Error('Debes estar logueado');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await this.apiService.request('perfil.php?action=avatar', {
        method: 'POST',
        body: formData,
      });

      return response.avatar_url || '';
    } catch (err) {
      console.error('Error al subir avatar:', err);
      throw err;
    }
  }

  // --- DETALLE DE CHOLLO (PÁGINA PRODUCTO) ---

  async getCholloById(id: string): Promise<any | null> {
    try {
      return await this.apiService.getCholloById(id);
    } catch (err) {
      console.error('Error al obtener chollo:', err);
      return null;
    }
  }

  async getChollosSimilares(params: {
    categoriaId?: string | null;
    proveedorId?: string | null;
    excludeId: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      return await this.apiService.getChollosSimilares(params);
    } catch (err) {
      console.error('Error al obtener chollos similares:', err);
      return [];
    }
  }
}