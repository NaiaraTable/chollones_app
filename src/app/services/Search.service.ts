import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private busqueda$ = new BehaviorSubject<string>('');

  setBusqueda(texto: string) {
    this.busqueda$.next(texto);
  }

  getBusqueda$() {
    return this.busqueda$.asObservable();
  }

  get valorActual(): string {
    return this.busqueda$.getValue();
  }
}
