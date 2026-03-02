import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

interface AppUser {
  id: string;
  email: string;
  display_name: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any; // Permite campos adicionales como phone, address, birth_date
  };
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private token: string | null = null;

  // Misma interfaz que SupabaseService
  private currentUser = new BehaviorSubject<AppUser | null>(null);
  currentUser$ = this.currentUser.asObservable();

  // Propiedad "client" simulada para compatibilidad con código existente
  // que use supabaseService.client.auth.getUser()
  public client = {
    auth: {
      getUser: async () => {
        const user = this.userValue;
        return { data: { user } };
      }
    },
    from: (table: string) => {
      console.warn(`client.from('${table}') llamado directamente — usa los métodos del ApiService`);
      return null;
    }
  };

  constructor() {
    // Recuperar token si existe
    this.token = localStorage.getItem('chollones_token');
    if (this.token) {
      this.loadUser();
    }
  }

  get userValue(): AppUser | null {
    return this.currentUser.value;
  }

  // --- HELPERS HTTP ---

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: any = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.apiUrl}/${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en la petición');
    }

    return data;
  }

  private async loadUser(): Promise<void> {
    try {
      const user = await this.request('auth.php?action=me');
      this.currentUser.next(user);
    } catch {
      this.token = null;
      localStorage.removeItem('chollones_token');
      this.currentUser.next(null);
    }
  }

  // --- MÉTODOS DE AUTENTICACIÓN ---

  async login(email: string, pass: string) {
    try {
      const result = await this.request('auth.php?action=login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });

      this.token = result.token;
      localStorage.setItem('chollones_token', result.token);
      this.currentUser.next(result.user);

      // Devolver en el mismo formato que Supabase
      return { data: { user: result.user, session: { access_token: result.token } }, error: null };
    } catch (error: any) {
      return { data: { user: null, session: null }, error: { message: error.message } };
    }
  }

  async registro(email: string, pass: string, nombre: string) {
    try {
      const result = await this.request('auth.php?action=register', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass, nombre }),
      });

      this.token = result.token;
      localStorage.setItem('chollones_token', result.token);
      this.currentUser.next(result.user);

      return { data: { user: result.user }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error: { message: error.message } };
    }
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('chollones_token');
    this.currentUser.next(null);
  }

  // --- MÉTODOS DE DATOS ---

  async getChollos(): Promise<any[]> {
    try {
      return await this.request('chollos.php');
    } catch (err) {
      console.error('Error en getChollos:', err);
      return [];
    }
  }

  async getCholloById(id: string): Promise<any | null> {
    try {
      return await this.request(`chollos.php?id=${id}`);
    } catch (err) {
      console.error('Error en getCholloById:', err);
      return null;
    }
  }

  async getChollosSimilares(params: {
    categoriaId?: string | null;
    proveedorId?: string | null;
    excludeId: string;
    limit?: number;
  }): Promise<any[]> {
    const { categoriaId = null, proveedorId = null, excludeId, limit = 10 } = params;

    let url = `chollos.php?similares=1&exclude=${excludeId}&limit=${limit}`;
    if (categoriaId) url += `&categoria_id=${categoriaId}`;
    else if (proveedorId) url += `&proveedor_id=${proveedorId}`;
    else return [];

    try {
      return await this.request(url);
    } catch (err) {
      console.error('Error en getChollosSimilares:', err);
      return [];
    }
  }

  // --- FAVORITOS ---

  async getChollosGuardados() {
    try {
      return await this.request('favoritos.php?action=list');
    } catch (error) {
      return [];
    }
  }

  async getFavoritosIds() {
    try {
      return await this.request('favoritos.php?action=ids');
    } catch (error) {
      return [];
    }
  }

  async guardarCholloFavorito(cholloId: string) {
    const user = this.userValue;
    if (!user) throw new Error('Debes estar logueado');
    await this.request(`favoritos.php?action=add&chollo_id=${cholloId}`, { method: 'POST' });
  }

  async eliminarCholloFavorito(cholloId: string) {
    const user = this.userValue;
    if (!user) return;
    await this.request(`favoritos.php?action=remove&chollo_id=${cholloId}`, { method: 'POST' });
  }

  // --- CUPONES ---

  async getCupones() {
    try {
      return await this.request('cupones.php');
    } catch (e) {
      return [];
    }
  }

  // --- CARRITO ---

  async getCarrito() {
    try {
      return await this.request('carrito.php');
    } catch (error) {
      console.error('Error al cargar carrito:', error);
      return [];
    }
  }

  async anadirAlCarrito(cholloId: string, cantidad: number = 1) {
    const user = this.userValue;
    if (!user) throw new Error('Debes estar logueado para añadir al carrito');

    await this.request('carrito.php?action=add', {
      method: 'POST',
      body: JSON.stringify({ chollo_id: cholloId, cantidad }),
    });
  }

  async actualizarCantidadCarrito(carroId: string, cantidad: number) {
    const user = this.userValue;
    if (!user) throw new Error('Debes estar logueado');

    await this.request('carrito.php?action=update', {
      method: 'POST',
      body: JSON.stringify({ carro_id: carroId, cantidad }),
    });
  }

  async eliminarDelCarrito(carroId: string) {
    const user = this.userValue;
    if (!user) throw new Error('Debes estar logueado');

    await this.request('carrito.php?action=remove', {
      method: 'POST',
      body: JSON.stringify({ carro_id: carroId }),
    });
  }

  // --- PERFIL Y AVATAR ---

  async updateProfile(data: any) {
    try {
      const user = await this.request('perfil.php?action=update', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.currentUser.next(user);
      return user;
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      return null;
    }
  }

  async updatePassword(newPassword: string) {
    await this.request('perfil.php?action=password', {
      method: 'POST',
      body: JSON.stringify({ password: newPassword }),
    });
  }

  async uploadAvatar(file: File): Promise<string> {
    const user = this.userValue;
    if (!user) throw new Error('Debes estar logueado');

    const formData = new FormData();
    formData.append('avatar', file);

    const headers: any = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.apiUrl}/perfil.php?action=avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al subir avatar');
    }

    // Actualizar el usuario local con la nueva URL del avatar
    const avatarUrl = data.avatar_url;
    await this.updateProfile({ avatar_url: avatarUrl });
    return avatarUrl;
  }
}
