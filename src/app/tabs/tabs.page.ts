import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameBaseComponent } from '../components/game-base/game-base.component';

import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonIcon,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonSearchbar,
  IonButton,
  IonModal,
  IonTitle,
  IonContent,
  IonFab,
  IonFabButton
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  heartOutline,
  personOutline,
  bagOutline,
  flameOutline,
  gridOutline,
  notificationsOutline,
  locationOutline,
  close
} from 'ionicons/icons';

import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonIcon,
    IonSearchbar,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonLabel,
    IonButton,
    IonModal,
    IonTitle,
    IonContent,
    IonFab,
    IonFabButton,
    GameBaseComponent
  ]
})
export class TabsPage {
  private cdr = inject(ChangeDetectorRef);

  modalJuegosAbierto = false;
  constructor(public router: Router) {
    addIcons({
      heartOutline,
      personOutline,
      bagOutline,
      flameOutline,
      gridOutline,
      notificationsOutline,
      locationOutline,
      close
    });
  }

  navegar(ruta: string) {
    this.router.navigate([ruta]);
  }

  abrirJuegos() {
    console.log('🐒 Clic en el mono detectado: abriendo modal');
    this.modalJuegosAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarJuegos() {
    console.log('Cerrando modal de juegos');
    this.modalJuegosAbierto = false;
    this.cdr.detectChanges();
  }
}
