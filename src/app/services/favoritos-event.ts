import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FavoritosEvent {
  // Subject para notificar cambios en favoritos
    private favoritosChanged = new Subject<void>();

    // Observable que otros componentes pueden suscribirse
    favoritosChanged$ = this.favoritosChanged.asObservable();

    // Método para notificar que los favoritos cambiaron
    notificarCambio() {
        this.favoritosChanged.next();
    }
}
