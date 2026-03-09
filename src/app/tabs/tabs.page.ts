import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
  IonButton
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  heartOutline,
  personOutline,
  bagOutline,
  flameOutline,
  gridOutline,
  notificationsOutline,
  locationOutline
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
    IonButton
  ]
})
export class TabsPage {
  constructor(public router: Router) {
    addIcons({
      heartOutline,
      personOutline,
      bagOutline,
      flameOutline,
      gridOutline,
      notificationsOutline,
      locationOutline
    });
  }

  navegar(ruta: string) {
    this.router.navigate([ruta]);
  }
}
